"use client";

import { useMemo, useState } from "react";
import { booksSeed } from "./books-data";
import { senaSales } from "./sena-sales";
import { agneali1990VintedSales } from "./vinted-agneali1990-sales";

const BOOK_STORAGE_KEY = "knygu-apskaita-books-v1";
const PRESENCE_STORAGE_KEY = "knygu-apskaita-listings-v1";

type Platform = "WooCommerce" | "Vinted" | "Sena.lt" | "Facebook" | "Gyvai" | "Kita";
type SourceKey = "wp" | "sena" | "vinted1" | "vinted2" | "vinted3";
type SourceFilter = SourceKey | "all";
type StatusFilter = "all" | "aktyvu" | "parduota" | "neįkelta" | "reikia patikrinti" | "juodraščiai";
type SalesCountFilter = "all" | "0" | "1" | "2-4" | "5+";
type SortFilter = "title" | "priceDesc" | "priceAsc" | "soldDesc" | "stockAsc" | "newest";
type Tab = "šiandien" | "kalendorius" | "kontaktai" | "knygos" | "statistika" | "istorija" | "pranešimai" | "ivedimas" | "filtrai";
type Assignee = "Agne" | "Almantas" | "Abu";

type Book = {
  id: string;
  title: string;
  image: string;
  stock: number;
  storage: string;
  acquiredAt: string;
  purchasePrice?: number;
  recommendedPrice: number;
  listings: { platform: Platform; status: string; price: number; sales: number }[];
};

type Sale = {
  id: string;
  bookId: string;
  platform: Platform;
  soldAt: string;
  quantity: number;
  salePrice: number;
  purchaseCost?: number;
  fees: number;
  packing: number;
};

type WorkItem = {
  id: string;
  kind: "buy-request" | "pickup" | "email" | "reminder";
  title: string;
  detail: string;
  source: string;
  due: string;
  assignee: Assignee;
  status: "nauja" | "vykdoma" | "atlikta";
  urgent?: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  address: string;
  phone: string;
  agreedPrice: number;
  notes: string;
  assignee: Assignee;
  eventType: "supirkimas" | "atsiėmimas gyvai" | "darbas";
  status: "suplanuota" | "paskambinta" | "paimta" | "atlikta";
};

type WantedContact = {
  id: string;
  name: string;
  contact: string;
  lookingFor: string;
  waitingSince: string;
  channel: "Gmail" | "Telefonas" | "Vinted" | "Facebook" | "Gyvai" | "Kita";
  status: "laukia" | "pranešta" | "rasta" | "uždaryta";
  reminderDate: string;
  assignee: Assignee;
  notes: string;
};

type TrackingSource = {
  key: SourceKey;
  name: string;
  type: "WooCommerce" | "Sena.lt" | "Vinted";
  account: string;
  method: string;
  status: "prijungta" | "reikia prisijungti" | "tikrinama" | "klaida";
  lastChecked: string;
  found: number;
  issues: number;
};

type ListingPresence = {
  bookId: string;
  source: SourceKey;
  status: "aktyvu" | "parduota" | "neįkelta" | "reikia patikrinti";
  price: number;
  url: string;
  lastSeen: string;
};

type WpProduct = {
  id: number;
  title: string;
  price: number;
  url: string;
  image: string;
  stockStatus: string;
};

type MarketplaceProduct = {
  id: string | number;
  title: string;
  price: number;
  url: string;
};

const salesSeed: Sale[] = [
  ...agneali1990VintedSales.map((sale, index) => ({
    id: `agneali1990-${index}-${sale.bookId}`,
    bookId: sale.bookId,
    platform: "Vinted" as Platform,
    soldAt: "be datos",
    quantity: 1,
    salePrice: sale.price,
    purchaseCost: 0,
    fees: 0,
    packing: 0,
  })),
  ...senaSales.map((sale) => ({
    id: `sena-${sale.orderId}-${sale.bookId}`,
    bookId: sale.bookId,
    platform: "Sena.lt" as Platform,
    soldAt: sale.soldAt,
    quantity: sale.quantity,
    salePrice: sale.price,
    purchaseCost: 0,
    fees: sale.fee,
    packing: 0,
  })),
];

const workSeed: WorkItem[] = [];

const calendarSeed: CalendarEvent[] = [];

const wantedContactsSeed: WantedContact[] = [];

const trackingSeed: TrackingSource[] = [
  { key: "wp", name: "skaitytaknyga.lt", type: "WooCommerce", account: "WP / WooCommerce", method: "WooCommerce REST API", status: "prijungta", lastChecked: "šiandien 10:42", found: 128, issues: 1 },
  { key: "sena", name: "Sena.lt", type: "Sena.lt", account: "skaitytaknygalt", method: "https://www.sena.lt/vartotojas/skaitytaknygalt", status: "prijungta", lastChecked: "vakar 18:05", found: 42, issues: 3 },
  { key: "vinted1", name: "agneali1990", type: "Vinted", account: "agneali1990", method: "Viešų skelbimų sekimas / eksportas", status: "prijungta", lastChecked: "šiandien 09:20", found: 71, issues: 2 },
  { key: "vinted2", name: "almisali", type: "Vinted", account: "almisali", method: "Viešų skelbimų sekimas / eksportas", status: "prijungta", lastChecked: "šiandien 09:18", found: 36, issues: 0 },
  { key: "vinted3", name: "wp.vizija", type: "Vinted", account: "wp.vizija", method: "Viešų skelbimų sekimas / eksportas", status: "prijungta", lastChecked: "nepatikrinta", found: 0, issues: 0 },
];

const listingPresenceSeed: ListingPresence[] = [];

const platforms: Platform[] = ["WooCommerce", "Vinted", "Sena.lt", "Facebook", "Gyvai", "Kita"];
const august2026Days = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const date = new Date(2026, 7, day);
  return {
    day,
    dateKey: `2026-08-${String(day).padStart(2, "0")}`,
    weekDay: date.getDay(),
  };
});

function money(value: number) {
  return `${value.toFixed(2).replace(".", ",")} Eur`;
}

