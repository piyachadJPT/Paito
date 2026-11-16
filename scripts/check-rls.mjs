// Checks that a signed-out client (publishable/anon key) cannot touch trip data.
// Usage: npm run check:rls
// Read-only except one INSERT attempt that must be rejected.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
let failed = 0;

function report(ok, label, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
}

for (const table of ["trips", "trip_days", "trip_stops"]) {
  const { data, error } = await supabase.from(table).select("id").limit(1);
  // Either denied outright or 0 rows is acceptable
  const ok = Boolean(error) || (Array.isArray(data) && data.length === 0);
  report(ok, `anon cannot read ${table}`, error ? `denied: ${error.code}` : `${data?.length ?? 0} rows`);
}

{
  const { error } = await supabase
    .from("trips")
    .insert({ name: "rls-check", start_date: "2026-12-31", end_date: "2026-12-31" });
  report(Boolean(error), "anon cannot insert into trips", error ? `denied: ${error.code}` : "INSERT SUCCEEDED");
}

{
  const { data, error } = await supabase.rpc("keepalive");
  report(!error && typeof data === "string", "anon can call keepalive()", error?.message ?? data);
}

{
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  const settings = await res.json();
  report(settings.disable_signup === true, "sign-ups are disabled", `disable_signup=${settings.disable_signup}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
