import { NextResponse } from "next/server";
import { listAllVariantsForBulk } from "@/db/queries/admin";
import { getAdminSession } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await getAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const variants = await listAllVariantsForBulk();

  const rows = variants.map((v) => {
    const retailGhs = (v.priceMinor / 100).toFixed(2);
    const bronzeGhs = ((v.priceMinor * 0.9) / 100).toFixed(2); // 10% off
    const silverGhs = ((v.priceMinor * 0.85) / 100).toFixed(2); // 15% off
    const goldGhs = ((v.priceMinor * 0.8) / 100).toFixed(2); // 20% off
    const vipGhs = ((v.priceMinor * 0.75) / 100).toFixed(2); // 25% off

    return {
      product: v.productName,
      category: v.categoryName ?? "General",
      size: v.sizeLabel ?? "Standard",
      retailPriceGhs: retailGhs,
      bronzeTierGhs: bronzeGhs,
      silverTierGhs: silverGhs,
      goldTierGhs: goldGhs,
      vipTierGhs: vipGhs,
      stockQty: v.stockQty,
    };
  });

  const csv = toCsv(rows, [
    { key: "product", header: "Product Name" },
    { key: "category", header: "Category" },
    { key: "size", header: "Size" },
    { key: "retailPriceGhs", header: "Retail Price (GH₵)" },
    { key: "bronzeTierGhs", header: "Bronze Tier (GH₵)" },
    { key: "silverTierGhs", header: "Silver Tier (GH₵)" },
    { key: "goldTierGhs", header: "Gold Tier (GH₵)" },
    { key: "vipTierGhs", header: "VIP Tier (GH₵)" },
    { key: "stockQty", header: "Stock Qty" },
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="efe-organics-wholesale-pricelist-${Date.now()}.csv"`,
    },
  });
}
