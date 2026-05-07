import webpush from "web-push";

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type SendResult =
  | { ok: true; endpoint: string }
  | { ok: false; endpoint: string; statusCode?: number; gone: boolean };

export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<SendResult> {
  configure();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true, endpoint: sub.endpoint };
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    const status = e?.statusCode;
    // 404/410 = subscription expired or unsubscribed.
    return {
      ok: false,
      endpoint: sub.endpoint,
      statusCode: status,
      gone: status === 404 || status === 410,
    };
  }
}
