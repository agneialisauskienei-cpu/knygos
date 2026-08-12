import { NextResponse } from "next/server";

type SenaProduct = {
  id: string;
  title: string;
  url: string;
  price: number;
};

export const dynamic = "force-dynamic";

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function productPrice(fragment: string) {
  const match = fragment.match(/(\d+(?:[,.]\d{1,2})?)\s*(?:€|Eur|EUR)/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function titleFromProductPage(html: string) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(h1[1]);

  const ogTitle = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (ogTitle) return cleanText(ogTitle[1].replace(/\s*-\s*Sena\.lt.*$/i, ""));

  return "";
}

function parseProducts(html: string) {
  const products = new Map<string, SenaProduct>();
  const linkPattern = /<a\b[^>]*href="([^"]*\/[^"]+\/(\d{5,}))"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html))) {
    const rawUrl = match[1];
    const id = match[2];
    const title = cleanText(match[3]);
    if (!title || title.length < 2 || title.length > 180) continue;
    if (title.toLowerCase().includes("sena.lt")) continue;
    if (title.includes("class=") || title.includes("this.") || title.includes("imageLoading")) continue;

    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + match[0].length + 700);
    const fragment = html.slice(start, end);
    const url = rawUrl.startsWith("http") ? rawUrl : `https://www.sena.lt${rawUrl}`;

    products.set(id, {
      id,
      title,
      url,
      price: productPrice(fragment),
    });
  }

  return Array.from(products.values());
}

async function enrichProduct(product: SenaProduct) {
  try {
    const response = await fetch(product.url, {
      headers: {
        accept: "text/html",
        "user-agent": "KnyguApskaita/1.0",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return product;

    const html = await response.text();
    const title = titleFromProductPage(html);
    return title ? { ...product, title } : product;
  } catch {
    return product;
  }
}

export async function GET() {
  const products: SenaProduct[] = [];

  for (let page = 1; page <= 8; page += 1) {
    const url = `https://www.sena.lt/vartotojas/skaitytaknygalt${page === 1 ? "" : `?page=${page}`}`;
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent": "KnyguApskaita/1.0",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Sena.lt paskyros pasiekti nepavyko" }, { status: 502 });
    }

    const html = await response.text();
    const pageProducts = parseProducts(html);
    products.push(...pageProducts);
    if (!html.includes(`?page=${page + 1}`) && !html.includes(`page=${page + 1}`)) break;
  }

  const unique = Array.from(new Map(products.map((product) => [product.id, product])).values());
  const enriched = await Promise.all(unique.map(enrichProduct));
  return NextResponse.json({ total: enriched.length, products: enriched });
}