function decodeText(value: string) {
  const decoded = value
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  if (!/[ÄÅÐÑâ]/.test(decoded)) return decoded;

  try {
    return decodeURIComponent(
      Array.from(decoded)
        .map((char) => `%${(char.charCodeAt(0) & 255).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  } catch {
    return decoded;
  }
}

function saleProfit(sale: Sale) {
  if (sale.purchaseCost === undefined) return undefined;
  return sale.salePrice - sale.purchaseCost - sale.fees - sale.packing;
}

function saleSourceLabel(sale: Sale) {
  if (sale.id.startsWith("agneali1990-")) return "Vinted / agneali1990";
  if (sale.id.startsWith("sena-")) return "Sena.lt / skaitytaknygalt";
  return sale.platform;
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function hasExactDate(sale: Sale) {
  return /^\d{4}-\d{2}-\d{2}$/.test(sale.soldAt);
}

function titleKey(value: string) {
  return decodeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[„“”"']/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9ąčęėįšųūž\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function historicalSales(book: Book) {
  return book.listings.reduce((sum, listing) => sum + listing.sales, 0);
}

function historicalRevenue(book: Book) {
  return historicalSales(book) * book.recommendedPrice;
}

function mergeBooksWithSeed(storedBooks: Book[]) {
  const seedById = new Map((booksSeed as Book[]).map((book) => [book.id, book]));
  const seedByTitle = new Map((booksSeed as Book[]).map((book) => [titleKey(book.title), book]));
  const merged = storedBooks.map((book) => {
    const seed = seedById.get(book.id) ?? seedByTitle.get(titleKey(book.title));
    if (!seed) return book;
    return {
      ...seed,
      ...book,
      listings: book.listings.map((listing) => {
        const seedListing = seed.listings.find((entry) => entry.platform === listing.platform);
        return seedListing ? { ...seedListing, ...listing, sales: Math.max(seedListing.sales, listing.sales) } : listing;
      }),
    };
  });
  const existingIds = new Set(merged.map((book) => book.id));
  return [...merged, ...(booksSeed as Book[]).filter((book) => !existingIds.has(book.id))];
}

function loadBooks() {
  if (typeof window === "undefined") return booksSeed as Book[];
  try {
    const stored = window.localStorage.getItem(BOOK_STORAGE_KEY);
    if (!stored) return booksSeed as Book[];
    const merged = mergeBooksWithSeed(JSON.parse(stored) as Book[]);
    persistBooks(merged);
    return merged;
  } catch {
    return booksSeed as Book[];
  }
}

function persistBooks(books: Book[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BOOK_STORAGE_KEY, JSON.stringify(books));
  }
}

function loadListingPresence() {
  if (typeof window === "undefined") return listingPresenceSeed;
  try {
    const saved = window.localStorage.getItem(PRESENCE_STORAGE_KEY);
    return saved ? JSON.parse(saved) as ListingPresence[] : listingPresenceSeed;
  } catch {
    return listingPresenceSeed;
  }
}

function persistListingPresence(presence: ListingPresence[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presence));
  }
}

function hasActiveListing(book: Book, source: SourceKey, presence: ListingPresence[]) {
  const tracked = presence.find((listing) => listing.bookId === book.id && listing.source === source && listing.status !== "neįkelta");
  if (tracked) return true;
  if (source === "wp") return book.listings.some((listing) => listing.platform === "WooCommerce" && listing.status !== "neįkelta");
  if (source === "sena") return book.listings.some((listing) => listing.platform === "Sena.lt" && listing.status !== "neįkelta");
  if (source.startsWith("vinted")) return book.listings.some((listing) => listing.platform === "Vinted" && listing.status !== "neįkelta");
  return false;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("šiandien");
  const [books, setBooksState] = useState<Book[]>(loadBooks);
  const [sales, setSales] = useState(salesSeed);
  const [items, setItems] = useState(workSeed);
  const [calendar, setCalendar] = useState(calendarSeed);
  const [trackingSources, setTrackingSources] = useState(trackingSeed);
  const [listingPresence, setListingPresence] = useState<ListingPresence[]>(loadListingPresence);
  const [wantedContacts, setWantedContacts] = useState(wantedContactsSeed);
  const [query, setQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [salesCountFilter, setSalesCountFilter] = useState<SalesCountFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("title");
  const [syncingWp, setSyncingWp] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filterMessage, setFilterMessage] = useState("");

  const stats = useMemo(() => {
    const month = sales.filter((sale) => sale.soldAt.startsWith("2026-08"));
    return {
      stock: books.reduce((sum, book) => sum + book.stock, 0),
      todaySold: sales.filter((sale) => sale.soldAt === "2026-08-12").reduce((sum, sale) => sum + sale.quantity, 0),
      monthRevenue: month.reduce((sum, sale) => sum + sale.salePrice, 0),
      monthProfit: month.reduce((sum, sale) => sum + (saleProfit(sale) ?? 0), 0),
      open: items.filter((item) => item.status !== "atlikta").length,
      husband: items.filter((item) => item.assignee === "Almantas" && item.status !== "atlikta").length,
      pickupsToday: calendar.filter((event) => event.date === "2026-08-12" && event.status !== "atlikta").length,
      trackingIssues: trackingSources.reduce((sum, source) => sum + source.issues, 0),
      waitingContacts: wantedContacts.filter((contact) => contact.status === "laukia").length,
    };
  }, [books, sales, items, calendar, trackingSources, wantedContacts]);

  const filteredBooks = books.filter((book) => {
    const title = decodeText(book.title);
    const matchesQuery = title.toLowerCase().includes(query.toLowerCase());
    const matchesSource =
      selectedSource === "all" ||
      hasActiveListing(book, selectedSource, listingPresence);
    const statuses = [
      ...book.listings.map((listing) => listing.status.toLowerCase()),
      ...listingPresence.filter((listing) => listing.bookId === book.id).map((listing) => listing.status),
    ];
    const soldTotal = historicalSales(book) + sales.filter((sale) => sale.bookId === book.id).reduce((sum, sale) => sum + sale.quantity, 0);
    const matchesStatus = statusFilter === "all" || (statusFilter === "parduota" ? soldTotal > 0 || statuses.includes("parduota") : statuses.includes(statusFilter));
    const matchesSales =
      salesCountFilter === "all" ||
      (salesCountFilter === "0" && soldTotal === 0) ||
      (salesCountFilter === "1" && soldTotal === 1) ||
      (salesCountFilter === "2-4" && soldTotal >= 2 && soldTotal <= 4) ||
      (salesCountFilter === "5+" && soldTotal >= 5);
    return matchesQuery && matchesSource && matchesStatus && matchesSales;
  });
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    const soldA = historicalSales(a) + sales.filter((sale) => sale.bookId === a.id).reduce((sum, sale) => sum + sale.quantity, 0);
    const soldB = historicalSales(b) + sales.filter((sale) => sale.bookId === b.id).reduce((sum, sale) => sum + sale.quantity, 0);
    if (sortFilter === "priceDesc") return b.recommendedPrice - a.recommendedPrice;
    if (sortFilter === "priceAsc") return a.recommendedPrice - b.recommendedPrice;
    if (sortFilter === "soldDesc") return soldB - soldA;
    if (sortFilter === "stockAsc") return a.stock - b.stock;
    if (sortFilter === "newest") return b.acquiredAt.localeCompare(a.acquiredAt);
    return decodeText(a.title).localeCompare(decodeText(b.title), "lt");
  });
  const visibleBooks = sortedBooks.slice(0, 120);

  function saveBooks(updater: (current: Book[]) => Book[]) {
    setBooksState((current) => {
      const next = updater(current);
      persistBooks(next);
      return next;
    });
  }

  function completeItem(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status: "atlikta" } : item)));
  }

  function assignToHusband(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, assignee: "Almantas", status: "nauja" } : item)));
  }

  function addWorkItem(formData: FormData) {
    const item: WorkItem = {
      id: crypto.randomUUID(),
      kind: String(formData.get("kind")) as WorkItem["kind"],
      title: String(formData.get("title")),
      detail: String(formData.get("detail")),
      source: String(formData.get("source")),
      due: String(formData.get("due")),
      assignee: String(formData.get("assignee")) as Assignee,
      status: String(formData.get("status")) as WorkItem["status"],
      urgent: formData.get("urgent") === "on",
    };
    setItems((current) => [item, ...current]);
  }

  function updateWorkItem(updated: WorkItem) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  function deleteWorkItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function updateCalendarStatus(id: string, status: CalendarEvent["status"]) {
    setCalendar((current) => current.map((event) => (event.id === id ? { ...event, status } : event)));
  }

  function updateCalendarEvent(updated: CalendarEvent) {
    setCalendar((current) =>
      current
        .map((event) => (event.id === updated.id ? updated : event))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    );
  }

  function addCalendarEvent(formData: FormData) {
    const assignee = String(formData.get("assignee")) as Assignee;
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: String(formData.get("title")),
      date: String(formData.get("date")),
      time: String(formData.get("time")),
      address: String(formData.get("address")),
      phone: String(formData.get("phone")),
      agreedPrice: Number(formData.get("agreedPrice") || 0),
      notes: String(formData.get("notes")),
      assignee,
      eventType: String(formData.get("eventType") || "supirkimas") as CalendarEvent["eventType"],
      status: "suplanuota",
    };
    setCalendar((current) => [event, ...current].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        kind: event.eventType === "atsiėmimas gyvai" ? "pickup" : "reminder",
        title: event.title,
        detail: `${event.date} ${event.time}, ${event.address}. Tel. ${event.phone}. Sutarta: ${money(event.agreedPrice)}. ${event.notes}`,
        source: "Kalendorius",
        due: `${event.date} ${event.time}`,
        assignee,
        status: "nauja",
        urgent: event.date === "2026-08-12",
      },
      ...current,
    ]);
    setTab("kalendorius");
  }

  function addSale(formData: FormData) {
    const bookId = String(formData.get("bookId"));
    const soldBook = books.find((book) => book.id === bookId);
    const sale: Sale = {
      id: crypto.randomUUID(),
      bookId,
      platform: String(formData.get("platform")) as Platform,
      soldAt: "2026-08-12",
      quantity: Number(formData.get("quantity")),
      salePrice: Number(formData.get("salePrice")),
      purchaseCost: Number(formData.get("purchaseCost") || 0),
      fees: Number(formData.get("fees") || 0),
      packing: Number(formData.get("packing") || 0),
    };
    setSales((current) => [sale, ...current]);
    saveBooks((current) => current.map((entry) => (entry.id === bookId ? { ...entry, stock: Math.max(0, entry.stock - sale.quantity) } : entry)));

    const stockAfterSale = Math.max(0, (soldBook?.stock ?? 0) - sale.quantity);
    if ((sale.platform === "Sena.lt" || sale.platform === "Vinted") && soldBook && stockAfterSale === 0) {
      const activePlaces = [
        ...soldBook.listings
          .filter((listing) => listing.status === "aktyvu" && listing.platform !== sale.platform)
          .map((listing) => listing.platform),
        ...listingPresence
          .filter((listing) => listing.bookId === soldBook.id && listing.status === "aktyvu")
          .map((listing) => trackingSources.find((source) => source.key === listing.source)?.name)
          .filter((name): name is string => Boolean(name)),
      ];
      const placesToRemove = Array.from(new Set(activePlaces.filter((place) => place !== sale.platform)));

      if (placesToRemove.length) {
        const task: WorkItem = {
          id: crypto.randomUUID(),
          kind: "reminder",
          title: `Išimti skelbimus: ${soldBook.title}`,
          detail: `Parduota per ${sale.platform}, sandėlyje liko 0. Reikia išimti skelbimą: ${placesToRemove.join(", ")}.`,
          source: "Pardavimas",
          due: "dabar",
          assignee: "Agne",
          status: "nauja",
          urgent: true,
        };
        setItems((current) => [task, ...current]);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Reikia išimti skelbimą", { body: `${soldBook.title}: ${placesToRemove.join(", ")}` });
        }
      }
    }
  }

  function updateSalePrice(id: string, salePrice: number) {
    setSales((current) => current.map((sale) => (sale.id === id ? { ...sale, salePrice } : sale)));
  }

  function importBookBatch(formData: FormData) {
    const rawList = String(formData.get("bookList"));
    const totalCost = Number(formData.get("totalCost") || 0);
    const acquiredAt = String(formData.get("acquiredAt") || "2026-08-12");
    const storage = String(formData.get("storage") || "Nenurodyta");
    const rows = rawList
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, quantityRaw, priceRaw] = line.split(";").map((part) => part?.trim());
        return {
          title,
          quantity: Math.max(1, Number(quantityRaw || 1)),
          rowCost: priceRaw ? Number(priceRaw.replace(",", ".")) : undefined,
        };
      });
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const sharedUnitCost = totalQuantity > 0 && totalCost > 0 ? totalCost / totalQuantity : 0;

    saveBooks((current) => [
      ...rows.map((row) => ({
        id: crypto.randomUUID(),
        title: row.title,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80",
        stock: row.quantity,
        storage,
        acquiredAt,
        purchasePrice: row.rowCost !== undefined ? row.rowCost / row.quantity : sharedUnitCost,
        recommendedPrice: Math.max(5, (row.rowCost !== undefined ? row.rowCost / row.quantity : sharedUnitCost) * 2.2),
        listings: [
          { platform: "WooCommerce" as Platform, status: "neįkelta", price: 0, sales: 0 },
          { platform: "Vinted" as Platform, status: "neįkelta", price: 0, sales: 0 },
          { platform: "Sena.lt" as Platform, status: "neįkelta", price: 0, sales: 0 },
        ],
      })),
      ...current,
    ]);
    setTab("knygos");
  }

  async function runTrackingSync() {
    const checkedAt = new Date().toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "short" });
    let wpFound = books.length;
    let senaFound = 0;
    let wpPresence: ListingPresence[] = [];
    let senaPresence: ListingPresence[] = [];
    let importedCount = 0;
    let syncOk = false;

    setSyncingWp(true);
    setSyncMessage("Vyksta atnaujinimas, tikrinama skaitytaknyga.lt ir Sena.lt...");

    try {
      const response = await fetch("/api/skaitytaknyga/products", { cache: "no-store" });
      if (!response.ok) throw new Error(`Nepavyko pasiekti skaitytaknyga.lt (${response.status})`);
      const data = await response.json() as { total: number; products: WpProduct[] };
      if (!Array.isArray(data.products)) throw new Error("WP grąžino netinkamą produktų formatą");
      wpFound = data.total || data.products.length || books.length;
      const syncedBooks = new Map<string, Book>();
      const byTitle = new Map(books.map((book) => [titleKey(book.title), book]));
      const nextBooks = [...books];

      for (const product of data.products.filter((entry) => entry.title)) {
        const key = titleKey(product.title);
        let book = byTitle.get(key);
        if (!book) {
          book = {
            id: `wp-${product.id}`,
            title: product.title,
            image: product.image || "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80",
            stock: product.stockStatus === "outofstock" ? 0 : 1,
            storage: "skaitytaknyga.lt",
            acquiredAt: new Date().toISOString().slice(0, 10),
            purchasePrice: undefined,
            recommendedPrice: product.price || 5,
            listings: [
              { platform: "WooCommerce", status: product.stockStatus === "outofstock" ? "parduota" : "aktyvu", price: product.price, sales: 0 },
              { platform: "Vinted", status: "neįkelta", price: 0, sales: 0 },
              { platform: "Sena.lt", status: "neįkelta", price: 0, sales: 0 },
            ],
          };
          byTitle.set(key, book);
          nextBooks.unshift(book);
          importedCount += 1;
        } else {
          const existingBook = book;
          const hasWooListing = book.listings.some((listing) => listing.platform === "WooCommerce");
          book = {
            ...book,
            image: book.image || product.image,
            stock: product.stockStatus === "outofstock" ? 0 : Math.max(1, book.stock),
            recommendedPrice: product.price || book.recommendedPrice,
            listings: hasWooListing
              ? book.listings.map((listing) =>
                  listing.platform === "WooCommerce"
                    ? { ...listing, status: product.stockStatus === "outofstock" ? "parduota" : "aktyvu", price: product.price }
                    : listing,
                )
              : [{ platform: "WooCommerce", status: product.stockStatus === "outofstock" ? "parduota" : "aktyvu", price: product.price, sales: 0 }, ...book.listings],
          };
          const index = nextBooks.findIndex((entry) => entry.id === existingBook.id);
          if (index !== -1) nextBooks[index] = book;
          byTitle.set(key, book);
        }
        syncedBooks.set(key, book);
      }

      setBooksState(nextBooks);
      persistBooks(nextBooks);

      wpPresence = data.products
        .map((product) => {
          const book = syncedBooks.get(titleKey(product.title));
          if (!book) return null;
          return {
            bookId: book.id,
            source: "wp" as SourceKey,
            status: product.stockStatus === "outofstock" ? "parduota" : "aktyvu",
            price: product.price,
            url: product.url,
            lastSeen: checkedAt,
          };
        })
        .filter(Boolean) as ListingPresence[];

      const senaResponse = await fetch("/api/sena/products", { cache: "no-store" });
      if (!senaResponse.ok) throw new Error(`Nepavyko pasiekti Sena.lt (${senaResponse.status})`);
      const senaData = await senaResponse.json() as { total: number; products: MarketplaceProduct[] };
      if (!Array.isArray(senaData.products)) throw new Error("Sena.lt grąžino netinkamą produktų formatą");
      senaFound = senaData.total || senaData.products.length;

      const booksAfterWp = nextBooks;
      const booksByTitle = new Map(booksAfterWp.map((book) => [titleKey(book.title), book]));
      const updatedBooks = [...booksAfterWp];

      for (const product of senaData.products.filter((entry) => entry.title)) {
        const book = booksByTitle.get(titleKey(product.title));
        if (!book) continue;
        const index = updatedBooks.findIndex((entry) => entry.id === book.id);
        const hasSenaListing = book.listings.some((listing) => listing.platform === "Sena.lt");
        const nextListings = hasSenaListing
          ? book.listings.map((listing) =>
              listing.platform === "Sena.lt"
                ? { ...listing, status: "aktyvu", price: product.price || listing.price }
                : listing,
            )
          : [...book.listings, { platform: "Sena.lt" as Platform, status: "aktyvu", price: product.price, sales: 0 }];
        if (index !== -1) updatedBooks[index] = { ...book, listings: nextListings };
        senaPresence.push({
          bookId: book.id,
          source: "sena",
          status: "aktyvu",
          price: product.price,
          url: product.url,
          lastSeen: checkedAt,
        });
      }

      setBooksState(updatedBooks);
      persistBooks(updatedBooks);
      const successMessage = `Atnaujinta: WP rasta ${wpFound}, Sena.lt rasta ${senaFound}, susieta ${senaPresence.length}, naujai įrašyta ${importedCount}.`;
      setSyncMessage(successMessage);
      syncOk = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nežinoma klaida";
      setSyncMessage(`Nepavyko atnaujinti: ${message}`);
      setItems((current) => [
        {
          id: crypto.randomUUID(),
          kind: "reminder",
          title: "Skaitytaknyga.lt sekimo klaida",
          detail: `Nepavyko automatiškai nuskaityti viešo WooCommerce katalogo. Klaida: ${message}.`,
          source: "Sekimas",
          due: "dabar",
          assignee: "Agne",
          status: "nauja",
          urgent: true,
        },
        ...current,
      ]);
    } finally {
      setSyncingWp(false);
    }

    if (syncOk) {
      setTrackingSources((current) =>
        current.map((source) => ({
          ...source,
          status: source.key === "wp" || source.key === "sena" ? "prijungta" : source.status === "klaida" ? "klaida" : "prijungta",
          found: source.key === "wp" ? wpFound : source.key === "sena" ? senaFound : source.found,
          lastChecked: source.key === "wp" || source.key === "sena" ? checkedAt : "ką tik",
        })),
      );
      setItems((current) => [
        {
          id: crypto.randomUUID(),
          kind: "reminder",
          title: "Platformų sekimas atnaujintas",
          detail: `Patikrinta skaitytaknyga.lt ir Sena.lt. WP rasta: ${wpFound}, Sena.lt rasta: ${senaFound}, su katalogu susieta: ${senaPresence.length}, naujai įrašyta: ${importedCount}.`,
          source: "Sekimas",
          due: "dabar",
          assignee: "Agne",
          status: "nauja",
          urgent: stats.trackingIssues > 0,
        },
        ...current,
      ]);
      setListingPresence((current) => {
        const nextPresence = [...wpPresence, ...senaPresence, ...current.filter((listing) => listing.source !== "wp" && listing.source !== "sena")];
        persistListingPresence(nextPresence);
        return nextPresence;
      });
    }
  }

  function addWantedContact(formData: FormData) {
    const assignee = String(formData.get("assignee")) as Assignee;
    const reminderDate = String(formData.get("reminderDate") || "");
    const contact: WantedContact = {
      id: crypto.randomUUID(),
      name: String(formData.get("name")),
      contact: String(formData.get("contact")),
      lookingFor: String(formData.get("lookingFor")),
      waitingSince: String(formData.get("waitingSince")),
      channel: String(formData.get("channel")) as WantedContact["channel"],
      status: "laukia",
      reminderDate,
      assignee,
      notes: String(formData.get("notes")),
    };
    setWantedContacts((current) => [contact, ...current]);
    if (reminderDate) {
      setItems((current) => [
        {
          id: crypto.randomUUID(),
          kind: "reminder",
          title: `Ieško knygos: ${contact.name}`,
          detail: `${contact.lookingFor}. Kontaktas: ${contact.contact}. ${contact.notes}`,
          source: "Ieško",
          due: reminderDate,
          assignee,
          status: "nauja",
        },
        ...current,
      ]);
    }
    setTab("kontaktai");
  }

  function updateWantedStatus(id: string, status: WantedContact["status"]) {
    setWantedContacts((current) => current.map((contact) => (contact.id === id ? { ...contact, status } : contact)));
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-[#020817] lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white">
        <div className="flex h-[64px] items-center gap-3 px-4">
          <LogoMark />
          <p className="min-w-0 text-sm font-black uppercase tracking-[0.24em] text-[#e87500]">skaitytaknyga.lt</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr]">
        <DashboardSidebar stats={stats} tab={tab} setTab={setTab} />
        <div className="grid gap-4 px-4 py-4 lg:max-h-[calc(100vh-64px)] lg:overflow-auto lg:px-5">
          {tab === "šiandien" && (
            <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
              <NotificationPanel items={items} completeItem={completeItem} assignToHusband={assignToHusband} addWorkItem={addWorkItem} updateWorkItem={updateWorkItem} deleteWorkItem={deleteWorkItem} />
              <div className="grid gap-5">
              <CalendarPanel calendar={calendar.slice(0, 2)} compact updateStatus={updateCalendarStatus} updateEvent={updateCalendarEvent} />
            </div>
          </section>
          )}

          {tab === "kalendorius" && <CalendarScreen calendar={calendar} addCalendarEvent={addCalendarEvent} updateStatus={updateCalendarStatus} updateEvent={updateCalendarEvent} />}
          {tab === "kontaktai" && <ContactsScreen contacts={wantedContacts} addWantedContact={addWantedContact} updateWantedStatus={updateWantedStatus} />}
          {tab === "statistika" && <StatisticsScreen books={books} sales={sales} />}
          {tab === "istorija" && <HistoryScreen books={books} sales={sales} items={items} calendar={calendar} contacts={wantedContacts} sources={trackingSources} />}
          {tab === "pranešimai" && <NotificationPanel items={items} completeItem={completeItem} assignToHusband={assignToHusband} addWorkItem={addWorkItem} updateWorkItem={updateWorkItem} deleteWorkItem={deleteWorkItem} />}
          {tab === "filtrai" && (
            <FiltersScreen
              query={query}
              setQuery={setQuery}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              salesCountFilter={salesCountFilter}
              setSalesCountFilter={setSalesCountFilter}
              sortFilter={sortFilter}
              setSortFilter={setSortFilter}
              total={books.length}
              filtered={filteredBooks.length}
              setTab={setTab}
            />
          )}
          {tab === "knygos" && (
            <section className="rounded-xl border border-[#e2e8f0] bg-white">
              <div className="grid gap-3 border-b border-[#e2e8f0] p-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.03em]">Knygų katalogas</h2>
                  <p className="mt-1 text-base text-[#475569]">
                    Rodoma {visibleBooks.length} iš {filteredBooks.length} rastų knygų. Iš viso kataloge: {books.length}.
                  </p>
                </div>
                <div className="grid gap-2 justify-self-start xl:justify-self-end">
                  <button onClick={runTrackingSync} disabled={syncingWp} className="h-10 rounded-md bg-[#e87500] px-4 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70">{syncingWp ? "Atnaujinama..." : "Atnaujinti WP ir Sena.lt"}</button>
                  {syncMessage && (
                    <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${syncMessage.startsWith("Nepavyko") ? "border-[#fecaca] bg-[#fff1f2] text-[#9f1239]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"}`}>
                      {syncMessage}
                    </p>
                  )}
                </div>
                <div className="xl:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ieškoti knygos" className="field" />
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMessage(`Rasta ${filteredBooks.length} knygų.`);
                      setFiltersOpen(false);
                    }}
                    className="h-12 rounded-xl bg-[#e87500] px-5 text-base font-semibold text-white"
                  >
                    Ieškoti
                  </button>
                </div>
                <details open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)} className="xl:col-span-2 rounded-xl border border-[#e87500] bg-white p-3">
                  <summary className="cursor-pointer text-base font-black text-[#020817]">Filtrai ir rikiavimas</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value as SourceFilter)} className="field">
                      <option value="all">Visos platformos</option>
                      <option value="wp">skaitytaknyga.lt</option>
                      <option value="sena">Sena.lt</option>
                      <option value="vinted1">agneali1990</option>
                      <option value="vinted2">almisali</option>
                      <option value="vinted3">wp.vizija</option>
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="field">
                      <option value="all">Visos būsenos</option>
                      <option value="aktyvu">Aktyvu</option>
                      <option value="parduota">Parduota</option>
                      <option value="neįkelta">Neįkelta</option>
                      <option value="juodraščiai">Juodraščiai</option>
                      <option value="reikia patikrinti">Reikia patikrinti</option>
                    </select>
                    <select value={salesCountFilter} onChange={(event) => setSalesCountFilter(event.target.value as SalesCountFilter)} className="field">
                      <option value="all">Visi pardavimai</option>
                      <option value="0">Neparduota</option>
                      <option value="1">Parduota 1 vnt.</option>
                      <option value="2-4">Parduota 2-4 vnt.</option>
                      <option value="5+">Parduota 5+ vnt.</option>
                    </select>
                    <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value as SortFilter)} className="field">
                      <option value="title">Pagal pavadinimą</option>
                      <option value="priceDesc">Didžiausia kaina</option>
                      <option value="priceAsc">Mažiausia kaina</option>
                      <option value="soldDesc">Daugiausia parduota</option>
                      <option value="stockAsc">Mažiausias likutis</option>
                      <option value="newest">Naujausiai įsigyta</option>
                    </select>
                    <div className="grid gap-2 xl:col-span-1">
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setSelectedSource("all");
                          setStatusFilter("all");
                          setSalesCountFilter("all");
                          setSortFilter("title");
                          setFilterMessage("Filtrai išvalyti.");
                        }}
                        className="h-12 rounded-xl border border-[#e2e8f0] px-4 text-base font-semibold text-[#334155]"
                      >
                        Išvalyti
                      </button>
                    </div>
                  </div>
                </details>
                {filterMessage && <p className="xl:col-span-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-sm font-semibold text-[#166534]">{filterMessage}</p>}
              </div>
              <div className="divide-y divide-[#e2e8f0]">
                {visibleBooks.map((book) => <BookRow key={book.id} book={book} sales={sales.filter((sale) => sale.bookId === book.id)} presence={listingPresence.filter((listing) => listing.bookId === book.id)} sources={trackingSources} />)}
              </div>
            </section>
          )}
          {tab === "ivedimas" && <EntryPanel books={books} addSale={addSale} addCalendarEvent={addCalendarEvent} importBookBatch={importBookBatch} />}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e2e8f0] bg-white p-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] lg:hidden">
        <MobileNav label="Šiandien" active={tab === "šiandien"} onClick={() => setTab("šiandien")} />
        <MobileNav label="Knygos" active={tab === "knygos"} onClick={() => setTab("knygos")} badge={stats.trackingIssues} />
        <MobileNav label="Kalend." active={tab === "kalendorius"} onClick={() => setTab("kalendorius")} badge={stats.pickupsToday} />
        <MobileNav label="Ieško" active={tab === "kontaktai"} onClick={() => setTab("kontaktai")} badge={stats.waitingContacts} />
        <MobileNav label="Stat." active={tab === "statistika"} onClick={() => setTab("statistika")} />
      </nav>
    </main>
  );
}

