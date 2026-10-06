import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/lib/food/server";

// GET /api/food/search?q=chicken  → { results: FoodSummary[], usdaError: string | null }
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [], usdaError: null });

  try {
    const data = await searchFoods(supabase, user.id, q.slice(0, 80));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 500 }
    );
  }
}
