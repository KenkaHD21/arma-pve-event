/**
 * CSV Export/Import für PVE Event – alle Daten (Event, Slotliste, LADEF)
 */
const STORAGE_KEYS = {
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

function exportToCsv() {
  const event = JSON.parse(localStorage.getItem(STORAGE_KEYS.event) || '{}');
  const slotliste = JSON.parse(localStorage.getItem(STORAGE_KEYS.slotliste) || '{}');
  const ladef = JSON.parse(localStorage.getItem(STORAGE_KEYS.ladef) || '{}');

  const lines = [];

  lines.push('[EVENT]');
  lines.push('Feld;Wert');
  lines.push('Datum;' + escapeCsv(event.datum));
  lines.push('Uhrzeit;' + escapeCsv(event.uhrzeit));
  lines.push('Server;' + escapeCsv(event.server));
  lines.push('');

  lines.push('[SLOTLISTE]');
  lines.push('Slot;Rolle;Name;Bemerkung');
  for (let i = 1; i <= 33; i++) {
    const s = slotliste[i] || {};
    const role = s.role || SLOT_ROLES[i] || '';
    lines.push([i, escapeCsv(role), escapeCsv(s.name), escapeCsv(s.notes)].join(';'));
  }
  lines.push('');

  lines.push('[LADEF]');
  lines.push('Abschnitt;Inhalt');
  const ladefFields = ['lage', 'auftrag', 'durchfuehrung', 'einsatz', 'fuehrung'];
  const ladefLabels = { lage: 'Lage', auftrag: 'Auftrag', durchfuehrung: 'Durchführung', einsatz: 'Einsatz', fuehrung: 'Führung' };
  ladefFields.forEach(k => {
    lines.push(ladefLabels[k] + ';' + escapeCsv(ladef[k]));
  });

  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pve-event-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseCsvSection(lines, startIdx) {
  const data = {};
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const parts = line.split(';');
    if (parts.length >= 2) {
      let val = parts.slice(1).join(';').replace(/^"|"$/g, '').replace(/""/g, '"');
      data[parts[0].trim()] = val;
    }
  }
  return data;
}

function parseCsvSlotliste(lines, startIdx) {
  const data = {};
  const header = lines[startIdx];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const parts = line.split(';');
    if (parts.length >= 4) {
      const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      const slot = parts[0].trim();
      const role = unq(parts[1]);
      const name = unq(parts[2]);
      const notes = unq(parts.slice(3).join(';'));
      data[slot] = { role, name, notes };
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

function importFromCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '[EVENT]') {
      const d = parseCsvSection(lines, i + 1);
      localStorage.setItem(STORAGE_KEYS.event, JSON.stringify({
        datum: d.Datum || '',
        uhrzeit: d.Uhrzeit || '',
        server: d.Server || ''
      }));
    } else if (lines[i] === '[SLOTLISTE]') {
      const d = parseCsvSlotliste(lines, i + 1);
      localStorage.setItem(STORAGE_KEYS.slotliste, JSON.stringify(d));
    } else if (lines[i] === '[LADEF]') {
      const d = parseCsvLadef(lines, i);
      localStorage.setItem(STORAGE_KEYS.ladef, JSON.stringify(d));
    }
  }
}
