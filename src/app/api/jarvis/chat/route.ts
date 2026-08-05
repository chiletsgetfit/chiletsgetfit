import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

// JARVIS conversational layer — free-tier LLM (Groq preferred, Gemini fallback).
//
// The dashboard's state is end-to-end encrypted, so this route is deliberately
// stateless: the browser sends its current state with each turn, the model
// replies with tool calls, and the *browser* applies them and re-encrypts.
// Nothing here is persisted, and the provider key never reaches the client.
//
// The browser still speaks an Anthropic-shaped content-block protocol; this
// route translates to/from OpenAI tool-calling for Groq / Gemini.

const DAYS = "0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat";

type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

const TOOL_DEFS: ToolDef[] = [
  {
    name: "add_event",
    description:
      "Add a recurring item to the daily schedule. Schedule items repeat weekly on the given days — they are not one-off dated appointments. For a dated appointment, use create_google_event (preferred) or create_outlook_event.",
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
    name: "list_google_events",
    description:
      "Read dated appointments from the connected Google Calendar for a time range. Prefer this over Outlook when Google Calendar is connected.",
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
    name: "create_google_event",
    description:
      "Create a dated appointment on the connected Google Calendar. Prefer this over Outlook when Google Calendar is connected.",
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
  {
    name: "list_outlook_events",
    description:
      "Read dated appointments from the connected Outlook calendar. Only use if Google Calendar is not connected.",
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
      "Create a dated appointment on Outlook. Only use if Google Calendar is not connected.",
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
  {
    name: "list_gmail",
    description:
      "List recent Gmail messages (metadata + snippet). Use for inbox questions like 'any new mail?' or 'emails from X'.",
    input_schema: {
      type: "object",
      properties: {
        max: { type: "integer", description: "How many messages to return (default 8, max 20)" },
        query: {
          type: "string",
          description: "Gmail search query, e.g. 'in:inbox', 'from:boss@example.com newer_than:2d'",
        },
      },
    },
  },
  {
    name: "send_gmail",
    description:
      "Send an email from the connected Gmail account. Only do this when he clearly asks you to send a message.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain-text body" },
      },
      required: ["to", "subject"],
    },
  },
];

const OPENAI_TOOLS: ChatCompletionTool[] = TOOL_DEFS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

type ClientBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

type ClientMessage = {
  role: "user" | "assistant";
  content: string | ClientBlock[];
};

function systemPrompt(
  state: unknown,
  now: string,
  tz: string,
  outlookConnected: boolean,
  gmailConnected: boolean,
  googleCalendarConnected: boolean,
) {
  const cal = googleCalendarConnected
    ? "Google Calendar is connected — use list_google_events / create_google_event for dated appointments."
    : outlookConnected
      ? "Outlook is connected (Google Calendar is not) — use list_outlook_events / create_outlook_event."
      : "No dated calendar is connected yet — say so rather than pretending.";

  return `You are JARVIS, the assistant built into Andrew's personal dashboard. You manage his recurring schedule, medications, training plan, and countdowns; you can use Google Calendar (preferred) or Outlook for dated appointments; and you can read/send Gmail.

The current date and time on his device is ${now} (${tz}). Resolve relative dates and times against that, never against your own assumptions.

Keep these separate:
- The **schedule** is weekly recurring items with a time and weekdays — no dates.
- **Dated calendar**: ${cal}
- **Gmail** is email. ${gmailConnected ? "It is connected." : "It is NOT connected yet — say so rather than pretending."}

When he asks for something on a specific date, that is a calendar event (Google preferred). When he describes a routine ("every weekday", "on Mondays"), that is a schedule item. Inbox / email questions use Gmail tools.

His current dashboard state is below. Use the ids from it when updating or deleting anything.

<state>
${JSON.stringify(state, null, 1)}
</state>

Make the change he asks for, then confirm it in one short sentence — this is spoken aloud, so keep it brief and natural, and don't read back ids or JSON. Voice: calm butler, lightly dry — never chipper, never verbose.

Before any destructive action (remove_event, remove_med, remove_countdown), writing to a calendar (create_google_event / create_outlook_event), or sending email (send_gmail), confirm once in plain language and wait for a yes — unless he already said "delete", "remove", "book it", "send it", or similar. Soft edits (move a time, log a dose, mark a workout) can proceed immediately.

If a request is ambiguous in a way that changes what you'd do, ask instead of guessing. If he's only asking a question, answer it without calling any tools.`;
}

