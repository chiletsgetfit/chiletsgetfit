/**
 * Browser → Google token exchange proxy.
 * Keeps the OAuth code exchange off the client so Web client secrets work
 * reliably and CORS / PKCE edge cases are easier to diagnose.
 */

export async function POST(request: Request) {
  let body: {
    client_id?: string;
    client_secret?: string;
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
    grant_type?: string;
    refresh_token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const clientId = (body.client_id || "").trim();
  const clientSecret = (body.client_secret || "").trim();
  const grantType = (body.grant_type || "authorization_code").trim();
  if (!clientId) {
    return Response.json({ error: "client_id is required." }, { status: 400 });
  }

  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("grant_type", grantType);
  if (clientSecret) form.set("client_secret", clientSecret);

  if (grantType === "refresh_token") {
    const refresh = (body.refresh_token || "").trim();
    if (!refresh) {
      return Response.json({ error: "refresh_token is required." }, { status: 400 });
    }
    form.set("refresh_token", refresh);
  } else {
    const code = (body.code || "").trim();
    const verifier = (body.code_verifier || "").trim();
    const redirectUri = (body.redirect_uri || "").trim();
    if (!code || !verifier || !redirectUri) {
      return Response.json(
        { error: "code, code_verifier, and redirect_uri are required." },
        { status: 400 },
      );
    }
    form.set("code", code);
    form.set("code_verifier", verifier);
    form.set("redirect_uri", redirectUri);
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const msg =
      (typeof j.error_description === "string" && j.error_description) ||
      (typeof j.error === "string" && j.error) ||
      `HTTP ${r.status}`;
    return Response.json({ error: msg, details: j }, { status: 400 });
  }
  return Response.json(j);
}
