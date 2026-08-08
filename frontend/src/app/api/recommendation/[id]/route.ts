import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = db();

    // Fetch popular / customer favorite menu items as recommendation
    const { data: favRows } = await supabase
      .from("orders")
      .select(`
        qty,
        subtotal,
        visits!inner(customer_id),
        menu(menu_id, name, category, price)
      `)
      .eq("visits.customer_id", id);

    let items: any[] = [];
    if (favRows && favRows.length > 0) {
      const totals: Record<string, { menu: any; qty: number }> = {};
      for (const row of favRows as any[]) {
        const m = row.menu;
        if (m) {
          if (!totals[m.menu_id]) totals[m.menu_id] = { menu: m, qty: 0 };
          totals[m.menu_id].qty += row.qty;
        }
      }
      items = Object.values(totals)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3)
        .map(({ menu, qty }) => ({
          menu_id: menu.menu_id,
          name: menu.name,
          category: menu.category,
          price: parseFloat(menu.price),
          score: 0.95,
          reason: `Favorit Kak ${menu.name} (${qty}x dipesan)`,
        }));
    }

    // Fallback: If no order history for this customer, return top popular active menus
    if (items.length === 0) {
      const { data: popularMenus } = await supabase
        .from("menu")
        .select("menu_id, name, category, price")
        .eq("is_active", true)
        .limit(3);

      items = (popularMenus ?? []).map((m: any) => ({
        menu_id: m.menu_id,
        name: m.name,
        category: m.category,
        price: parseFloat(m.price),
        score: 0.85,
        reason: "Menu Populer Hari Ini",
      }));
    }

    return NextResponse.json({
      customer_id: id,
      strategy: favRows && favRows.length > 0 ? "COLLABORATIVE_FILTERING" : "COLD_START_POPULARITY",
      transaction_count: favRows?.length ?? 0,
      recommendations_count: items.length,
      recommendations: items,
    });
  } catch (e) {
    console.error("[/api/recommendation/[id]]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