function PasswordScreen({ error, onSubmit }: { error: string; onSubmit: (formData: FormData) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-white p-5 text-[#020817]">
      <form action={onSubmit} className="w-full max-w-md rounded-2xl border border-[#e87500] bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
        <LogoMark />
        <p className="mt-5 text-sm font-black uppercase tracking-[0.28em] text-[#e87500]">Privati programa</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Skaitytaknyga.lt</h1>
        <p className="mt-3 text-base text-[#475569]">Įveskite slaptažodį, kad atsidarytų užduotys, kalendorius ir knygų apskaita.</p>
        <label className="mt-6 grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Slaptažodis</span>
          <input name="password" type="password" autoComplete="current-password" className="h-12 rounded-xl border border-[#e2e8f0] bg-white px-4 text-base outline-none focus:border-[#e87500] focus:ring-4 focus:ring-[#e87500]/15" required />
        </label>
        {error && <p className="mt-3 rounded-lg bg-[#fff4e8] px-3 py-2 text-sm font-semibold text-[#9a3412]">{error}</p>}
        <button className="mt-6 h-12 w-full rounded-xl bg-[#e87500] text-base font-bold text-white hover:bg-[#d96500]">Prisijungti</button>
      </form>
    </main>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${danger ? "border-[#f7f3f2] bg-white" : "border-[#e2e8f0] bg-white"}`}>
      <p className="text-base font-semibold text-[#475569]">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#020817]">{value}</p>
    </div>
  );
}

function LogoMark() {
  return (
    <img src="/skaityta-knyga-logo.png" alt="Skaityta knyga" className="h-12 w-12 shrink-0 rounded-md object-contain" />
  );
}

function TabButton({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className={`flex h-9 items-center justify-between rounded-lg px-3 text-left text-sm font-semibold ${active ? "bg-[#e87500] text-white" : "text-[#475569] hover:bg-[#fff8ef]"}`}>
      <span>{label}</span>
      {!!badge && <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white text-[#e87500]" : "bg-[#fff4e8] text-[#9a3412]"}`}>{badge}</span>}
    </button>
  );
}

