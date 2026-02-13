/**
 * PVE Event – CSV als einziger Speicher (localStorage)
 * Alle Daten (Event, Slotliste, LADEF, Checkliste) werden als CSV gespeichert.
 */
const CSV_STORAGE_KEY = 'pve-event-csv';

const STORAGE_KEYS_LEGACY = {
  event: 'pve-event-data',
  slotliste: 'pve-slotliste-data',
  ladef: 'pve-ladef-data'
};

const SLOT_ROLES = {
  1: 'Platoon Lead (PL)', 2: 'Squad Lead (SL)', 3: 'Medic', 4: 'FTL Alpha',
  5: 'Rifleman', 6: 'Rifleman', 7: 'FTL Bravo', 8: 'Rifleman', 9: 'Rifleman',
  10: 'Squad Lead (SL)', 11: 'Medic', 12: 'FTL Alpha', 13: 'Rifleman', 14: 'Rifleman',
  15: 'FTL Bravo', 16: 'Rifleman', 17: 'Rifleman', 18: 'Squad Lead (SL)', 19: 'Medic',
  20: 'FTL Alpha', 21: 'Rifleman', 22: 'Rifleman', 23: 'FTL Bravo', 24: 'Rifleman',
  25: 'Rifleman', 26: 'Squad Lead (SL)', 27: 'Medic', 28: 'FTL Alpha', 29: 'Rifleman',
  30: 'Rifleman', 31: 'FTL Bravo', 32: 'Rifleman', 33: 'Rifleman'
};

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return s.includes(';') || s.includes('"') ? '"' + s + '"' : s;
}

function buildCsvFromData(data) {
  const lines = [];
  const ev = data.event || {};
  const sl = data.slotliste || {};
  const la = data.ladef || {};
  const ch = data.checkliste || {};

  lines.push('[EVENT]');
  lines.push('Feld;Wert');
  lines.push('Datum;' + escapeCsv(ev.datum));
  lines.push('Uhrzeit;' + escapeCsv(ev.uhrzeit));
  lines.push('Server;' + escapeCsv(ev.server));
  lines.push('');

  lines.push('[SLOTLISTE]');
  lines.push('Slot;Rolle;Name;Bemerkung');
  for (let i = 1; i <= 33; i++) {
    const s = sl[i] || {};
    const role = s.role || SLOT_ROLES[i] || '';
    lines.push([i, escapeCsv(role), escapeCsv(s.name), escapeCsv(s.notes)].join(';'));
  }
  lines.push('');

  lines.push('[LADEF]');
  lines.push('Abschnitt;Inhalt');
  const ladefFields = ['lage', 'auftrag', 'durchfuehrung', 'einsatz', 'fuehrung'];
  const ladefLabels = { lage: 'Lage', auftrag: 'Auftrag', durchfuehrung: 'Durchführung', einsatz: 'Einsatz', fuehrung: 'Führung' };
  ladefFields.forEach(k => lines.push(ladefLabels[k] + ';' + escapeCsv(la[k])));
  lines.push('');

  lines.push('[CHECKLISTE]');
  lines.push('Id;Erledigt');
  Object.keys(ch).sort().forEach(id => lines.push(id + ';' + (ch[id] ? '1' : '0')));

  return lines.join('\r\n');
}

function parseCsvSection(lines, startIdx) {
  const data = {};
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const idx = line.indexOf(';');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).replace(/^"|"$/g, '').replace(/""/g, '"');
      data[key] = val;
    }
  }
  return data;
}

function parseCsvSlotliste(lines, startIdx) {
  const data = {};
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const parts = line.split(';');
    if (parts.length >= 4) {
      const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      const slot = parts[0].trim();
      data[slot] = {
        role: unq(parts[1]),
        name: unq(parts[2]),
        notes: unq(parts.slice(3).join(';'))
      };
    }
  }
  return data;
}

function parseCsvLadef(lines, startIdx) {
  const ladefLabels = { 'Lage': 'lage', 'Auftrag': 'auftrag', 'Durchführung': 'durchfuehrung', 'Durchfuhrung': 'durchfuehrung', 'Einsatz': 'einsatz', 'Führung': 'fuehrung', 'Fuehrung': 'fuehrung' };
  const data = {};
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const idx = line.indexOf(';');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).replace(/^"|"$/g, '').replace(/""/g, '"');
      const k = ladefLabels[key];
      if (k) data[k] = val;
    }
  }
  return data;
}

function parseCsvCheckliste(lines, startIdx) {
  const data = {};
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const idx = line.indexOf(';');
    if (idx > 0) {
      const id = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      data[id] = val === '1' || val === 'true';
    }
  }
  return data;
}

function parseCsvToData(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const data = { event: {}, slotliste: {}, ladef: {}, checkliste: {} };

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '[EVENT]') {
      const d = parseCsvSection(lines, i + 1);
      data.event = { datum: d.Datum || '', uhrzeit: d.Uhrzeit || '', server: d.Server || '' };
    } else if (lines[i] === '[SLOTLISTE]') {
      data.slotliste = parseCsvSlotliste(lines, i);
    } else if (lines[i] === '[LADEF]') {
      data.ladef = parseCsvLadef(lines, i);
    } else if (lines[i] === '[CHECKLISTE]') {
      data.checkliste = parseCsvCheckliste(lines, i);
    }
  }
  return data;
}

/** Lädt alle Daten aus dem CSV-Speicher. Migriert alte JSON-Daten falls nötig. */
function loadFromCsvStorage() {
  let csv = localStorage.getItem(CSV_STORAGE_KEY);
  if (!csv || csv.trim() === '') {
    const ev = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.event) || '{}');
    const sl = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.slotliste) || '{}');
    const la = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.ladef) || '{}');
    if (Object.keys(ev).length || Object.keys(sl).length || Object.keys(la).length) {
      const data = { event: ev, slotliste: sl, ladef: la, checkliste: {} };
      csv = buildCsvFromData(data);
      localStorage.setItem(CSV_STORAGE_KEY, csv);
      [STORAGE_KEYS_LEGACY.event, STORAGE_KEYS_LEGACY.slotliste, STORAGE_KEYS_LEGACY.ladef].forEach(k => localStorage.removeItem(k));
    }
  }
  return csv ? parseCsvToData(csv) : { event: {}, slotliste: {}, ladef: {}, checkliste: {} };
}

/** Speichert alle Daten als CSV im localStorage. */
function saveToCsvStorage(data) {
  const csv = buildCsvFromData(data);
  localStorage.setItem(CSV_STORAGE_KEY, csv);
}

/** Lädt, merged Teil-Daten, speichert. */
function updateCsvStorage(partial) {
  const data = loadFromCsvStorage();
  if (partial.event) Object.assign(data.event, partial.event);
  if (partial.slotliste) Object.assign(data.slotliste, partial.slotliste);
  if (partial.ladef) Object.assign(data.ladef, partial.ladef);
  if (partial.checkliste) Object.assign(data.checkliste, partial.checkliste);
  saveToCsvStorage(data);
}

function exportToCsv() {
  const data = loadFromCsvStorage();
  const csv = buildCsvFromData(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pve-event-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFromCsv(csvText) {
  const data = parseCsvToData(csvText);
  saveToCsvStorage(data);
}

/** Löscht alle gespeicherten Daten. */
function clearAllData() {
  localStorage.removeItem(CSV_STORAGE_KEY);
  Object.values(STORAGE_KEYS_LEGACY).forEach(k => localStorage.removeItem(k));
}
