import { NextResponse } from "next/server";

type AuraDbPayload = {
  table: "profiles" | "journal_entries" | "reflection_entries";
  action: "insert" | "list";
  data?: Record<string, unknown>;
  limit?: number;
};

const SUPABASE_REST_VERSION = "2024-01-01";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || anonKey;
  return { url, key };
}

function isConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

function tableUrl(table: string) {
  const { url } = getSupabaseConfig();
  return `${url}/rest/v1/${table}`;
}

function headers() {
  const { key } = getSupabaseConfig();
  return {
    apikey: key ?? "",
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    "X-Client-Info": `aura-journal/${SUPABASE_REST_VERSION}`,
  };
}

export async function POST(req: Request) {
  const payload = (await req.json()) as AuraDbPayload;

  if (!isConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "Supabase environment variables are not configured yet." });
  }

  if (!payload.table || !payload.action) {
    return NextResponse.json({ ok: false, error: "Missing table or action." }, { status: 400 });
  }

  if (payload.action === "insert") {
    const response = await fetch(tableUrl(payload.table), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload.data ?? {}),
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    return NextResponse.json({ ok: response.ok, data: json }, { status: response.ok ? 200 : response.status });
  }

  const limit = payload.limit ?? 50;
  const response = await fetch(`${tableUrl(payload.table)}?select=*&order=created_at.desc&limit=${limit}`, {
    method: "GET",
    headers: headers(),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return NextResponse.json({ ok: response.ok, data: json }, { status: response.ok ? 200 : response.status });
}