function MobileNav({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className={`relative rounded-md px-2 py-2 text-sm font-semibold ${active ? "bg-[#e87500] text-white" : "text-[#475569]"}`}>
      {label}
      {!!badge && <span className="absolute right-2 top-1 rounded-full bg-[#b42318] px-1.5 text-[10px] text-white">{badge}</span>}
    </button>
  );
}

function DashboardSidebar({ stats, tab, setTab }: { stats: { todaySold: number; open: number; husband: number; pickupsToday: number; trackingIssues: number; stock: number; monthRevenue: number; monthProfit: number }; tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <aside className="hidden border-b border-[#e2e8f0] bg-white p-3 lg:block lg:h-[calc(100vh-64px)] lg:border-b-0 lg:border-r lg:overflow-auto">
      <nav className="grid gap-1.5">
        <TabButton label="Šiandien" active={tab === "šiandien"} onClick={() => setTab("šiandien")} badge={stats.open} />
        <TabButton label="Kalendorius" active={tab === "kalendorius"} onClick={() => setTab("kalendorius")} badge={stats.pickupsToday} />
        <TabButton label="Ieško" active={tab === "kontaktai"} onClick={() => setTab("kontaktai")} />
        <TabButton label="Knygos" active={tab === "knygos"} onClick={() => setTab("knygos")} badge={stats.trackingIssues} />
        <TabButton label="Statistika" active={tab === "statistika"} onClick={() => setTab("statistika")} />
        <TabButton label="Filtrai" active={tab === "filtrai"} onClick={() => setTab("filtrai")} />
        <TabButton label="Istorija" active={tab === "istorija"} onClick={() => setTab("istorija")} />
        <TabButton label="Pranešimai" active={tab === "pranešimai"} onClick={() => setTab("pranešimai")} />
        <TabButton label="Įvedimas" active={tab === "ivedimas"} onClick={() => setTab("ivedimas")} />
      </nav>

        <div className="mt-4 grid gap-1.5 border-t border-[#e2e8f0] pt-4 text-sm text-[#475569]">
          <p><b className="text-[#020817]">{stats.stock}</b> egz. sandėlyje</p>
          <p><b className="text-[#020817]">{stats.open}</b> atviros užduotys</p>
          <p><b className="text-[#020817]">{stats.pickupsToday}</b> paėmimai šiandien</p>
          <p><b className="text-[#020817]">{stats.trackingIssues}</b> sekimo neatitikimai</p>
        </div>
    </aside>
  );
}

