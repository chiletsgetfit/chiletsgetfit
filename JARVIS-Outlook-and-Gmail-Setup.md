# JARVIS — connect Outlook calendar + Gmail (Chilets only)

No MidValley accounts, tenants, or projects. Use personal Microsoft + `chiletsgetfit@gmail.com`.

Redirect URI for both providers (copy exactly):

```
https://www.chiletsgetfit.com/jarvis
```

Also add `http://localhost:3100/jarvis` if you test locally.

---

## Part A — Outlook calendar (Azure, ~5 min)

1. Sign in to [portal.azure.com](https://portal.azure.com) with your **personal Microsoft** account (not MidValley).
2. **Microsoft Entra ID** → **App registrations** → **New registration**.
3. Name: `JARVIS Chilets`
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (multitenant + personal).
5. Redirect URI: platform **Single-page application (SPA)** → paste the redirect above.
6. Register. Copy **Application (client) ID**.
7. **API permissions** → **Microsoft Graph** → **Delegated** → add `Calendars.ReadWrite` (+ `offline_access` / `openid` / `profile` are usually included by the auth request).
8. In JARVIS: **CONFIG → OUTLOOK**
   - CLIENT ID = that Application ID  
   - TENANT = `common`  
   - SAVE → **CONNECT OUTLOOK** → sign in with the Microsoft account whose calendar you want.

---

## Part B — Gmail (Google Cloud, ~7 min)

1. Sign in to [console.cloud.google.com](https://console.cloud.google.com) with **chiletsgetfit@gmail.com**.
2. Create a project named something like `jarvis-chilets` (or use an existing Chilets-only project).
3. **APIs & Services → Library** → enable **Gmail API**.
4. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `JARVIS Chilets`
   - User support email / developer email: your Gmail
   - Scopes: add
     - `.../auth/gmail.readonly`
     - `.../auth/gmail.send`
   - Test users: add `chiletsgetfit@gmail.com`
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `JARVIS web`
   - Authorized JavaScript origins: `https://www.chiletsgetfit.com` (and `http://localhost:3100` if local)
   - Authorized redirect URIs: the redirect URI above
6. Copy **Client ID** and **Client secret**.
7. In JARVIS: **CONFIG → GMAIL**
   - Paste Client ID + Secret  
   - SAVE → **CONNECT GMAIL** → choose chiletsgetfit@gmail.com → Allow

---

## What you can say after connecting

- “What’s on my calendar tomorrow?”
- “Book a 3pm workout Thursday”
- “Any new mail?”
- “Emails from Amazon this week”
- “Send an email to alex@example.com saying I’ll be 10 minutes late” (JARVIS will confirm before sending)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Outlook CORS / token failed | Redirect was registered as **Web** instead of **SPA** |
| Outlook “need admin approval” | You’re on a work tenant — use personal Microsoft + TENANT `common` |
| Gmail redirect mismatch | URI must match exactly, including `https://www.` vs apex |
| Gmail “access blocked” / test user | Add your address under OAuth consent **Test users** |
| Gmail token exchange failed | Paste the **client secret** too, then CONNECT again |