function keyMatches(supplied: string | null, expected: string) {
  if (!supplied) return false;
  const a = new TextEncoder().encode(supplied);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function resolveProvider(): { client: OpenAI; model: string; name: string } | null {
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    return {
      name: "groq",
      model: process.env.JARVIS_MODEL?.trim() || "llama-3.3-70b-versatile",
      client: new OpenAI({ apiKey: groq, baseURL: "https://api.groq.com/openai/v1" }),
    };
  }
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) {
    return {
      name: "gemini",
      model: process.env.JARVIS_MODEL?.trim() || "gemini-2.5-flash",
      client: new OpenAI({
        apiKey: gemini,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
    };
  }
  return null;
}

function toOpenAIMessages(messages: ClientMessage[]): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [];
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }
    if (!Array.isArray(msg.content)) continue;

    if (msg.role === "assistant") {
      const text = msg.content
        .filter((b): b is Extract<ClientBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      const toolUses = msg.content.filter(
        (b): b is Extract<ClientBlock, { type: "tool_use" }> => b.type === "tool_use",
      );
      if (toolUses.length) {
        out.push({
          role: "assistant",
          content: text || null,
          tool_calls: toolUses.map((t) => ({
            id: t.id,
            type: "function" as const,
            function: {
              name: t.name,
              arguments: JSON.stringify(t.input ?? {}),
            },
          })),
        });
      } else {
        out.push({ role: "assistant", content: text || "" });
      }
      continue;
    }

    // User turn that is really tool results (Anthropic-shaped).
    const results = msg.content.filter(
      (b): b is Extract<ClientBlock, { type: "tool_result" }> => b.type === "tool_result",
    );
    if (results.length) {
      for (const r of results) {
        out.push({
          role: "tool",
          tool_call_id: r.tool_use_id,
          content: r.is_error ? `Error: ${r.content}` : r.content,
        });
      }
      continue;
    }

    const text = msg.content
      .filter((b): b is Extract<ClientBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) out.push({ role: "user", content: text });
  }
  return out;
}

export async function POST(request: Request) {
  const chatKey = process.env.JARVIS_CHAT_KEY;
  const provider = resolveProvider();
  if (!provider || !chatKey) {
    return Response.json(
      { error: "Assistant is not configured on the server." },
      { status: 500 },
    );
  }
  if (!keyMatches(request.headers.get("x-jarvis-key"), chatKey)) {
    return Response.json({ error: "Assistant access key is wrong or missing." }, { status: 401 });
  }

  let body: {
    messages?: ClientMessage[];
    state?: unknown;
    now?: string;
    tz?: string;
    outlookConnected?: boolean;
    gmailConnected?: boolean;
    googleCalendarConnected?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { messages, state, now, tz, outlookConnected, gmailConnected, googleCalendarConnected } =
    body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required." }, { status: 400 });
  }

  try {
    const response = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.3,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: systemPrompt(
            state ?? {},
            now ?? new Date().toISOString(),
            tz ?? "unknown timezone",
            Boolean(outlookConnected),
            Boolean(gmailConnected),
            Boolean(googleCalendarConnected ?? gmailConnected),
          ),
        },
        ...toOpenAIMessages(messages),
      ],
      tools: OPENAI_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0]?.message;
    if (!choice) {
      return Response.json({ error: "Empty model response." }, { status: 502 });
    }

    const content: ClientBlock[] = [];
    if (choice.content) {
      content.push({ type: "text", text: choice.content });
    }
    for (const call of choice.tool_calls ?? []) {
      if (call.type !== "function") continue;
      let input: unknown = {};
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        input = {};
      }
      content.push({
        type: "tool_use",
        id: call.id,
        name: call.function.name,
        input,
      });
    }

    return Response.json({
      content,
      stop_reason: (choice.tool_calls?.length ?? 0) > 0 ? "tool_use" : "end_turn",
      provider: provider.name,
      model: provider.model,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
    if (status === 429) {
      return Response.json({ error: "Rate limited — try again shortly." }, { status: 429 });
    }
    if (status && status >= 400) {
      return Response.json({ error: `Upstream error ${status}.` }, { status: 502 });
    }
    return Response.json({ error: "Assistant unavailable." }, { status: 500 });
  }
}
