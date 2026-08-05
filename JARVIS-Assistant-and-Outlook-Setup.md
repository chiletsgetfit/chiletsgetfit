# JARVIS — conversational assistant + Outlook calendar

Two features were added to `/jarvis`:

- **Talk to it.** A chat dock (bottom-right ◈ button) with typed and spoken input. It
  can edit your schedule, medications, training plan, and countdowns by voice or text.
- **Outlook.** Reads your real Microsoft 365 appointments into the schedule panel and
  can book new ones.

Both need a bit of one-time setup that only you can do. Nothing works until step 1.

---

## How it fits together

Your dashboard state is end-to-end encrypted — the sync key is derived from your sync
code and never leaves the device, so the server genuinely cannot read your data. The
assistant is built to preserve that:

```
browser                          your server (Vercel)        Anthropic
  |                                    |                        |
  |-- message + current state -------->|                        |
  |                                    |-- prompt + tools ----->|
  |                                    |<-- tool calls ---------|
  |<-- tool calls ---------------------|                        |
  |                                                             |
  |-- applies them locally, re-encrypts, syncs                  |
```

The server is a stateless relay. It holds the Anthropic key, never stores anything, and
never sees your encrypted blob.

**One honest caveat:** to answer questions about your schedule, the browser has to send
your current state along with each message. It isn't persisted anywhere, but it does
leave the device at request time — unlike the sync blob, which never does. If you'd
rather it didn't, don't use the chat; everything else is unchanged.

---

## Step 1 — Environment variables (required)

Add both to **Vercel → chiletsgetfit → Settings → Environment Variables**, for
Production (and Preview if you use it), then redeploy.

| Name | Value |
|---|---|
| `GROQ_API_KEY` | Free key from [console.groq.com/keys](https://console.groq.com/keys) |
| `JARVIS_CHAT_KEY` | A passphrase you invent — see below |

Optional fallback if Groq is down or rate-limited: set `GEMINI_API_KEY` from
[Google AI Studio](https://aistudio.google.com/apikey) instead (or as well — Groq is
tried first). Optional override: `JARVIS_MODEL` (defaults to `llama-3.3-70b-versatile`
on Groq, or `gemini-2.5-flash` on Gemini).

`JARVIS_CHAT_KEY` matters. `/jarvis` is a public page, so `/api/jarvis/chat` is a
publicly reachable URL. Without a gate, anyone who found it could burn your free-tier
quota. The dashboard sends this passphrase with every request; the server rejects
anything else. Make it long and random — you only type it once per device.

The first time you use the chat on a device it will say it's locked and prompt for the
key. Paste it in; it's stored on that device only.

For local development the same vars are stubbed in `.env.local`.

---

## Step 2 — Outlook + Gmail

Use the Chilets-only guide (personal Microsoft + chiletsgetfit@gmail.com — no MidValley):

→ see **`JARVIS-Outlook-and-Gmail-Setup.md`**

Legacy Mid Valley tenant notes below are obsolete for this project; kept only for reference.

<details><summary>Old Mid Valley Azure steps (do not use for Chilets)</summary>

This is a one-time registration in the Mid Valley tenant. If your account can't create
app registrations, this is the point where you'd need IT to do it or grant consent.

1. Go to **portal.azure.com** → **Microsoft Entra ID** → **App registrations** →
   **New registration**.
2. Name it something like `JARVIS Dashboard`.
3. Supported account types: **Accounts in this organizational directory only**.
4. Redirect URI: choose **Single-page application (SPA)** — *not* Web — and enter:

   ```
   https://chiletsgetfit.com/jarvis
   ```

   The SPA type is what permits the browser-side token exchange. Picking Web will make
   sign-in fail with a CORS error. Add `http://localhost:3100/jarvis` as a second SPA
   redirect URI if you want to test locally.
5. Register, then from the **Overview** page copy the **Application (client) ID** and
   the **Directory (tenant) ID**.
6. Go to **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add **Calendars.ReadWrite**. If your tenant requires it,
   click **Grant admin consent** (or ask an admin to).

Then in the dashboard: **CONFIG → OUTLOOK**, paste the client ID and tenant ID, hit
**SAVE**, then **CONNECT OUTLOOK**. You'll sign in with Microsoft directly — no password
touches this page — and land back on the dashboard.

Tokens are stored on the device and refreshed automatically. **DISCONNECT** clears them.

</details>

---

## What you can say

The assistant distinguishes two things that are easy to confuse:

- **Schedule items** repeat weekly and have no date — "deep work at 9 on weekdays".
- **Outlook events** are dated appointments — "book a 3pm workout Thursday".

Ask for a specific date and it goes to Outlook; describe a routine and it becomes a
schedule item.

Examples that work:

- "Move deep work to 8am"
- "Add a 6:30am cold plunge on Mondays and Thursdays"
- "I took my vitamin D"
- "Mark today's training done, 55 minutes"
- "Change Wednesday to Zone 2 run, 40 minutes"
- "What's on my calendar tomorrow?"
- "Book a 3pm workout on Thursday"
- "Add a countdown for the marathon on March 14"

Tap 🎙 to speak instead of type. It replies out loud. Voice needs a tap each time —
an always-on wake word isn't possible in a web page.

---

## Cost

Each exchange sends your (small) state plus the conversation. The default path is
**Groq's free tier** (Llama 3.3 70B) — fast enough for voice, no credit card required.
Limits are per-day on Groq's side; if you hit them, wait or switch to a `GEMINI_API_KEY`.

Nothing free consistently beats Claude Opus on hard reasoning, but for short JARVIS
commands (move an event, log a dose, "what's tomorrow?") Groq is the right trade.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Assistant is not configured on the server" | `GROQ_API_KEY` (or `GEMINI_API_KEY`) or `JARVIS_CHAT_KEY` missing in Vercel; redeploy after adding. |
| Prompts for the access key repeatedly | The key doesn't match `JARVIS_CHAT_KEY`. Watch for a trailing space. |
| Outlook sign-in fails with a CORS error | The redirect URI is registered as **Web** instead of **Single-page application**. |
| Sign-in returns "need admin approval" | The tenant requires admin consent for Calendars.ReadWrite. |
| Outlook says not connected after working before | Refresh token expired (they're short-lived for SPAs). Reconnect from CONFIG. |
| Mic button greyed out | The browser has no Web Speech support. Typing still works. |