function FiltersScreen({
  query,
  setQuery,
  selectedSource,
  setSelectedSource,
  statusFilter,
  setStatusFilter,
  salesCountFilter,
  setSalesCountFilter,
  sortFilter,
  setSortFilter,
  total,
  filtered,
  setTab,
}: {
  query: string;
  setQuery: (value: string) => void;
  selectedSource: SourceFilter;
  setSelectedSource: (source: SourceFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  salesCountFilter: SalesCountFilter;
  setSalesCountFilter: (value: SalesCountFilter) => void;
  sortFilter: SortFilter;
  setSortFilter: (value: SortFilter) => void;
  total: number;
  filtered: number;
  setTab: (tab: Tab) => void;
}) {
  function clearFilters() {
    setQuery("");
    setSelectedSource("all");
    setStatusFilter("all");
    setSalesCountFilter("all");
    setSortFilter("title");
  }

  return (
    <section className="rounded-xl border border-[#e87500] bg-white p-5">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-[#e87500]">Filtrai</p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#020817]">Paieška ir atranka</h2>
      <p className="mt-2 text-base text-[#475569]">Rasta {filtered} iš {total} knygų. Filtrai taikomi knygų katalogui.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Paieška</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Knyga arba platforma" className="field" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Platforma</span>
          <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value as SourceFilter)} className="field">
            <option value="all">Visos</option>
            <option value="wp">WooCommerce</option>
            <option value="sena">Sena.lt</option>
            <option value="vinted1">agneali1990</option>
            <option value="vinted2">almisali</option>
            <option value="vinted3">wp.vizija</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Būsena</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="field">
            <option value="all">Visos</option>
            <option value="aktyvu">Aktyvu</option>
            <option value="parduota">Parduota</option>
            <option value="neįkelta">Neįkelta</option>
            <option value="juodraščiai">Juodraščiai</option>
            <option value="reikia patikrinti">Reikia patikrinti</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Pardavimų kiekis</span>
          <select value={salesCountFilter} onChange={(event) => setSalesCountFilter(event.target.value as SalesCountFilter)} className="field">
            <option value="all">Visi kiekiai</option>
            <option value="0">Neparduota</option>
            <option value="1">Parduota 1 vnt.</option>
            <option value="2-4">Parduota 2-4 vnt.</option>
            <option value="5+">Parduota 5+ vnt.</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#475569]">Rikiuoti</span>
          <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value as SortFilter)} className="field">
            <option value="title">Pagal pavadinimą</option>
            <option value="priceDesc">Didžiausia kaina</option>
            <option value="priceAsc">Mažiausia kaina</option>
            <option value="soldDesc">Daugiausia parduota</option>
            <option value="stockAsc">Mažiausias likutis</option>
            <option value="newest">Naujausiai įsigyta</option>
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button type="button" onClick={() => setTab("knygos")} className="h-12 rounded-xl bg-[#e87500] px-5 text-base font-semibold text-white">Rodyti knygas</button>
          <button type="button" onClick={clearFilters} className="h-12 rounded-xl border border-[#e2e8f0] px-5 text-base font-semibold text-[#334155]">Išvalyti</button>
        </div>
      </div>
    </section>
  );
}

