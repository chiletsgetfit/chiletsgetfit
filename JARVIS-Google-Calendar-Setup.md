# JARVIS — one Google connect (Calendar + Gmail)

Skip MidValley Outlook admin consent. Put work meetings into Google Calendar, then connect Google once.

Redirect URI (exact):

```
https://www.chiletsgetfit.com/jarvis
```

---

## 1) Google Cloud (~5 min) — chiletsgetfit@gmail.com

1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a Chilets project.
2. Enable APIs:
   - **Google Calendar API**
   - **Gmail API**
3. **OAuth consent screen** → External → app name `JARVIS Chilets`  
   Test user: `chiletsgetfit@gmail.com`  
   Scopes (or allow at consent time): Calendar events, Gmail readonly, Gmail send.
4. **Credentials → Create OAuth client ID → Web application**
   - Authorized JavaScript origins: `https://www.chiletsgetfit.com`
   - Authorized redirect URIs: `https://www.chiletsgetfit.com/jarvis`
5. Copy **Client ID** and **Client secret**.

## 2) Connect in JARVIS

1. Hard-refresh https://www.chiletsgetfit.com/jarvis
2. **CONFIG → GOOGLE**
3. Paste Client ID + Secret → **SAVE** → **CONNECT GOOGLE**
4. Sign in with chiletsgetfit@gmail.com → Allow

Today’s events show under **GOOGLE · TODAY**. Chat can book meetings and check mail.

If you connected Gmail earlier without Calendar, hit **DISCONNECT** then **CONNECT GOOGLE** again so the new Calendar permission is granted.

---

## 3) Add MidValley / work calendar into Google (so there’s only one)

Pick whichever works for your IT setup:

**A. Subscribe by URL (best if Outlook can publish)**  
1. In Outlook (web or desktop): calendar → share/publish → get an **ICS** link.  
2. In [Google Calendar](https://calendar.google.com) → **Settings** → **Add calendar** → **From URL** → paste ICS → Add.

**B. Import (one-time snapshot)**  
Outlook → export `.ics` → Google Calendar → **Settings** → **Import**.

**C. Keep creating new events only in Google**  
Use Google going forward; leave old MidValley events to fade out.

After A or B, Readdle (if you use it) can show the same Google calendar — one source of truth.
