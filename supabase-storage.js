/**
 * Supabase-Storage für PVE Event – optionaler Cloud-Speicher.
 * Wenn PVE_SUPABASE_URL und PVE_SUPABASE_ANON_KEY gesetzt sind,
 * wird beim Laden aus Supabase gelesen und beim Speichern dorthin geschrieben.
 */
const APP_DATA_KEY = 'pve-event';
const TABLE = 'app_data';

async function getClient() {
  const url = window.PVE_SUPABASE_URL || '';
  const key = window.PVE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return createClient(url, key);
}

export async function initSupabaseSync() {
  const supabase = await getClient();
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from(TABLE).select('value').eq('key', APP_DATA_KEY).maybeSingle();
    if (error) return;
    if (data && data.value) {
      try {
        localStorage.setItem('pve-event-csv', data.value);
        window.dispatchEvent(new CustomEvent('pve-storage-synced'));
      } catch (e) {}
    }
  } catch (e) {}
}

export async function saveToSupabase(csv) {
  const supabase = await getClient();
  if (!supabase) return;
  try {
    await supabase.from(TABLE).upsert({ key: APP_DATA_KEY, value: csv, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (e) {}
}

// Für csv-export.js (normales Script): Aufrufe über window
window.initSupabaseSync = initSupabaseSync;
window.saveToSupabase = saveToSupabase;
// Beim Laden einmal aus Supabase holen (falls konfiguriert)
initSupabaseSync();
