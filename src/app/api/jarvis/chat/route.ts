import Anthropic from "@anthropic-ai/sdk";

// JARVIS conversational layer.
//
// The dashboard's state is end-to-end encrypted, so this route is deliberately
// stateless: the browser sends its current state with each turn, Claude replies
// with tool calls, and the *browser* applies them and re-encrypts. Nothing here
// is persisted, and the Anthropic key never reaches the client.

const MODEL = "claude-opus-5";

const DAYS = "0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_event",
    description:
      "Add a recurring item to the daily schedule. Schedule items repeat weekly on the given days — they are not one-off dated appointments. For a dated appointment, use create_outlook_event instead.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short label, e.g. 'Deep work block'" },
        time: { type: "string", description: "24-hour start time as HH:MM" },
        days: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 6 },
          description: `Days of the week it repeats on (${DAYS})`,
        },
      },
      required: ["title", "time", "days"],
    },
  },
  {
    name: "update_event",
    description: "Change the title, time, or days of an existing schedule item.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The event id from the supplied state" },
        title: { type: "string" },
        time: { type: "string", description: "24-hour HH:MM" },
        days: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_event",
    description: "Delete a schedule item.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "add_med",
    description: "Add a medication or supplement to track, with one or more daily dose times.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        dose: { type: "string", description: "e.g. '2000 IU', '1000mg'" },
        times: {
          type: "array",
          items: { type: "string" },
          description: "Daily dose times as 24-hour HH:MM",
        },
        refill: { type: "string", description: "Optional refill date as YYYY-MM-DD" },
      },
      required: ["name", "times"],
    },
  },
  {
    name: "remove_med",
    description: "Stop tracking a medication.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "log_med",
    description: "Mark a specific dose taken or not taken for a given day.",
    input_schema: {
      type: "object",
      properties: {
        medId: { type: "string" },
        time: { type: "string", description: "The dose time as HH:MM" },
        taken: { type: "boolean" },
        date: { type: "string", description: "YYYY-MM-DD; defaults to today" },
      },
      required: ["medId", "time", "taken"],
    },
  },
  {
    name: "set_workout",
    description:
      "Set the planned training session for one day of the week. Use a name containing 'rest' for a rest day.",
    input_schema: {
      type: "object",
      properties: {
        dow: { type: "integer", minimum: 0, maximum: 6, description: DAYS },
        name: { type: "string", description: "e.g. 'Pull day', 'Zone 2 run', 'Rest / mobility'" },
        minutes: { type: "integer", description: "Planned duration in minutes" },
      },
      required: ["dow", "name", "minutes"],
    },
  },
  {
    name: "mark_workout",
    description: "Record a training session as completed or not completed for a given date.",
    input_schema: {
      type: "object",
      properties: {
        done: { type: "boolean" },
        date: { type: "string", description: "YYYY-MM-DD; defaults to today" },
        minutes: { type: "integer", description: "Actual minutes trained; defaults to the plan" },
      },
      required: ["done"],
    },
  },
  {
    name: "add_countdown",
    description: "Add a countdown to a future date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "Target date as YYYY-MM-DD" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "remove_countdown",
    description: "Delete a countdown.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "set_profile",
    description:
      "Update the display name or the location that drives the weather feed. Supply lat and lon together with locName when changing location.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        locName: { type: "string", description: "Display label, e.g. 'LOS ANGELES'" },
        lat: { type: "number" },
        lon: { type: "number" },
        unit: { type: "string", enum: ["F", "C"] },
      },
    },
  },
  {
    name: "list_outlook_events",
    description:
      "Read dated appointments from the connected Outlook calendar for a time range. Use this for questions about actual meetings, not the recurring schedule.",
    input_schema: {
      type: "object",
      properties: {
        start: { type: "string", description: "Range start as an ISO 8601 timestamp" },
        end: { type: "string", description: "Range end as an ISO 8601 timestamp" },
      },
      required: ["start", "end"],
    },
  },
  {
    name: "create_outlook_event",
    description:
      "Create a dated appointment on the connected Outlook calendar. This writes to the real work calendar, so only do it when asked for an actual appointment.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        start: { type: "string", description: "Start as an ISO 8601 timestamp" },
        end: { type: "string", description: "End as an ISO 8601 timestamp" },
        location: { type: "string" },
        body: { type: "string", description: "Optional notes" },
      },
      required: ["subject", "start", "end"],
    },
  },
];

function systemPrompt(state: unknown, now: string, tz: string, outlookConnected: boolean) {
  return `You are JARVIS, the assistant built into Andrew's personal dashboard. You manage his recurring schedule, medications, training plan, and countdowns, and you can read and write his Outlook work calendar.

The current date and time on his device is ${now} (${tz}). Resolve relative dates and times against that, never against your own assumptions.

Two different things live side by side, and confusing them is the most common mistake:
- The **schedule** is a set of weekly recurring items with a time and a list of weekdays. It has no dates.
- **Outlook** holds dated appointments. ${outlookConnected ? "It is connected." : "It is NOT connected yet, so the Outlook tools will fail — say so rather than pretending otherwise."}

When he asks for something on a specific date, that is an Outlook event. When he describes a routine ("every weekday", "on Mondays"), that is a schedule item.

His current dashboard state is below. Use the ids from it when updating or deleting anything.

<state>
${JSON.stringify(state, null, 1)}
</state>

Make the change he asks for, then confirm it in one short sentence — this is spoken aloud, so keep it brief and natural, and don't read back ids or JSON. Voice: calm butler, lightly dry — never chipper, never verbose.

Before any destructive action (remove_event, remove_med, remove_countdown) or writing to the real Outlook calendar (create_outlook_event), confirm once in plain language and wait for a yes — unless he already said "delete", "remove", "book it", or similar. Soft edits (move a time, log a dose, mark a workout) can proceed immediately.

If a request is ambiguous in a way that changes what you'd do, ask instead of guessing. If he's only asking a question, answer it without calling any tools.`;
}

// The dashboard is public, so this endpoint is too. Without a gate anyone who
// found the URL could spend the account's Anthropic credits, so the caller must
// present a shared passphrase. Compared in constant time to avoid leaking it
// one character at a time.
function keyMatches(supplied: string | null, expected: string) {
  if (!supplied) return false;
  const a = new TextEncoder().encode(supplied);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const chatKey = process.env.JARVIS_CHAT_KEY;
  if (!apiKey || !chatKey) {
    return Response.json(
      { error: "Assistant is not configured on the server." },
      { status: 500 },
    );
  }
  if (!keyMatches(request.headers.get("x-jarvis-key"), chatKey)) {
    return Response.json({ error: "Assistant access key is wrong or missing." }, { status: 401 });
  }

  let body: {
    messages?: Anthropic.MessageParam[];
    state?: unknown;
    now?: string;
    tz?: string;
    outlookConnected?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { messages, state, now, tz, outlookConnected } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      system: systemPrompt(
        state ?? {},
        now ?? new Date().toISOString(),
        tz ?? "unknown timezone",
        Boolean(outlookConnected),
      ),
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "That request was declined." }, { status: 400 });
    }

    return Response.json({
      content: response.content,
      stop_reason: response.stop_reason,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited — try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Upstream error ${error.status}.` }, { status: 502 });
    }
    return Response.json({ error: "Assistant unavailable." }, { status: 500 });
  }
}
