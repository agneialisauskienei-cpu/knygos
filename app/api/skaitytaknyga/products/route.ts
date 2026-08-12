import { NextResponse } from "next/server";

type StoreProduct = {
  id?: number;
  name?: string;
  permalink?: string;
  images?: { src?: string }[];
  prices?: {
    price?: string;
    currency_minor_unit?: number;
  };
  stock_status?: string;
  is_in_stock?: boolean;
  low_stock_remaining?: number | null;
};

export const dynamic = "force-dynamic";

function productPrice(product: StoreProduct) {
  const raw = Number(product.prices?.price ?? 0);
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  return raw / 10 ** minorUnit;
}

export async function GET() {
  const products: StoreProduct[] = [];
  let total = 0;

  for (let page = 1; page <= 5; page += 1) {
    const url = `https://skaitytaknyga.lt/wp-json/wc/store/products?per_page=100&page=${page}`;
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

    total = Number(response.headers.get("x-wp-total") ?? total);
    const pageProducts = (await response.json()) as StoreProduct[];
    products.push(...pageProducts);
    if (pageProducts.length < 100 || products.length >= total) break;
  }

  return NextResponse.json({
    total,
    products: products.map((product) => ({
      id: product.id ?? 0,
      title: product.name ?? "",
      price: productPrice(product),
      url: product.permalink ?? "",
      image: product.images?.[0]?.src ?? "",
      stockStatus: product.stock_status ?? "instock",
      stockQuantity:
        product.stock_status === "outofstock" || product.is_in_stock === false
          ? 0
          : typeof product.low_stock_remaining === "number"
            ? product.low_stock_remaining
            : undefined,
    })),
  });
}
