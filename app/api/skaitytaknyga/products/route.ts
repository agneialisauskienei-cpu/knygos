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
  add_to_cart?: {
    maximum?: number;
  };
};

export const dynamic = "force-dynamic";

function productPrice(product: StoreProduct) {
  const raw = Number(product.prices?.price ?? 0);
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  return raw / 10 ** minorUnit;
}

function stockStatus(product: StoreProduct) {
  if (product.stock_status === "outofstock" || product.is_in_stock === false) return "outofstock";
  return product.stock_status ?? "instock";
}

export async function GET() {
  const products: StoreProduct[] = [];
  let total = 0;
  let totalPages = 1;

  async function fetchPage(page: number) {
    const url = `https://skaitytaknyga.lt/wp-json/wc/store/products?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "KnyguApskaita/1.0",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error("Skaitytaknyga.lt katalogo pasiekti nepavyko");
    }

    total = Number(response.headers.get("x-wp-total") ?? total);
    totalPages = Number(response.headers.get("x-wp-totalpages") ?? totalPages);
    const pageProducts = (await response.json()) as StoreProduct[];
    return pageProducts;
  }

  try {
    products.push(...await fetchPage(1));
    for (let page = 2; page <= totalPages; page += 10) {
      const pages = Array.from({ length: Math.min(10, totalPages - page + 1) }, (_, index) => page + index);
      const batches = await Promise.all(pages.map((pageNumber) => fetchPage(pageNumber)));
      products.push(...batches.flat());
    }
  } catch {
    return NextResponse.json({ error: "Skaitytaknyga.lt katalogo pasiekti nepavyko" }, { status: 502 });
  }

  return NextResponse.json({
    total,
    products: products.map((product) => ({
      id: product.id ?? 0,
      title: product.name ?? "",
      price: productPrice(product),
      url: product.permalink ?? "",
      image: product.images?.[0]?.src ?? "",
      stockStatus: stockStatus(product),
      stockQuantity:
        product.stock_status === "outofstock" || product.is_in_stock === false
          ? 0
          : typeof product.low_stock_remaining === "number"
            ? product.low_stock_remaining
            : typeof product.add_to_cart?.maximum === "number"
              ? product.add_to_cart.maximum
              : undefined,
    })),
  });
}