function ContactsScreen({ contacts, addWantedContact, updateWantedStatus }: { contacts: WantedContact[]; addWantedContact: (data: FormData) => void; updateWantedStatus: (id: string, status: WantedContact["status"]) => void }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <form action={addWantedContact} className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#e87500]">Ieško</p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#020817]">Naujas ieškantis</h2>
        <div className="mt-5 grid gap-3">
          <input name="name" placeholder="Vardas" className="field" required />
          <input name="contact" placeholder="Telefonas, el. paštas arba nuoroda" className="field" required />
          <textarea name="lookingFor" placeholder="Kokių knygų ieško / laukia" className="min-h-24 rounded-xl border border-[#e2e8f0] bg-white p-3 text-sm outline-none focus:border-[#e87500]" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="waitingSince" type="date" defaultValue="2026-08-12" className="field" required />
            <input name="reminderDate" type="date" className="field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="channel" defaultValue="Telefonas" className="field">
              <option>Telefonas</option>
              <option>Gmail</option>
              <option>Vinted</option>
              <option>Facebook</option>
              <option>Gyvai</option>
              <option>Kita</option>
            </select>
            <select name="assignee" defaultValue="Agne" className="field">
              <option>Agne</option>
              <option>Almantas</option>
              <option>Abu</option>
            </select>
          </div>
          <textarea name="notes" placeholder="Pastabos" className="min-h-20 rounded-xl border border-[#e2e8f0] bg-white p-3 text-sm outline-none focus:border-[#e87500]" />
          <button className="h-12 rounded-xl bg-[#e87500] text-base font-semibold text-white">Išsaugoti</button>
        </div>
      </form>

      <section className="rounded-xl border border-[#e2e8f0] bg-white">
        <div className="border-b border-[#e2e8f0] p-5">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#020817]">Kas ko ieško</h2>
          <p className="mt-1 text-base text-[#475569]">Žmonės, kurie ieško konkrečių knygų, nuo kada laukia ir kada priminti.</p>
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          {contacts.map((contact) => (
            <article key={contact.id} className={`p-5 ${contact.status === "uždaryta" ? "opacity-55" : ""}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d85f2a]">{contact.channel} / {contact.assignee}</p>
                  <h3 className="mt-1 text-xl font-black tracking-[-0.02em] text-[#020817]">{contact.name}</h3>
                  <div className="mt-2 grid gap-1 text-base text-[#475569]">
                    <span>Kontaktas: <b>{contact.contact}</b></span>
                    <span>Laukia nuo: <b>{contact.waitingSince}</b></span>
                    <span>Priminti: <b>{contact.reminderDate || "nenustatyta"}</b></span>
                    <span>Ieško: <b>{contact.lookingFor}</b></span>
                    <span>Pastabos: {contact.notes || "nėra"}</span>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-sm font-bold text-[#475569]">{contact.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {contact.status !== "pranešta" && <button onClick={() => updateWantedStatus(contact.id, "pranešta")} className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-base font-semibold">Pranešta</button>}
                {contact.status !== "rasta" && <button onClick={() => updateWantedStatus(contact.id, "rasta")} className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-base font-semibold">Rasta</button>}
                {contact.status !== "uždaryta" && <button onClick={() => updateWantedStatus(contact.id, "uždaryta")} className="rounded-xl bg-[#e87500] px-3 py-2 text-base font-semibold text-white">Uždaryti</button>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatisticsScreen({ books, sales }: { books: Book[]; sales: Sale[] }) {
  const totalStock = books.reduce((sum, book) => sum + book.stock, 0);
  const totalCatalogValue = books.reduce((sum, book) => sum + book.stock * book.recommendedPrice, 0);
  const enteredRevenue = sales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const historicalRevenueTotal = books.reduce((sum, book) => sum + historicalRevenue(book), 0);
  const totalRevenue = enteredRevenue + historicalRevenueTotal;
  const enteredSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const historicalSold = books.reduce((sum, book) => sum + historicalSales(book), 0);
  const totalSold = enteredSold + historicalSold;
  const totalProfit = sales.reduce((sum, sale) => sum + (saleProfit(sale) ?? 0), 0);
  const totalShipments = sales.length + historicalSold;
  const totalShippingCost = sales.reduce((sum, sale) => sum + sale.packing + sale.fees, 0);
  const averageSale = totalSold ? totalRevenue / totalSold : 0;
  const todayKey = "2026-08-12";
  const datedSales = sales.filter(hasExactDate);
  const undatedSales = sales.filter((sale) => !hasExactDate(sale));
  const undatedRevenue = undatedSales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const undatedUnits = undatedSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const todaySales = datedSales.filter((sale) => sale.soldAt === todayKey);
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.salePrice, 0);
  const todayUnits = todaySales.reduce((sum, sale) => sum + sale.quantity, 0);
  const currentMonth = datedSales.filter((sale) => sale.soldAt.startsWith("2026-08"));
  const currentMonthUnits = currentMonth.reduce((sum, sale) => sum + sale.quantity, 0);
  const currentMonthRevenue = currentMonth.reduce((sum, sale) => sum + sale.salePrice, 0);

  function groupSales(keyGetter: (sale: Sale) => string, sourceSales = sales) {
    return Array.from(
      sourceSales.reduce((map, sale) => {
        const key = keyGetter(sale);
        const current = map.get(key) ?? { label: key, orders: 0, quantity: 0, revenue: 0, costs: 0, profit: 0 };
        current.orders += 1;
        current.quantity += sale.quantity;
        current.revenue += sale.salePrice;
        current.costs += sale.fees + sale.packing;
        current.profit += saleProfit(sale) ?? 0;
        map.set(key, current);
        return map;
      }, new Map<string, { label: string; orders: number; quantity: number; revenue: number; costs: number; profit: number }>()),
    ).map(([, value]) => value);
  }

  const byDay = groupSales((sale) => sale.soldAt, datedSales).sort((a, b) => b.label.localeCompare(a.label));
  const byMonth = groupSales((sale) => sale.soldAt.slice(0, 7), datedSales).sort((a, b) => b.label.localeCompare(a.label));
  const byYear = groupSales((sale) => sale.soldAt.slice(0, 4), datedSales).sort((a, b) => b.label.localeCompare(a.label));

  const byPlatform = platforms.map((platform) => {
    const platformSales = sales.filter((sale) => sale.platform === platform);
    const platformHistoricalBooks = books
      .map((book) => ({
        quantity: book.listings.filter((listing) => listing.platform === platform).reduce((sum, listing) => sum + listing.sales, 0),
        revenue: book.listings.filter((listing) => listing.platform === platform).reduce((sum, listing) => sum + listing.sales * (listing.price || book.recommendedPrice), 0),
      }))
      .filter((row) => row.quantity > 0);
    return {
      label: platform,
      orders: platformSales.length + platformHistoricalBooks.reduce((sum, row) => sum + row.quantity, 0),
      quantity: platformSales.reduce((sum, sale) => sum + sale.quantity, 0) + platformHistoricalBooks.reduce((sum, row) => sum + row.quantity, 0),
      revenue: platformSales.reduce((sum, sale) => sum + sale.salePrice, 0) + platformHistoricalBooks.reduce((sum, row) => sum + row.revenue, 0),
      costs: platformSales.reduce((sum, sale) => sum + sale.fees + sale.packing, 0),
      profit: platformSales.reduce((sum, sale) => sum + (saleProfit(sale) ?? 0), 0),
    };
  }).filter((row) => row.quantity > 0 || row.revenue > 0);

  const byBook = books.map((book) => {
    const bookSales = sales.filter((sale) => sale.bookId === book.id);
    const oldSold = historicalSales(book);
    return {
      label: decodeText(book.title),
      orders: bookSales.length + oldSold,
      quantity: bookSales.reduce((sum, sale) => sum + sale.quantity, 0) + oldSold,
      revenue: bookSales.reduce((sum, sale) => sum + sale.salePrice, 0) + historicalRevenue(book),
      costs: bookSales.reduce((sum, sale) => sum + sale.fees + sale.packing, 0),
      profit: bookSales.reduce((sum, sale) => sum + (saleProfit(sale) ?? 0), 0),
    };
  }).filter((row) => row.quantity > 0).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 20);

  return (
    <section className="grid gap-5">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#e87500]">Statistika</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#020817]">Pardavimų, siuntų ir sumų pjūviai</h2>
        <p className="mt-2 text-base text-[#475569]">Diena, mėnuo, metai, vienetai, siuntos, platformos ir knygų pardavimai.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Šiandien vnt." value={todayUnits} detail={`${todaySales.length} siuntų / ${money(todayRevenue)}`} />
        <StatCard label="Šį mėn. vnt." value={currentMonthUnits} detail={`${currentMonth.length} siuntų / ${money(currentMonthRevenue)}`} />
        <StatCard label="Išlaidos" value={money(totalShippingCost)} detail="platformų mokesčiai ir pakavimas" />
        <StatCard label="Pelnas" value={money(totalProfit)} detail="pagal įvestas išlaidas" />
        <StatCard label="Pajamos iš viso" value={money(totalRevenue)} detail={`WP istorija ${money(historicalRevenueTotal)}, įvesta ${money(enteredRevenue)}`} />
        <StatCard label="Be datos" value={undatedUnits} detail={`${undatedSales.length} siuntų / ${money(undatedRevenue)} neįeina į dienas`} />
        <StatCard label="Visos siuntos" value={totalShipments} detail={`${sales.length} įvesta, ${historicalSold} WP istorija`} />
        <StatCard label="Knygų kataloge" value={books.length} detail={`${totalStock} egz. sandėlyje`} />
        <StatCard label="Katalogo vertė" value={money(totalCatalogValue)} detail="pagal pardavimo kainas" />
        <StatCard label="Parduota egz." value={totalSold} detail={`${enteredSold} įvesta, ${historicalSold} iš WP istorijos, vid. ${money(averageSale)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <StatsTable title="Dienomis" rows={byDay} empty="Dienos pardavimų dar nėra." />
        <StatsTable title="Mėnesiais" rows={byMonth} empty="Pardavimų dar nėra." />
        <StatsTable title="Metais" rows={byYear} empty="Metinių duomenų dar nėra." />
        <StatsTable title="Siuntos pagal platformas" rows={byPlatform} empty="Platformų pardavimų dar nėra." />
        <StatsTable title="Top knygos" rows={byBook} empty="Kai atsiras pardavimų, čia matysis dažniausiai parduotos knygos." />
      </div>
    </section>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <p className="text-sm font-bold text-[#475569]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#020817]">{value}</p>
      <p className="mt-1 text-sm text-[#475569]">{detail}</p>
    </article>
  );
}

function StatsTable({ title, rows, empty }: { title: string; rows: { label: string; orders: number; quantity: number; revenue: number; costs: number; profit: number }[]; empty: string }) {
  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#e2e8f0] p-4">
        <h3 className="text-2xl font-black tracking-[-0.03em] text-[#020817]">{title}</h3>
      </div>
      {rows.length ? (
        <div className="divide-y divide-[#e2e8f0]">
          {rows.map((row) => (
            <article key={row.label} className="grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p className="min-w-24 text-lg font-black text-[#020817]">{row.label}</p>
                <p className="text-base text-[#475569]">Siuntos: <b>{row.orders}</b></p>
                <p className="text-base text-[#475569]">Vnt.: <b>{row.quantity}</b></p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-base text-[#475569]">Pajamos<br /><b className="text-[#020817]">{money(row.revenue)}</b></p>
                <p className="rounded-lg bg-[#fff7ed] px-3 py-2 text-base text-[#475569]">Išlaidos<br /><b className="text-[#9a3412]">{money(row.costs)}</b></p>
                <p className="rounded-lg bg-[#f0fdf4] px-3 py-2 text-base text-[#475569]">Pelnas<br /><b className="text-[#166534]">{money(row.profit)}</b></p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="p-4 text-base text-[#475569]">{empty}</p>
      )}
    </section>
  );
}

function HistoryScreen({ books, sales, items, calendar, contacts, sources }: { books: Book[]; sales: Sale[]; items: WorkItem[]; calendar: CalendarEvent[]; contacts: WantedContact[]; sources: TrackingSource[] }) {
  const [filter, setFilter] = useState("visi");
  const rows = [
    ...items.map((item) => ({
      id: `item-${item.id}`,
      type: "užduotis",
      date: item.due,
      title: item.title,
      detail: `${item.source} / ${item.assignee} / būsena: ${item.status}. ${item.detail}`,
    })),
    ...calendar.map((event) => ({
      id: `calendar-${event.id}`,
      type: event.eventType,
      date: `${event.date} ${event.time}`,
      title: event.title,
      detail: `${event.address}, tel. ${event.phone}, sutarta ${money(event.agreedPrice)}, atsakingas: ${event.assignee}, būsena: ${event.status}. ${event.notes}`,
    })),
    ...contacts.map((contact) => ({
      id: `contact-${contact.id}`,
      type: "kontaktas",
      date: contact.waitingSince,
      title: `${contact.name} laukia knygų`,
      detail: `${contact.lookingFor}. Kontaktas: ${contact.contact}. Priminti: ${contact.reminderDate}. Būsena: ${contact.status}.`,
    })),
    ...sales.map((sale) => {
      const book = books.find((entry) => entry.id === sale.bookId);
      return {
        id: `sale-${sale.id}`,
        type: "pardavimas",
        date: sale.soldAt,
        title: book?.title ?? "Parduota knyga",
        detail: `${sale.platform}, kiekis ${sale.quantity}, suma ${money(sale.salePrice)}, pelnas ${saleProfit(sale) === undefined ? "nežinomas" : money(saleProfit(sale) ?? 0)}.`,
      };
    }),
    ...sources.map((source) => ({
      id: `source-${source.key}`,
      type: "sekimas",
      date: source.lastChecked,
      title: source.name,
      detail: `${source.account}, ${source.status}, rasta ${source.found} skelb., neatitikimai: ${source.issues}.`,
    })),
  ];
  const filteredRows = rows.filter((row) => filter === "visi" || row.type === filter);

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#e2e8f0] p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#e87500]">Žurnalas</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#020817]">Visa istorija</h2>
          <p className="mt-2 text-base text-[#475569]">Bendra veiksmų, užduočių, ieškančių žmonių, pardavimų ir sekimo eiga.</p>
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field max-w-xs">
          <option value="visi">Visi įrašai</option>
          <option value="užduotis">Užduotys</option>
          <option value="supirkimas">Supirkimai</option>
          <option value="atsiėmimas gyvai">Atsiėmimai gyvai</option>
          <option value="kontaktas">Ieško</option>
          <option value="pardavimas">Pardavimai</option>
          <option value="sekimas">Sekimas</option>
        </select>
      </div>
      <div className="divide-y divide-[#e2e8f0]">
        {filteredRows.map((row) => (
          <article key={row.id} className="grid gap-3 p-5 lg:grid-cols-[170px_170px_1fr]">
            <p className="text-base font-black text-[#020817]">{row.date}</p>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d85f2a]">{row.type}</p>
            <div>
              <h3 className="text-xl font-black tracking-[-0.03em] text-[#020817]">{row.title}</h3>
              <p className="mt-1 text-base text-[#475569]">{row.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationPanel({ items, completeItem, assignToHusband, addWorkItem, updateWorkItem, deleteWorkItem }: { items: WorkItem[]; completeItem: (id: string) => void; assignToHusband: (id: string) => void; addWorkItem: (data: FormData) => void; updateWorkItem: (item: WorkItem) => void; deleteWorkItem: (id: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveEditedItem(formData: FormData) {
    updateWorkItem({
      id: String(formData.get("id")),
      kind: String(formData.get("kind")) as WorkItem["kind"],
      title: String(formData.get("title")),
      detail: String(formData.get("detail")),
      source: String(formData.get("source")),
      due: String(formData.get("due")),
      assignee: String(formData.get("assignee")) as Assignee,
      status: String(formData.get("status")) as WorkItem["status"],
      urgent: formData.get("urgent") === "on",
    });
    setEditingId(null);
  }

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#e2e8f0] p-4">
        <h2 className="text-2xl font-black tracking-[-0.03em]">Pranešimai ir užduotys</h2>
        <p className="mt-1 text-base text-[#475569]">Supirkimo formos, Gmail užklausos, atsiėmimai ir priminimai.</p>
        <form action={addWorkItem} className="mt-5 grid gap-3 rounded-xl border border-[#e87500] p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <input name="title" placeholder="Nauja užduotis" className="field" required />
            <input name="source" placeholder="Šaltinis, pvz. Gmail" className="field" required />
          </div>
          <textarea name="detail" placeholder="Aprašymas" className="min-h-20 rounded-md border border-[#e2e8f0] bg-white p-3 text-sm outline-none focus:border-[#e87500]" required />
          <div className="grid gap-3 lg:grid-cols-4">
            <select name="kind" defaultValue="reminder" className="field">
              <option value="buy-request">Supirkimas</option>
              <option value="pickup">Atsiėmimas gyvai</option>
              <option value="email">Užklausa</option>
              <option value="reminder">Priminimas</option>
            </select>
            <input name="due" placeholder="Terminas" className="field" required />
            <select name="assignee" defaultValue="Agne" className="field">
              <option>Agne</option>
              <option>Almantas</option>
              <option>Abu</option>
            </select>
            <select name="status" defaultValue="nauja" className="field">
              <option value="nauja">nauja</option>
              <option value="vykdoma">vykdoma</option>
              <option value="atlikta">atlikta</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
            <input name="urgent" type="checkbox" />
            Skubu
          </label>
          <button className="h-10 w-fit rounded-md bg-[#e87500] px-5 text-base font-semibold text-white">Pridėti</button>
        </form>
      </div>
      <div className="divide-y divide-[#e2e8f0]">
        {items.map((item) => editingId === item.id ? (
          <form key={item.id} action={saveEditedItem} className="grid gap-3 p-4">
            <input type="hidden" name="id" value={item.id} />
            <div className="grid gap-3 lg:grid-cols-2">
              <input name="title" defaultValue={item.title} className="field" required />
              <input name="source" defaultValue={item.source} className="field" required />
            </div>
            <textarea name="detail" defaultValue={item.detail} className="min-h-20 rounded-md border border-[#e2e8f0] bg-white p-3 text-sm outline-none focus:border-[#e87500]" required />
            <div className="grid gap-3 lg:grid-cols-4">
              <select name="kind" defaultValue={item.kind} className="field">
                <option value="buy-request">Supirkimas</option>
                <option value="pickup">Atsiėmimas gyvai</option>
                <option value="email">Užklausa</option>
                <option value="reminder">Priminimas</option>
              </select>
              <input name="due" defaultValue={item.due} className="field" required />
              <select name="assignee" defaultValue={item.assignee} className="field">
                <option>Agne</option>
                <option>Almantas</option>
                <option>Abu</option>
              </select>
              <select name="status" defaultValue={item.status} className="field">
                <option value="nauja">nauja</option>
                <option value="vykdoma">vykdoma</option>
                <option value="atlikta">atlikta</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
              <input name="urgent" type="checkbox" defaultChecked={item.urgent} />
              Skubu
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-[#e87500] px-4 py-2 text-base font-semibold text-white">Išsaugoti</button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-[#e2e8f0] px-4 py-2 text-base font-semibold">Atšaukti</button>
            </div>
          </form>
        ) : (
          <article key={item.id} className={`p-4 ${item.status === "atlikta" ? "opacity-55" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase text-[#d85f2a]">{item.source} / {item.assignee}</p>
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                <p className="mt-1 text-base text-[#475569]">{item.detail}</p>
              </div>
              {item.urgent && <span className="rounded-full bg-[#ffe0d6] px-2 py-1 text-sm font-semibold text-[#9a3412]">skubu</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#475569]">Terminas: {item.due}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#475569]">Būsena: {item.status}</span>
              {item.status !== "atlikta" && <button onClick={() => completeItem(item.id)} className="rounded-md bg-[#e87500] px-3 py-1.5 text-sm font-semibold text-white">Atlikta</button>}
              {item.assignee !== "Almantas" && item.status !== "atlikta" && <button onClick={() => assignToHusband(item.id)} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-semibold">Almantui paskambinti</button>}
              <button onClick={() => setEditingId(item.id)} className="rounded-md border border-[#e87500] px-3 py-1.5 text-sm font-semibold text-[#d96500]">Redaguoti</button>
              <button onClick={() => deleteWorkItem(item.id)} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-semibold">Ištrinti</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CalendarScreen({ calendar, addCalendarEvent, updateStatus, updateEvent }: { calendar: CalendarEvent[]; addCalendarEvent: (data: FormData) => void; updateStatus: (id: string, status: CalendarEvent["status"]) => void; updateEvent: (event: CalendarEvent) => void }) {
  return (
    <section className="grid gap-5">
      <MonthCalendar calendar={calendar} />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <form action={addCalendarEvent} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <h2 className="text-2xl font-black tracking-[-0.03em]">Naujas paėmimas / darbas</h2>
        <div className="mt-4 grid gap-3">
          <input name="title" placeholder="Pvz. Paėmimas: 25 knygos" className="field" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="date" type="date" defaultValue="2026-08-12" className="field" required />
            <input name="time" type="time" defaultValue="16:00" className="field" required />
          </div>
          <input name="address" placeholder="Adresas" className="field" required />
          <input name="phone" type="tel" placeholder="Telefonas" className="field" required />
          <input name="agreedPrice" type="number" step="0.01" placeholder="Sutarta kaina" className="field" />
          <select name="eventType" defaultValue="supirkimas" className="field">
            <option value="supirkimas">Supirkimas</option>
            <option value="atsiėmimas gyvai">Atsiėmimas gyvai</option>
            <option value="darbas">Kitas darbas</option>
          </select>
          <select name="assignee" className="field" defaultValue="Almantas">
            <option>Almantas</option>
            <option>Agne</option>
            <option>Abu</option>
          </select>
          <textarea name="notes" placeholder="Pastabos: ką paimti, ar jau kalbėta, kur privažiuoti" className="min-h-24 rounded-md border border-[#e2e8f0] bg-[#ffffff] p-3 text-sm outline-none focus:border-[#e87500]" />
          <button className="h-10 rounded-md bg-[#e87500] text-base font-semibold text-white">Išsaugoti kalendoriuje</button>
        </div>
      </form>
      <CalendarPanel calendar={calendar} updateStatus={updateStatus} updateEvent={updateEvent} />
      </div>
    </section>
  );
}

function MonthCalendar({ calendar }: { calendar: CalendarEvent[] }) {
  const weekDays = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];
  const leadingEmpty = 5;
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <section className="rounded-xl border border-[#e87500] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#e2e8f0] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#e87500]">Kalendorius</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#020817]">2026 rugpjūtis</h2>
        </div>
        <p className="text-base text-[#475569]">Viso mėnesio paėmimai ir supirkimai vienoje vietoje.</p>
      </div>
      <div className="grid grid-cols-7 border-b border-[#e2e8f0] text-center text-sm font-bold uppercase text-[#475569]">
        {weekDays.map((day) => <div key={day} className="border-r border-[#e2e8f0] p-3 last:border-r-0">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: leadingEmpty }).map((_, index) => <div key={`empty-${index}`} className="min-h-28 border-r border-b border-[#e2e8f0] bg-white" />)}
        {august2026Days.map((day) => {
          const dayEvents = calendar.filter((event) => event.date === day.dateKey);
          return (
            <div key={day.dateKey} className="min-h-28 border-r border-b border-[#e2e8f0] bg-white p-2 last:border-r-0">
              <p className="text-sm font-black text-[#020817]">{day.day}</p>
              <div className="mt-2 grid gap-1">
                {dayEvents.map((event) => (
                  <button key={event.id} onClick={() => setSelectedEvent(event)} className="rounded-lg border border-[#e87500] bg-white px-2 py-1 text-left text-xs font-semibold text-[#020817] hover:bg-[#fff4e8]">
                    {event.time} {event.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {selectedEvent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#020817]/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-[#e87500] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] p-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d85f2a]">{selectedEvent.eventType}</p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#020817]">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-base font-semibold">Uždaryti</button>
            </div>
            <div className="grid gap-3 p-5 text-base text-[#475569]">
              <DetailLine label="Data" value={selectedEvent.date} />
              <DetailLine label="Laikas" value={selectedEvent.time} />
              <DetailLine label="Atsakingas" value={selectedEvent.assignee} />
              <DetailLine label="Būsena" value={selectedEvent.status} />
              <DetailLine label="Adresas / vieta" value={selectedEvent.address} />
              <DetailLine label="Telefonas" value={selectedEvent.phone} href={`tel:${selectedEvent.phone}`} />
              <DetailLine label="Sutarta kaina" value={money(selectedEvent.agreedPrice)} />
              <div className="rounded-xl border border-[#e2e8f0] p-4">
                <p className="text-sm font-bold uppercase text-[#475569]">Pastabos</p>
                <p className="mt-1 text-lg font-semibold text-[#020817]">{selectedEvent.notes || "nėra"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailLine({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-[#e2e8f0] p-4 sm:grid-cols-[160px_1fr] sm:items-center">
      <span className="text-sm font-bold uppercase text-[#475569]">{label}</span>
      {href ? <a href={href} className="text-lg font-black text-[#d96500]">{value}</a> : <span className="text-lg font-black text-[#020817]">{value}</span>}
    </div>
  );
}

function CalendarPanel({ calendar, updateStatus, updateEvent, compact }: { calendar: CalendarEvent[]; updateStatus: (id: string, status: CalendarEvent["status"]) => void; updateEvent: (event: CalendarEvent) => void; compact?: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveEvent(formData: FormData) {
    updateEvent({
      id: String(formData.get("id")),
      title: String(formData.get("title")),
      date: String(formData.get("date")),
      time: String(formData.get("time")),
      address: String(formData.get("address")),
      phone: String(formData.get("phone")),
      agreedPrice: Number(formData.get("agreedPrice") || 0),
      notes: String(formData.get("notes")),
      assignee: String(formData.get("assignee")) as Assignee,
      eventType: String(formData.get("eventType")) as CalendarEvent["eventType"],
      status: String(formData.get("status")) as CalendarEvent["status"],
    });
    setEditingId(null);
  }

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white">
      <div className="border-b border-[#e2e8f0] p-4">
        <h2 className="text-2xl font-black tracking-[-0.03em]">{compact ? "Artimiausi paėmimai" : "Bendras kalendorius"}</h2>
        <p className="mt-1 text-base text-[#475569]">Matysite abu: laiką, adresą, telefoną, pastabas ir kas atsakingas.</p>
      </div>
      <div className="divide-y divide-[#e2e8f0]">
        {calendar.map((event) =>
          editingId === event.id ? (
            <form key={event.id} action={saveEvent} className="grid gap-3 p-4">
              <input type="hidden" name="id" value={event.id} />
              <input name="title" defaultValue={event.title} className="field" required />
              <div className="grid grid-cols-2 gap-2">
                <input name="date" type="date" defaultValue={event.date} className="field" required />
                <input name="time" type="time" defaultValue={event.time} className="field" required />
              </div>
              <input name="address" defaultValue={event.address} className="field" required />
              <input name="phone" type="tel" defaultValue={event.phone} className="field" required />
              <input name="agreedPrice" type="number" step="0.01" defaultValue={event.agreedPrice} className="field" />
              <select name="eventType" defaultValue={event.eventType} className="field">
                <option value="supirkimas">Supirkimas</option>
                <option value="atsiėmimas gyvai">Atsiėmimas gyvai</option>
                <option value="darbas">Kitas darbas</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select name="assignee" defaultValue={event.assignee} className="field">
                  <option>Almantas</option>
                  <option>Agne</option>
                  <option>Abu</option>
                </select>
                <select name="status" defaultValue={event.status} className="field">
                  <option value="suplanuota">suplanuota</option>
                  <option value="paskambinta">paskambinta</option>
                  <option value="paimta">paimta</option>
                  <option value="atlikta">atlikta</option>
                </select>
              </div>
              <textarea name="notes" defaultValue={event.notes} className="min-h-24 rounded-md border border-[#e2e8f0] bg-[#ffffff] p-3 text-sm outline-none focus:border-[#e87500]" />
              <div className="flex flex-wrap gap-2">
                <button className="rounded-md bg-[#e87500] px-4 py-2 text-base font-semibold text-white">Išsaugoti</button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-[#e2e8f0] px-4 py-2 text-base font-semibold">Atsaukti</button>
              </div>
            </form>
          ) : (
            <article key={event.id} className={`p-4 ${event.status === "atlikta" ? "opacity-55" : ""}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-[#d85f2a]">{event.date} / {event.time} / {event.assignee}</p>
                  <h3 className="mt-1 font-semibold">{event.title}</h3>
                  <div className="mt-2 grid gap-1 text-base text-[#475569]">
                    <span>Tipas: <b>{event.eventType}</b></span>
                    <span>Adresas: <b>{event.address}</b></span>
                    <span>Telefonas: <a className="font-semibold text-[#d96500]" href={`tel:${event.phone}`}>{event.phone}</a></span>
                    <span>Sutarta kaina: <b>{money(event.agreedPrice)}</b></span>
                    <span>Pastabos: {event.notes || "nėra"}</span>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-[#475569]">{event.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setEditingId(event.id)} className="rounded-md border border-[#e87500] px-3 py-1.5 text-sm font-semibold text-[#d96500]">Redaguoti</button>
                {event.status !== "paskambinta" && event.status !== "atlikta" && <button onClick={() => updateStatus(event.id, "paskambinta")} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-semibold">Paskambinta</button>}
                {event.status !== "paimta" && event.status !== "atlikta" && <button onClick={() => updateStatus(event.id, "paimta")} className="rounded-md border border-[#e2e8f0] px-3 py-1.5 text-sm font-semibold">Paimta</button>}
                {event.status !== "atlikta" && <button onClick={() => updateStatus(event.id, "atlikta")} className="rounded-md bg-[#e87500] px-3 py-1.5 text-sm font-semibold text-white">Atlikta</button>}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function BookRow({ book, sales, presence, sources }: { book: Book; sales: Sale[]; presence: ListingPresence[]; sources: TrackingSource[] }) {
  const enteredSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const oldSold = historicalSales(book);
  const sold = enteredSold + oldSold;
  const soldRevenue = sales.reduce((sum, sale) => sum + sale.salePrice, 0) + historicalRevenue(book);
  const averagePrice = sold ? soldRevenue / sold : 0;
  const title = decodeText(book.title);
  const visibleSales = [...sales]
    .sort((a, b) => (hasExactDate(b) ? b.soldAt : "0000").localeCompare(hasExactDate(a) ? a.soldAt : "0000"))
    .slice(0, 4);
  const hiddenSales = Math.max(0, sales.length - visibleSales.length);
  const platformRows = sources.map((source) => {
    const tracked = presence.find((listing) => listing.source === source.key);
    const local = source.key === "wp"
      ? book.listings.find((listing) => listing.platform === "WooCommerce")
      : source.key === "sena"
        ? book.listings.find((listing) => listing.platform === "Sena.lt")
        : book.listings.find((listing) => listing.platform === "Vinted");
    return {
      source,
      status: tracked?.status ?? local?.status ?? "neįkelta",
      price: tracked?.price ?? local?.price ?? 0,
      sales: local?.sales ?? 0,
      url: tracked?.url ?? "",
      lastSeen: tracked?.lastSeen,
    };
  });

  return (
    <article className="grid grid-cols-[64px_1fr] gap-4 p-4">
      <img src={book.image} alt="" className="h-20 w-16 rounded-md object-cover" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-2 grid gap-1 text-base text-[#475569] sm:grid-cols-4">
          <span>Likutis: <b>{book.stock}</b></span>
          <span>Parduota: <b>{sold}</b>{oldSold ? <em className="not-italic text-[#64748b]"> / WP {oldSold}</em> : null}</span>
          <span>Pardavimų suma: <b>{money(soldRevenue)}</b></span>
          <span>Vid. kaina: <b>{sold ? money(averagePrice) : "nėra"}</b></span>
          <span>Vieta: <b>{book.storage}</b></span>
          <span>Savikaina: <b>{book.purchasePrice ? money(book.purchasePrice) : "nežinoma"}</b></span>
          <span>Įsigyta: <b>{book.acquiredAt}</b></span>
          <span>Kaina: <b>{money(book.recommendedPrice)}</b></span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {platformRows.map((row) => {
            const content = (
              <>
                <span className="font-black">{row.source.name}</span>
                <span className={row.status === "aktyvu" ? "text-[#285b22]" : row.status === "parduota" ? "text-[#9a3412]" : "text-[#475569]"}>
                  {row.status}
                </span>
                {!!row.sales && <span className="text-[#475569]">parduota: {row.sales}</span>}
                <span className="text-[#475569]">{row.price ? money(row.price) : "be kainos"}</span>
                {row.lastSeen && <span className="text-[#64748b]">matyta: {row.lastSeen}</span>}
              </>
            );
            const className = "grid gap-1 rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm";
            return row.url ? (
              <a key={row.source.key} href={row.url} target="_blank" rel="noreferrer" className={`${className} hover:border-[#e87500]`}>
                {content}
              </a>
            ) : (
              <div key={row.source.key} className={className}>
                {content}
              </div>
            );
          })}
        </div>
        {(visibleSales.length > 0 || oldSold > 0) && (
          <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#e87500]">Pardavimai</p>
              <p className="text-sm text-[#475569]">Išlaidos: <b>{money(sales.reduce((sum, sale) => sum + sale.fees + sale.packing, 0))}</b></p>
              <p className="text-sm text-[#475569]">Pelnas: <b>{money(sales.reduce((sum, sale) => sum + (saleProfit(sale) ?? 0), 0))}</b></p>
            </div>
            <div className="mt-2 grid gap-2">
              {visibleSales.map((sale) => (
                <div key={sale.id} className="grid gap-1 rounded-md bg-white px-3 py-2 text-sm text-[#475569] sm:grid-cols-[1fr_90px_110px_110px_110px] sm:items-center">
                  <span className="font-semibold text-[#020817]">{saleSourceLabel(sale)}</span>
                  <span>{sale.soldAt}</span>
                  <span>Kiekis: <b>{sale.quantity}</b></span>
                  <span>Suma: <b>{money(sale.salePrice)}</b></span>
                  <span>Pelnas: <b>{saleProfit(sale) === undefined ? "nežinomas" : money(saleProfit(sale) ?? 0)}</b></span>
                </div>
              ))}
              {oldSold > 0 && <p className="rounded-md bg-white px-3 py-2 text-sm text-[#475569]">WP istorija: <b>{oldSold}</b> vnt. / {money(historicalRevenue(book))} / datos nėra</p>}
              {hiddenSales > 0 && <p className="text-sm font-semibold text-[#475569]">Dar {hiddenSales} pard. įrašai sutraukti, kad kortelė neišsitęstų.</p>}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function EntryPanel({ books, addSale, addCalendarEvent, importBookBatch }: { books: Book[]; addSale: (data: FormData) => void; addCalendarEvent: (data: FormData) => void; importBookBatch: (data: FormData) => void }) {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <form action={importBookBatch} className="rounded-xl border border-[#e87500] bg-white p-4 lg:col-span-3">
        <h2 className="text-2xl font-black tracking-[-0.03em]">Įmesti knygų sąrašą</h2>
        <p className="mt-2 text-base text-[#475569]">Viena eilutė: pavadinimas; kiekis; eilutės pirkimo suma. Jei sumos nenurodysi, savikaina bus paskirstyta iš bendros sumos.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <textarea name="bookList" placeholder={"Pavadinimas; kiekis; pirkimo suma\nPavadinimas; kiekis; pirkimo suma"} className="min-h-36 rounded-md border border-[#e2e8f0] bg-white p-3 text-base outline-none focus:border-[#e87500]" required />
          <input name="totalCost" type="number" step="0.01" placeholder="Bendra suma" className="field" />
          <input name="acquiredAt" type="date" defaultValue="2026-08-12" className="field" />
          <input name="storage" placeholder="Vieta sandėlyje" className="field" />
        </div>
        <button className="mt-4 h-10 rounded-md bg-[#e87500] px-5 text-base font-semibold text-white">Importuoti ir paskaičiuoti savikainą</button>
      </form>
      <form action={addSale} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <h2 className="text-2xl font-black tracking-[-0.03em]">Pridėti pardavimą</h2>
        <div className="mt-4 grid gap-3">
          <select name="bookId" className="field">{books.map((book) => <option key={book.id} value={book.id}>{decodeText(book.title)}</option>)}</select>
          <select name="platform" className="field">{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <input name="salePrice" type="number" step="0.01" placeholder="Kaina" className="field" required />
            <input name="quantity" type="number" min="1" defaultValue="1" className="field" required />
            <input name="purchaseCost" type="number" step="0.01" placeholder="Savikaina" className="field" />
            <input name="fees" type="number" step="0.01" placeholder="Mokestis" className="field" />
            <input name="packing" type="number" step="0.01" placeholder="Pakavimas" className="field" />
          </div>
          <button className="h-10 rounded-md bg-[#e87500] text-base font-semibold text-white">Išsaugoti ir sukurti pranešimą</button>
        </div>
      </form>
      <form action={addCalendarEvent} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <h2 className="text-2xl font-black tracking-[-0.03em]">Pridėti paėmimą / atsiėmimą</h2>
        <div className="mt-4 grid gap-3">
          <input name="title" placeholder="Darbo pavadinimas" className="field" required />
          <div className="grid grid-cols-2 gap-2">
            <input name="date" type="date" defaultValue="2026-08-12" className="field" required />
            <input name="time" type="time" defaultValue="16:00" className="field" required />
          </div>
          <input name="address" placeholder="Adresas" className="field" required />
          <input name="phone" type="tel" placeholder="Telefonas" className="field" required />
          <input name="agreedPrice" type="number" step="0.01" placeholder="Sutarta kaina" className="field" />
          <select name="eventType" defaultValue="atsiėmimas gyvai" className="field">
            <option value="atsiėmimas gyvai">Atsiėmimas gyvai</option>
            <option value="supirkimas">Supirkimas</option>
            <option value="darbas">Kitas darbas</option>
          </select>
          <select name="assignee" defaultValue="Almantas" className="field">
            <option>Almantas</option>
            <option>Agne</option>
            <option>Abu</option>
          </select>
          <textarea name="notes" placeholder="Pastabos" className="min-h-20 rounded-md border border-[#e2e8f0] bg-[#ffffff] p-3 text-sm outline-none focus:border-[#e87500]" />
          <button className="h-10 rounded-md bg-[#e87500] text-base font-semibold text-white">Išsaugoti paėmimą</button>
        </div>
      </form>
    </section>
  );
}








