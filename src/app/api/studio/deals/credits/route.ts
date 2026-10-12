import { NextResponse } from "next/server";
import { studioApiUser } from "@/lib/studio/access";
import { SerpApiError, credits } from "@/lib/studio/serpapi";

// GET /api/studio/deals/credits -> { left, perMonth, used, hourLeft } (doesn't use a search)
export async function GET(req: Request) {
  const auth = await studioApiUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json(await credits());
  } catch (e) {
    const status = e instanceof SerpApiError ? e.status : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read credits." }, { status });
  }
}
