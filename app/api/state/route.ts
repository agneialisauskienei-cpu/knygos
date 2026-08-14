import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stateId = "main";

type AppStatePayload = {
  books?: unknown;
  sales?: unknown;
  listingPresence?: unknown;
  unmatchedListings?: unknown;
};

function supabaseHeaders() {
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
}

export async function GET() {
  const headers = supabaseHeaders();
  if (!supabaseUrl || !headers) {
    return NextResponse.json({ configured: false, data: null });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${stateId}&select=data`, {
    cache: "no-store",
    headers,
  });

  if (response.status === 404) {
    return NextResponse.json({ configured: true, data: null });
  }
  if (!response.ok) {
    return NextResponse.json({ configured: true, error: "Nepavyko nuskaityti Supabase duomenu" }, { status: 502 });
  }

  const rows = (await response.json()) as { data: AppStatePayload }[];
  return NextResponse.json({ configured: true, data: rows[0]?.data ?? null });
}

export async function PUT(request: Request) {
  const headers = supabaseHeaders();
  if (!supabaseUrl || !headers) {
    return NextResponse.json({ configured: false, saved: false });
  }

  const data = (await request.json()) as AppStatePayload;
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: stateId, data, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    return NextResponse.json({ configured: true, saved: false, error: "Nepavyko issaugoti Supabase duomenu" }, { status: 502 });
  }

  return NextResponse.json({ configured: true, saved: true });
}
