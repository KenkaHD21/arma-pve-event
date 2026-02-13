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
  lines.push('Zeitzone;' + escapeCsv(ev.zeitzone));
  lines.push('Server;' + escapeCsv(ev.server));
  lines.push('Passwort;' + escapeCsv(ev.passwort));
  lines.push('Beschreibung;' + escapeCsv(ev.beschreibung));
  lines.push('Kontakt;' + escapeCsv(ev.kontakt));
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

  const customItems = data.checklisteCustom || [];
  customItems.forEach(it => { if (!(it.id in ch)) ch[it.id] = it.checked; });
  lines.push('[CHECKLISTE]');
  lines.push('Id;Erledigt');
  Object.keys(ch).sort().forEach(id => lines.push(id + ';' + (ch[id] ? '1' : '0')));
  if (customItems.length) {
    lines.push('[CHECKLISTE_CUSTOM]');
    lines.push('Id;Text;Erledigt');
    customItems.forEach(it => lines.push(escapeCsv(it.id) + ';' + escapeCsv(it.text) + ';' + (ch[it.id] ? '1' : '0')));
  }
  lines.push('');

  const funk = (data.funk && data.funk.length) ? data.funk : DEFAULT_FUNK;
  if (funk.length) {
    lines.push('[FUNK]');
    lines.push('Netz;Primär;Ausweich;Teilnehmer');
    funk.forEach(r => lines.push([escapeCsv(r.netz), escapeCsv(r.primaer), escapeCsv(r.ausweich), escapeCsv(r.teilnehmer)].join(';')));
    lines.push('');
  }

  const mods = (data.mods && data.mods.length) ? data.mods : DEFAULT_MODS;
  if (mods.length) {
    lines.push('[MODS]');
    lines.push('Mod;Kategorie');
    mods.forEach(r => lines.push(escapeCsv(r.name) + ';' + escapeCsv(r.kategorie)));
    lines.push('');
  }

  const brevity = data.brevity || [];
  if (brevity.length) {
    lines.push('[BREVITY]');
    lines.push('Code;Bedeutung');
    brevity.forEach(r => lines.push(escapeCsv(r.code) + ';' + escapeCsv(r.bedeutung)));
    lines.push('');
  }

  if (data.respawn) {
    lines.push('[RESPAWN]');
    lines.push('Feld;Wert');
    lines.push('Regeln;' + escapeCsv(data.respawn));
    lines.push('');
  }

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
      const val = line.substring(idx + 1).split(';')[0].trim();
      data[id] = val === '1' || val === 'true';
    }
  }
  return data;
}

function parseCsvChecklisteCustom(lines, startIdx) {
  const items = [];
  const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const p = line.split(';');
    if (p.length >= 3) {
      const id = unq(p[0]);
      const text = unq(p.slice(1, -1).join(';'));
      const checked = (p[p.length - 1] || '').trim() === '1';
      items.push({ id, text, checked });
    }
  }
  return items;
}

function parseCsvToData(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const data = { event: {}, slotliste: {}, ladef: {}, checkliste: {}, checklisteCustom: [], funk: [], mods: [], brevity: [], respawn: '' };

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '[EVENT]') {
      const d = parseCsvSection(lines, i + 1);
      data.event = {
        datum: d.Datum || '', uhrzeit: d.Uhrzeit || '', zeitzone: d.Zeitzone || 'MEZ',
        server: d.Server || '', passwort: d.Passwort || '', beschreibung: d.Beschreibung || '', kontakt: d.Kontakt || ''
      };
    } else if (lines[i] === '[SLOTLISTE]') {
      data.slotliste = parseCsvSlotliste(lines, i);
    } else if (lines[i] === '[LADEF]') {
      data.ladef = parseCsvLadef(lines, i);
    } else if (lines[i] === '[CHECKLISTE]') {
      data.checkliste = parseCsvCheckliste(lines, i);
    } else if (lines[i] === '[CHECKLISTE_CUSTOM]') {
      const custom = parseCsvChecklisteCustom(lines, i);
      data.checklisteCustom = custom;
      custom.forEach(it => { data.checkliste[it.id] = it.checked; });
    } else if (lines[i] === '[FUNK]') {
      data.funk = parseCsvFunk(lines, i);
    } else if (lines[i] === '[MODS]') {
      data.mods = parseCsvMods(lines, i);
    } else if (lines[i] === '[BREVITY]') {
      data.brevity = parseCsvBrevity(lines, i);
    } else if (lines[i] === '[RESPAWN]') {
      const d = parseCsvSection(lines, i + 1);
      data.respawn = d.Regeln || '';
    }
  }
  return data;
}

