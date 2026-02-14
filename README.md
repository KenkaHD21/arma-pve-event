# Uebersicht PVE (Arma Reforger)

Statische HTML/JS-App: Übersicht, Slotliste, Organigramm, Funkplan, Mods, LADEF, Checkliste. Daten im localStorage, optional Cloud-Sync über Supabase.

## 1. Install

```bash
npm install
```

## 2. Supabase (optional)

Für Cloud-Sync die Zugangsdaten in **supabase-config.js** eintragen:

- `window.PVE_SUPABASE_URL` = deine Projekt-URL (`https://<project-ref>.supabase.co`)
- `window.PVE_SUPABASE_ANON_KEY` = Anon Key aus dem Supabase Dashboard

Tabelle und RLS siehe **SUPABASE.md**.

## 3. Dev-Server starten

```bash
npm run dev
```

Dann im Browser öffnen: **http://localhost:3456** (z.?B. `http://localhost:3456/index.html`).

## 4. Ohne Dev-Server

HTML-Dateien direkt im Browser öffnen (z.?B. `index.html`). Bei `file://` kann Supabase je nach Browser funktionieren; für zuverlässigen Sync lokalen Server nutzen.
