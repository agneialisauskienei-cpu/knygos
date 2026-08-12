import { NextResponse } from "next/server";

type StoreProduct = {
  name?: string;
  permalink?: string;
  prices?: {
    price?: string;
    currency_minor_unit?: number;
  };
  stock_status?: string;
};

export const dynamic = "force-dynamic";

function productPrice(product: StoreProduct) {
  const raw = Number(product.prices?.price ?? 0);
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  return raw / 10 ** minorUnit;
}

export async function GET() {
  const url = "https://skaitytaknyga.lt/wp-json/wc/store/products?per_page=100&page=1";
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "KnyguApskaita/1.0",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Skaitytaknyga.lt katalogo pasiekti nepavyko" }, { status: 502 });
  }

  const total = Number(response.headers.get("x-wp-total") ?? 0);
  const products = (await response.json()) as StoreProduct[];

  return NextResponse.json({
    total,
    products: products.map((product) => ({
      title: product.name ?? "",
      price: productPrice(product),
      url: product.permalink ?? "",
      stockStatus: product.stock_status ?? "instock",
    })),
  });
}
