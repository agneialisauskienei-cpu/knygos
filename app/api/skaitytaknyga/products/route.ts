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

type WooProduct = {
  id?: number;
  name?: string;
  permalink?: string;
  images?: { src?: string }[];
  categories?: { name?: string }[];
  price?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  date_modified?: string;
  date_created?: string;
};

type NormalizedProduct = {
  id: number;
  title: string;
  price: number;
  url: string;
  image: string;
  storage: string;
  stockStatus: string;
  stockQuantity?: number;
  updatedAt?: string;
};

export const dynamic = "force-dynamic";

const baseUrl = (process.env.WP_BASE_URL ?? "https://skaitytaknyga.lt").replace(/\/$/, "");
const wooKey = process.env.WC_CONSUMER_KEY;
const wooSecret = process.env.WC_CONSUMER_SECRET;

function storeProductPrice(product: StoreProduct) {
  const raw = Number(product.prices?.price ?? 0);
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  return raw / 10 ** minorUnit;
}

function storeStockStatus(product: StoreProduct) {
  if (product.stock_status === "outofstock" || product.is_in_stock === false) return "outofstock";
  return product.stock_status ?? "instock";
}

function storeStockQuantity(product: StoreProduct) {
  if (storeStockStatus(product) === "outofstock") return 0;
  if (typeof product.low_stock_remaining === "number") return product.low_stock_remaining;
  const maximum = product.add_to_cart?.maximum;
  if (typeof maximum === "number" && maximum > 0 && maximum <= 20) return maximum;
  return undefined;
}

function wooStockStatus(product: WooProduct) {
  if (product.stock_status === "outofstock" || product.stock_quantity === 0) return "outofstock";
  return product.stock_status ?? "instock";
}

function wooStockQuantity(product: WooProduct) {
  if (typeof product.stock_quantity === "number") return Math.max(0, product.stock_quantity);
  if (wooStockStatus(product) === "outofstock") return 0;
  return undefined;
}

function normalizeStoreProduct(product: StoreProduct): NormalizedProduct {
  return {
    id: product.id ?? 0,
    title: product.name ?? "",
    price: storeProductPrice(product),
    url: product.permalink ?? "",
    image: product.images?.[0]?.src ?? "",
    storage: product.categories?.map((category) => category.name).filter(Boolean).join(" > ") || "skaitytaknyga.lt",
    stockStatus: storeStockStatus(product),
    stockQuantity: storeStockQuantity(product),
  };
}

function normalizeWooProduct(product: WooProduct): NormalizedProduct {
  return {
    id: product.id ?? 0,
    title: product.name ?? "",
    price: Number(product.price ?? 0),
    url: product.permalink ?? "",
    image: product.images?.[0]?.src ?? "",
    storage: product.categories?.map((category) => category.name).filter(Boolean).join(" > ") || "skaitytaknyga.lt",
    stockStatus: wooStockStatus(product),
    stockQuantity: wooStockQuantity(product),
    updatedAt: product.date_modified ?? product.date_created,
  };
}

async function fetchStoreProducts(search: string) {
  const products: NormalizedProduct[] = [];
  let total = 0;
  let totalPages = 1;
  let activeSearch = search;

  async function fetchPage(page: number) {
    const params = new URLSearchParams({ per_page: "100", page: String(page) });
    if (activeSearch) params.set("search", activeSearch);
    const url = `${baseUrl}/wp-json/wc/store/products?${params.toString()}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "KnyguApskaita/1.0",
      },
    });

    if (!response.ok) {
      throw new Error("Skaitytaknyga.lt katalogo pasiekti nepavyko");
    }

    total = Number(response.headers.get("x-wp-total") ?? total);
    totalPages = Number(response.headers.get("x-wp-totalpages") ?? totalPages);
    const pageProducts = (await response.json()) as StoreProduct[];
    return pageProducts.map(normalizeStoreProduct);
  }

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

  return { total, products, source: "store" };
}

async function fetchWooProducts(search: string) {
  if (!wooKey || !wooSecret) return null;

  const products: NormalizedProduct[] = [];
  let total = 0;
  let totalPages = 1;
  let activeSearch = search;
  const auth = Buffer.from(`${wooKey}:${wooSecret}`).toString("base64");

  async function fetchPage(page: number) {
    const params = new URLSearchParams({ per_page: "100", page: String(page), status: "any" });
    if (activeSearch) params.set("search", activeSearch);
    const url = `${baseUrl}/wp-json/wc/v3/products?${params.toString()}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Basic ${auth}`,
        "user-agent": "KnyguApskaita/1.0",
      },
    });

    if (!response.ok) {
      throw new Error("WooCommerce REST API katalogo pasiekti nepavyko");
    }

    total = Number(response.headers.get("x-wp-total") ?? total);
    totalPages = Number(response.headers.get("x-wp-totalpages") ?? totalPages);
    const pageProducts = (await response.json()) as WooProduct[];
    return pageProducts.map(normalizeWooProduct);
  }

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

  return { total, products, source: "woocommerce" };
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";

  try {
    const result = await fetchWooProducts(search) ?? await fetchStoreProducts(search);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Skaitytaknyga.lt katalogo pasiekti nepavyko" }, { status: 502 });
  }
}
