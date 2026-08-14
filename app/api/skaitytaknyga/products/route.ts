import { NextResponse } from "next/server";

type StoreProduct = {
  id?: number;
  name?: string;
  permalink?: string;
  images?: { src?: string }[];
  categories?: { name?: string }[];
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

function stockQuantity(product: StoreProduct) {
  if (stockStatus(product) === "outofstock") return 0;
  if (typeof product.low_stock_remaining === "number") return product.low_stock_remaining;
  const maximum = product.add_to_cart?.maximum;
  if (typeof maximum === "number" && maximum > 0 && maximum <= 20) return maximum;
  return undefined;
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
  const products: StoreProduct[] = [];
  let total = 0;
  let totalPages = 1;
  let activeSearch = search;

  async function fetchPage(page: number) {
    const params = new URLSearchParams({ per_page: "100", page: String(page) });
    if (activeSearch) params.set("search", activeSearch);
    const url = `https://skaitytaknyga.lt/wp-json/wc/store/products?${params.toString()}`;
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
    if (!products.length && search) {
      const fallbackSearch = search.split(/\s+/).find((word) => word.length >= 4);
      if (fallbackSearch && fallbackSearch !== search) {
        activeSearch = fallbackSearch;
        total = 0;
        totalPages = 1;
        products.push(...await fetchPage(1));
      }
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
      storage: product.categories?.map((category) => category.name).filter(Boolean).join(" > ") || "skaitytaknyga.lt",
      stockStatus: stockStatus(product),
      stockQuantity: stockQuantity(product),
    })),
  });
}
