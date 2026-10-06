import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveFood } from "@/lib/food/server";
import { UsdaError } from "@/lib/food/usda";

// GET /api/food/resolve?id=<foods.id>            → { food }
// GET /api/food/resolve?source=usda&sourceId=123 → { food }  (fetches + caches it on first pick)
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  try {
    const food = await resolveFood(supabase, {
      id: params.get("id"),
      source: params.get("source"),
      sourceId: params.get("sourceId"),
    });
    if (!food) return NextResponse.json({ error: "Food not found" }, { status: 404 });
    return NextResponse.json({ food });
  } catch (e) {
    if (e instanceof UsdaError) {
      return NextResponse.json({ error: e.message }, { status: e.status === 429 ? 429 : 502 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load food" },
      { status: 500 }
    );
  }
}
