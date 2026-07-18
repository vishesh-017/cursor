/**
 * Apply Urbanexus schema via direct Postgres (DATABASE_URL).
 * Usage: node scripts/setup-supabase.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const root = path.resolve(import.meta.dirname, "..");
const migrations = [
  "supabase/migrations/001_urbanexus.sql",
  "supabase/migrations/002_user_moderation.sql",
];

const openRls = `
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;
`;

async function main() {
  await client.connect();
  console.log("Connected to Supabase Postgres");

  for (const file of migrations) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      console.log("Skip missing", file);
      continue;
    }
    const sql = fs.readFileSync(full, "utf8");
    console.log("Running", file);
    await client.query(sql);
  }

  // Demo: allow publishable key to read/write until a secret key is added.
  console.log("Disabling RLS on public tables (demo sync mode)");
  await client.query(openRls);

  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`
  );
  console.log(
    "Tables:",
    rows.map((r) => r.table_name).join(", ")
  );
  console.log("Schema ready");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.end());