function parseCsvFunk(lines, startIdx) {
  const rows = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const p = line.split(';');
    if (p.length >= 4) {
      const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      rows.push({ netz: unq(p[0]), primaer: unq(p[1]), ausweich: unq(p[2]), teilnehmer: unq(p.slice(3).join(';')) });
    }
  }
  return rows;
}

function parseCsvMods(lines, startIdx) {
  const rows = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const idx = line.indexOf(';');
    if (idx > 0) {
      const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      rows.push({ name: unq(line.substring(0, idx)), kategorie: unq(line.substring(idx + 1)) });
    }
  }
  return rows;
}

function parseCsvBrevity(lines, startIdx) {
  const rows = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[')) break;
    const idx = line.indexOf(';');
    if (idx > 0) {
      const unq = s => (s || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      rows.push({ code: unq(line.substring(0, idx)), bedeutung: unq(line.substring(idx + 1)) });
    }
  }
  return rows;
}

const DEFAULT_FUNK = [
  { netz: 'Command (PL + SLs)', primaer: '40.0', ausweich: '36.0', teilnehmer: 'Nur PL + alle Gruppenführer (SLs)' },
  { netz: 'JTAC', primaer: '44.0', ausweich: '42.0', teilnehmer: 'JTAC, PL, ggf. Luftunterstützung' },
  { netz: 'Squad 1 (Alpha)', primaer: '48.0', ausweich: '52.0', teilnehmer: 'SL1, FTL-A, FTL-B, Medic, Mannschaft' },
  { netz: 'Squad 2 (Bravo)', primaer: '54.0', ausweich: '58.0', teilnehmer: 'SL2, FTL-A, FTL-B, Medic, Mannschaft' },
  { netz: 'Squad 3 (Charlie)', primaer: '60.0', ausweich: '64.0', teilnehmer: 'SL3, FTL-A, FTL-B, Medic, Mannschaft' },
  { netz: 'Squad 4 (Delta)', primaer: '66.0', ausweich: '68.0', teilnehmer: 'SL4, FTL-A, FTL-B, Medic, Mannschaft' }
];

const DEFAULT_BREVITY = [
  { code: 'Contact', bedeutung: 'Feindkontakt' },
  { code: 'Moving', bedeutung: 'In Bewegung' },
  { code: 'In Position', bedeutung: 'Am Zielort' },
  { code: 'Roger / Wilco', bedeutung: 'Verstanden / Wird ausgeführt' },
  { code: 'Say Again', bedeutung: 'Wiederholen' },
  { code: 'Break, Break', bedeutung: 'Wichtige Unterbrechung' },
  { code: 'Over', bedeutung: 'Ende meiner Meldung, Antwort erwartet' },
  { code: 'Out', bedeutung: 'Ende, keine Antwort nötig' }
];

const MOD_KATEGORIEN = [
  { id: 'ace', label: 'ACE' },
  { id: 'wcs', label: 'WCS' },
  { id: 'rhs', label: 'RHS' },
  { id: 'grs', label: 'GRS' },
  { id: 'waffen', label: 'Waffen & Ausrüstung' },
  { id: 'fahrzeuge', label: 'Fahrzeuge & Luftfahrt' },
  { id: 'kleidung', label: 'Kleidung & Charaktere' },
  { id: 'gameplay', label: 'Gameplay & UI' },
  { id: 'weitere', label: 'Weitere Mods' }
];

const DEFAULT_MODS = [
  { name: 'ACE Core Dev', kategorie: 'ace' }, { name: 'ACE Radio Dev', kategorie: 'ace' }, { name: 'ACE Medical Core Dev', kategorie: 'ace' },
  { name: 'ACE Medical Hitzones Dev', kategorie: 'ace' }, { name: 'ACE Medical Circulation Dev', kategorie: 'ace' }, { name: 'ACE Carrying Dev', kategorie: 'ace' },
  { name: 'ACE Explosives Dev', kategorie: 'ace' }, { name: 'ACE Magazine Repack Dev', kategorie: 'ace' }, { name: 'ACE Tactical Ladder Dev', kategorie: 'ace' },
  { name: 'ACE Tactical Periscope Dev', kategorie: 'ace' }, { name: 'ACE Trenches Dev', kategorie: 'ace' }, { name: 'ACE Chopping Dev', kategorie: 'ace' },
  { name: 'ACE Finger Dev', kategorie: 'ace' },
  { name: 'WCS_Core', kategorie: 'wcs' }, { name: 'WCS_Weapons', kategorie: 'wcs' }, { name: 'WCS_RHS_Weapons', kategorie: 'wcs' },
  { name: 'WCS_Attachments', kategorie: 'wcs' }, { name: 'WCS_Scopes', kategorie: 'wcs' }, { name: 'WCS_Sounds', kategorie: 'wcs' },
  { name: 'WCS_Settings', kategorie: 'wcs' }, { name: 'WCS_LoadoutEditor', kategorie: 'wcs' }, { name: 'WCS_SpawnProtection', kategorie: 'wcs' },
  { name: 'WCS_Armaments', kategorie: 'wcs' }, { name: 'WCS_RU', kategorie: 'wcs' }, { name: 'WCS_Earplugs', kategorie: 'wcs' },
  { name: 'WCS_AH-64D', kategorie: 'wcs' }, { name: 'WCS_AH-64D_Upgrade', kategorie: 'wcs' }, { name: 'WCS_AH-6M', kategorie: 'wcs' },
  { name: 'WCS_ZU-23-2', kategorie: 'wcs' }, { name: 'NH90 TTH Caiman WCS', kategorie: 'wcs' },
  { name: 'RHS - Content Pack 01', kategorie: 'rhs' }, { name: 'RHS - Content Pack 02', kategorie: 'rhs' }, { name: 'RHS - Germany Extras MrWW', kategorie: 'rhs' },
  { name: 'GRS - Patches', kategorie: 'grs' }, { name: 'GRS - Modular Vests & Rigs', kategorie: 'grs' }, { name: 'GRS - USSR', kategorie: 'grs' },
  { name: 'GRS - Apparel', kategorie: 'grs' }, { name: 'GRS - Belts & Bags & Droplegs', kategorie: 'grs' }, { name: 'GRS - Germany CLOTHING MrWW', kategorie: 'grs' },
  { name: 'GRS - Dev Framework', kategorie: 'grs' },
  { name: 'ARMA-RY CORE', kategorie: 'waffen' }, { name: 'ARMA-RY G3 BATTLE RIFLES', kategorie: 'waffen' }, { name: 'ARMA-RY G3 SPECIAL RIFLES', kategorie: 'waffen' },
  { name: 'Nasty OSV-96', kategorie: 'waffen' }, { name: 'M110 DMR', kategorie: 'waffen' }, { name: 'MG3 with RIS rail', kategorie: 'waffen' },
  { name: 'M17 Pistol', kategorie: 'waffen' }, { name: 'SVU-AS', kategorie: 'waffen' }, { name: 'Tonic AA12', kategorie: 'waffen' },
  { name: 'Spanish Armory', kategorie: 'waffen' }, { name: 'RIS Laser Attachments', kategorie: 'waffen' }, { name: 'Rayzis Optics', kategorie: 'waffen' },
  { name: 'Attachment Framework', kategorie: 'waffen' }, { name: 'Bacon Suppressors', kategorie: 'waffen' }, { name: 'Advanced Zeroing System', kategorie: 'waffen' },
  { name: 'PZG H-47 GER Reskin', kategorie: 'fahrzeuge' }, { name: 'NH-90 Ramp-Fix', kategorie: 'fahrzeuge' }, { name: '50 Cal Door Gunner', kategorie: 'fahrzeuge' },
  { name: 'AHC Fuel Systems', kategorie: 'fahrzeuge' }, { name: 'Realistic Combat Drones', kategorie: 'fahrzeuge' },
  { name: 'Zeliks Character', kategorie: 'kleidung' }, { name: 'Naughty Boys Balaclavas V2', kategorie: 'kleidung' }, { name: 'Russian SSO Leaf Suits', kategorie: 'kleidung' },
  { name: 'Unn Ghillie', kategorie: 'kleidung' }, { name: 'Gorka 4', kategorie: 'kleidung' }, { name: 'FORTEX Gear Core', kategorie: 'kleidung' },
  { name: 'Country Flag Patches', kategorie: 'kleidung' }, { name: 'EDL SquadPatches', kategorie: 'kleidung' }, { name: 'Z.E.R.G. Patch', kategorie: 'kleidung' },
  { name: 'PTH_UI', kategorie: 'gameplay' }, { name: 'PTH Event Arsenal 3.0', kategorie: 'gameplay' }, { name: 'PTH Testing_Training_2', kategorie: 'gameplay' },
  { name: 'MinUi', kategorie: 'gameplay' }, { name: 'TS Better Markers', kategorie: 'gameplay' }, { name: 'Map Drawing', kategorie: 'gameplay' },
  { name: 'Bacon Loadout Editor', kategorie: 'gameplay' }, { name: 'Disable Enemy Proximity VON UI', kategorie: 'gameplay' },
  { name: 'CRX Enfusion A.I.', kategorie: 'weitere' }, { name: 'GM Trenches', kategorie: 'weitere' }, { name: 'Bacon Parachute', kategorie: 'weitere' },
  { name: 'BetterSounds Voice overhaul', kategorie: 'weitere' }, { name: 'Night Vision System', kategorie: 'weitere' }, { name: 'Improved Blood Effect', kategorie: 'weitere' },
  { name: 'BetterMuzzleFlash', kategorie: 'weitere' }, { name: 'Fastroping', kategorie: 'weitere' }, { name: 'Wirecutters 2', kategorie: 'weitere' },
  { name: 'Shoot Houses BETA', kategorie: 'weitere' }, { name: 'Vehicle and Corpse Despawn', kategorie: 'weitere' }, { name: 'improved reforger ragdolls', kategorie: 'weitere' },
  { name: 'Realism Overhaul - Recoil', kategorie: 'weitere' }, { name: 'Better Weapon Immersion 2.8', kategorie: 'weitere' },
  { name: 'TacticalAnimationOverhaul TEST', kategorie: 'weitere' }, { name: 'Bon Action Animations', kategorie: 'weitere' },
  { name: 'ADSSway - Core', kategorie: 'weitere' }, { name: 'ADSSway - MG3 RIS', kategorie: 'weitere' }, { name: 'ADSSway - ARMA-RY G3 Rifles', kategorie: 'weitere' },
  { name: 'ADSSway - PIP DOF - TEST', kategorie: 'weitere' }, { name: 'BWI - ADSsway-RHS-TAO compat', kategorie: 'weitere' },
  { name: 'Aiming Deadzone', kategorie: 'weitere' }, { name: 'UHC FOV', kategorie: 'weitere' }, { name: '420s Keep weapons on uncon', kategorie: 'weitere' },
  { name: '420s Tweaks', kategorie: 'weitere' }, { name: 'DA_Tweaks', kategorie: 'weitere' }, { name: 'Lunacy Overdrive', kategorie: 'weitere' },
  { name: 'War Tapes Incursion', kategorie: 'weitere' }, { name: 'Bumsos_Banner', kategorie: 'weitere' }, { name: 'SpaceCore', kategorie: 'weitere' },
  { name: 'AKI_Core_Upgrade', kategorie: 'weitere' }, { name: 'Server Admin Tools', kategorie: 'weitere' }, { name: 'WZ Turrets', kategorie: 'weitere' }
];

/** Lädt alle Daten aus dem CSV-Speicher. Migriert alte JSON-Daten falls nötig. */
function loadFromCsvStorage() {
  let csv = localStorage.getItem(CSV_STORAGE_KEY);
  if (!csv || csv.trim() === '') {
    const ev = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.event) || '{}');
    const sl = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.slotliste) || '{}');
    const la = JSON.parse(localStorage.getItem(STORAGE_KEYS_LEGACY.ladef) || '{}');
    if (Object.keys(ev).length || Object.keys(sl).length || Object.keys(la).length) {
      const data = {
        event: Object.assign({ zeitzone: 'MEZ', passwort: '', beschreibung: '', kontakt: '' }, ev),
        slotliste: sl, ladef: la, checkliste: {}, funk: [], mods: [], brevity: [], respawn: ''
      };
      csv = buildCsvFromData(data);
      localStorage.setItem(CSV_STORAGE_KEY, csv);
      [STORAGE_KEYS_LEGACY.event, STORAGE_KEYS_LEGACY.slotliste, STORAGE_KEYS_LEGACY.ladef].forEach(k => localStorage.removeItem(k));
    }
  }
  const def = { event: {}, slotliste: {}, ladef: {}, checkliste: {}, checklisteCustom: [], funk: [], mods: [], brevity: [], respawn: '' };
  return csv ? Object.assign(def, parseCsvToData(csv)) : def;
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
  if (partial.checklisteCustom !== undefined) data.checklisteCustom = partial.checklisteCustom;
  if (partial.funk !== undefined) data.funk = partial.funk;
  if (partial.mods !== undefined) data.mods = partial.mods;
  if (partial.brevity !== undefined) data.brevity = partial.brevity;
  if (partial.respawn !== undefined) data.respawn = partial.respawn;
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
