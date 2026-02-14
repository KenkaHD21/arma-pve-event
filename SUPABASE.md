# Supabase einrichten (optional)

Damit alle Nutzer dieselben Event-Daten sehen, kannst du Supabase als Cloud-Speicher nutzen.

## 1. Tabelle anlegen

Im Supabase Dashboard: **SQL Editor** → Neue Abfrage, dann ausführen:

```sql
create table if not exists app_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Optional: Lese-/Schreibzugriff für anonyme Nutzer (jeder kann lesen/schreiben)
alter table app_data enable row level security;

create policy "Allow anon read and write"
  on app_data for all
  to anon
  using (true)
  with check (true);
```

## 2. Zugangsdaten eintragen

In **supabase-config.js** eintragen (oder Werte aus Supabase Dashboard → Project Settings → API):

- `PVE_SUPABASE_URL` = Project URL (z. B. `https://xxxx.supabase.co`)
- `PVE_SUPABASE_ANON_KEY` = anon public Key

Ohne Eintrag funktioniert die App wie bisher nur mit lokalem Speicher (localStorage).
