/**
 * js/storage.js
 * Afhandeling van data-persistentie via lokale SQLite database (REST API)
 * met automatische LocalStorage fallback en synchronisatie.
 */

const STORAGE_KEY = 'fp_dagboek_entries_v1';
const SETTINGS_KEY = 'fp_dagboek_settings_v1';
const AUTH_KEY = 'fp_dagboek_auth_v1';
export const SUPABASE_DEFAULT_URL = 'https://peeduaywnjygplzxltzf.supabase.co';
export const SUPABASE_DEFAULT_KEY = 'sb_publishable_weJ_CCPc8r7-8Vu7IFP0nQ_JDBH-K7Q';

let cachedUser = null;
let isOnlineWithBackend = false;
let supabaseInstance = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  if (!window.supabase) return null;

  let url = localStorage.getItem('fp_supabase_url') || SUPABASE_DEFAULT_URL;
  const key = localStorage.getItem('fp_supabase_key') || SUPABASE_DEFAULT_KEY;

  if (!url) return null;
  if (!url.startsWith('http')) {
    url = `https://${url}.supabase.co`;
  }

  try {
    supabaseInstance = window.supabase.createClient(url, key);
    return supabaseInstance;
  } catch (e) {
    console.warn('Supabase client creatiefout:', e);
    return null;
  }
}

export function configureSupabase(url, key) {
  if (url) {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}.supabase.co`;
    localStorage.setItem('fp_supabase_url', cleanUrl);
  }
  if (key) {
    localStorage.setItem('fp_supabase_key', key.trim());
  }
  supabaseInstance = null;
  return getSupabaseClient();
}

/**
 * Haal opgeslagen authenticatiegegevens op.
 */
export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Sla authenticatiegegevens lokaal op.
 */
export function setStoredAuth(authData) {
  if (authData) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    cachedUser = authData.user;
  } else {
    localStorage.removeItem(AUTH_KEY);
    cachedUser = null;
  }
}

/**
 * Registreren van een gebruiker (zonder e-mailbevestiging - Slide 15 item 2 & 3)
 */
export async function apiRegister(email, password, name = '') {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registratie mislukt');

    setStoredAuth({ user: data.user, token: data.token });
    isOnlineWithBackend = true;
    return data.user;
  } catch (err) {
    // Fallback voor pure statische hosting (bijvoorbeeld file://)
    console.warn('Backend registratie niet bereikbaar, lokale fallback geactiveerd:', err.message);
    const mockUser = { id: 1, email, name: name || email.split('@')[0], isLocal: true };
    setStoredAuth({ user: mockUser, token: 'local-token' });
    return mockUser;
  }
}

/**
 * Inloggen van een gebruiker
 */
export async function apiLogin(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Inloggen mislukt');

    setStoredAuth({ user: data.user, token: data.token });
    isOnlineWithBackend = true;
    return data.user;
  } catch (err) {
    console.warn('Backend login niet bereikbaar, lokale fallback geactiveerd:', err.message);
    const mockUser = { id: 1, email, name: email.split('@')[0], isLocal: true };
    setStoredAuth({ user: mockUser, token: 'local-token' });
    return mockUser;
  }
}

/**
 * Uitloggen
 */
export async function apiLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  setStoredAuth(null);
}

/**
 * Controleer de huidige sessie
 */
export async function checkAuthSession() {
  const stored = getStoredAuth();
  if (!stored || !stored.token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${stored.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        cachedUser = data.user;
        isOnlineWithBackend = true;
        return cachedUser;
      }
    }
  } catch (e) {
    // backend offline
  }

  // Blijf ingelogd op basis van localStorage als fallback
  cachedUser = stored.user;
  return cachedUser;
}

/**
 * Haal alle opgeslagen dagboek-entries op (uit LocalStorage en synchroon van SQLite).
 * @returns {Record<string, object>}
 */
export function getAllEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Fout bij ophalen dagboek entries:', err);
    return {};
  }
}

/**
 * Synchroniseer entries vanuit de SQLite backend.
 */
export async function syncEntriesFromBackend() {
  const auth = getStoredAuth();
  if (!auth || !auth.token) return;

  try {
    const res = await fetch('/api/entries', {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        const local = getAllEntries();
        data.entries.forEach(e => {
          local[e.date] = {
            date: e.date,
            mood: e.mood,
            yesterday_done: e.yesterday_done,
            yesterday_learned: e.yesterday_learned,
            today_planned: e.today_planned,
            updatedAt: e.updated_at
          };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
        window.dispatchEvent(new CustomEvent('dagboek:saved', { detail: { synced: true } }));
      }
    }
  } catch (e) {
    // backend offline of op Vercel: haal direct synchroon op van Supabase Cloud
    await fetchEntriesFromSupabase().catch(() => {});
  }
}

/**
 * Haal de entry op voor een specifieke datum (formaat YYYY-MM-DD).
 * @param {string} dateStr 
 * @returns {object}
 */
export function getEntry(dateStr) {
  const entries = getAllEntries();
  if (entries[dateStr]) {
    return { ...entries[dateStr] };
  }
  return {
    date: dateStr,
    mood: 0,
    yesterday_done: '',
    yesterday_learned: '',
    today_planned: '',
    updatedAt: null
  };
}

/**
 * Controleer of er voor een datum al inhoud bestaat.
 */
export function hasEntry(dateStr) {
  const entry = getAllEntries()[dateStr];
  if (!entry) return false;
  return (
    entry.mood > 0 ||
    Boolean(entry.yesterday_done && entry.yesterday_done.trim()) ||
    Boolean(entry.yesterday_learned && entry.yesterday_learned.trim()) ||
    Boolean(entry.today_planned && entry.today_planned.trim())
  );
}

/**
 * Sla een dagboek-entry op voor een specifieke datum.
 * Schrijft naar LocalStorage én stuurt synchroon naar de SQLite database.
 * @param {string} dateStr 
 * @param {object} data 
 */
export function saveEntry(dateStr, data) {
  try {
    const entries = getAllEntries();
    const entryObj = {
      date: dateStr,
      mood: Number(data.mood) || 0,
      yesterday_done: data.yesterday_done || '',
      yesterday_learned: data.yesterday_learned || '',
      today_planned: data.today_planned || '',
      updatedAt: new Date().toISOString()
    };
    entries[dateStr] = entryObj;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    // Stuur asynchroon naar SQLite backend indien ingelogd
    const auth = getStoredAuth();
    if (auth && auth.token) {
      fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(entryObj)
      }).catch(err => {
        console.warn('SQLite opslag op de achtergrond mislukt:', err);
      });
    }

    // Stuur asynchroon naar Supabase Cloud indien geconfigureerd
    syncEntryToSupabase(entryObj).catch(() => {});

    // Trigger UI update
    window.dispatchEvent(new CustomEvent('dagboek:saved', {
      detail: { date: dateStr, entry: entryObj }
    }));
    return true;
  } catch (err) {
    console.error('Fout bij opslaan entry:', err);
    return false;
  }
}

/**
 * Maak 5 nieuwe entries aan conform Slide 15 stap 4.
 */
export async function seed5Entries() {
  const auth = getStoredAuth();
  if (auth && auth.token) {
    try {
      const res = await fetch('/api/db/seed5', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        await syncEntriesFromBackend();
        return true;
      }
    } catch (e) {}
  }

  // Lokale seeding fallback
  const samples = [
    {
      offset: 4,
      mood: 4,
      done: "Introductiecolleges van de minor Futureproof met AI gevolgd.",
      learned: "Begrepen hoe Vibe Coding werkt en hoe je snel kunt prototypen.",
      plan: "Requirements opstellen voor het digitale dagboekje."
    },
    {
      offset: 3,
      mood: 3,
      done: "Eerste prompt geschreven in Google AI Studio voor het dagboekje.",
      learned: "AI werkt beter als je maximaal 5 user stories tegelijk meegeeft.",
      plan: "HTML en JS code testen op mobiel."
    },
    {
      offset: 2,
      mood: 5,
      done: "GitHub repository klaargezet en eerste commit gedaan.",
      learned: "Hoe API keys beveiligd moeten worden met Vercel Environment Variables.",
      plan: "Deployen naar Vercel en spreuk functionaliteit testen."
    },
    {
      offset: 1,
      mood: 4,
      done: "Vercel deploy voltooid, spreuk van de dag getest via Gemini.",
      learned: "Het verschil tussen LocalStorage en een serverloze architectuur.",
      plan: "Lokale SQLite database toevoegen."
    },
    {
      offset: 0,
      mood: 5,
      done: "SQLite tabellen voor users en entries geïntegreerd in het dagboek.",
      learned: "Hoe relationele databases data persistent en gestructureerd bewaren.",
      plan: "10-dagen mood visualisatie analyseren en database inspecteren."
    }
  ];

  const baseDate = new Date();
  const currentEntries = getAllEntries();

  samples.forEach(s => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - s.offset);
    const dateStr = d.toISOString().split('T')[0];
    currentEntries[dateStr] = {
      date: dateStr,
      mood: s.mood,
      yesterday_done: s.done,
      yesterday_learned: s.learned,
      today_planned: s.plan,
      updatedAt: new Date().toISOString()
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentEntries));
  window.dispatchEvent(new CustomEvent('dagboek:saved', { detail: { seeded: true } }));
  return true;
}

/**
 * Inspecteer de database tabellen (Slide 15 item 5 & 6)
 */
export async function getDatabaseInspection() {
  try {
    const res = await fetch('/api/db/inspect');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  // Lokale inspectie fallback als server offline is
  const entriesObj = getAllEntries();
  const entriesArray = Object.keys(entriesObj).map((date, idx) => ({
    id: idx + 1,
    user_id: 1,
    user_email: getStoredAuth()?.user?.email || 'daan@student.hu.nl',
    date,
    ...entriesObj[date]
  }));

  return {
    dbPath: 'Browser SQLite / LocalStorage',
    tables: ['users', 'entries', 'quotes'],
    users: [
      {
        id: 1,
        email: getStoredAuth()?.user?.email || 'daan@student.hu.nl',
        name: getStoredAuth()?.user?.name || 'Daan Hessen',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      }
    ],
    entries: entriesArray
  };
}

/**
 * Voer een SELECT query uit
 */
export async function runSqlQuery(sql) {
  try {
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  // Client-side fallback simulator voor Vercel / offline
  const clean = (sql || '').trim().toLowerCase();
  if (!clean.startsWith('select')) {
    return { error: 'Alleen SELECT queries worden ondersteund in deze console.' };
  }

  if (clean.includes('users')) {
    const auth = getStoredAuth();
    return {
      success: true,
      count: 1,
      rows: [
        {
          id: 1,
          email: auth?.user?.email || 'daan@student.hu.nl',
          name: auth?.user?.name || 'Daan Hessen',
          created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
        }
      ]
    };
  }

  if (clean.includes('entries')) {
    const entries = getAllEntries();
    const rows = Object.keys(entries).map((date, idx) => ({
      id: idx + 1,
      user_id: 1,
      date,
      mood: entries[date].mood || 0,
      yesterday_done: entries[date].yesterday_done || '',
      yesterday_learned: entries[date].yesterday_learned || '',
      today_planned: entries[date].today_planned || ''
    }));
    return {
      success: true,
      count: rows.length,
      rows
    };
  }

  return {
    success: true,
    count: 1,
    rows: [{ info: 'Query uitgevoerd in Vercel browser modus', query: sql }]
  };
}

/**
 * Haal de entries op van de afgelopen N dagen.
 */
export function getLastNDays(count = 10, endDateStr = null) {
  const entries = getAllEntries();
  const result = [];
  const baseDate = endDateStr ? new Date(endDateStr + 'T12:00:00') : new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = entries[dateStr] || null;

    const dayFormatter = new Intl.DateTimeFormat('nl-NL', { weekday: 'short' });
    const dateFormatter = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

    result.push({
      date: dateStr,
      dayName: dayFormatter.format(d),
      formattedDate: dateFormatter.format(d),
      entry: entry && (entry.mood > 0 || entry.yesterday_done || entry.yesterday_learned || entry.today_planned) ? entry : null
    });
  }

  return result;
}

/**
 * Bereken statistieken over alle dagboek-data.
 */
export function getStatistics() {
  const entries = getAllEntries();
  const keys = Object.keys(entries).sort();
  const filledEntries = keys
    .map(k => entries[k])
    .filter(e => e.mood > 0 || e.yesterday_done || e.yesterday_learned || e.today_planned);

  const moods = filledEntries.filter(e => e.mood > 0).map(e => e.mood);
  const avgMood = moods.length > 0 ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : 0;

  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const str = checkDate.toISOString().split('T')[0];
    if (hasEntry(str)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (streak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().split('T')[0];
        if (hasEntry(yesterdayStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  return {
    totalDays: filledEntries.length,
    averageMood: Number(avgMood),
    currentStreak: streak
  };
}

/**
 * Haal gebruikersinstellingen op.
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { geminiApiKey: '', userName: 'Daan' };
  } catch (e) {
    return { geminiApiKey: '', userName: 'Daan' };
  }
}

/**
 * Sla instellingen op in localStorage.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Exporteer alle entries naar Excel (.xlsx) of Nederlandse CSV.
 */
export function exportToExcel(format = 'xlsx') {
  const entries = getAllEntries();
  const sortedDates = Object.keys(entries).sort().reverse();

  if (sortedDates.length === 0) {
    alert('Er zijn nog geen dagboek entries om te exporteren.');
    return;
  }

  const moodLabels = {
    0: 'Niet beoordeeld',
    1: '1 ster - Moeizaam',
    2: '2 sterren - Matig',
    3: '3 sterren - Neutraal',
    4: '4 sterren - Goed',
    5: '5 sterren - Fantastisch'
  };

  const rows = sortedDates.map(dateStr => {
    const e = entries[dateStr];
    const d = new Date(dateStr + 'T12:00:00');
    const dayName = new Intl.DateTimeFormat('nl-NL', { weekday: 'long' }).format(d);
    return {
      Datum: dateStr,
      Weekdag: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      'Gemoedstoestand (1-5)': e.mood > 0 ? e.mood : '',
      'Gemoedstoestand Omschrijving': moodLabels[e.mood] || '',
      'Wat heb ik gisteren gedaan?': e.yesterday_done || '',
      'Wat heb ik van gisteren geleerd?': e.yesterday_learned || '',
      'Wat ga ik vandaag doen?': e.today_planned || '',
      'Laatst bijgewerkt': e.updatedAt ? new Date(e.updatedAt).toLocaleString('nl-NL') : ''
    };
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Dagboek_Futureproof_AI_${todayStr}`;

  if (format === 'xlsx' && window.XLSX) {
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 24 },
      { wch: 45 }, { wch: 45 }, { wch: 45 }, { wch: 20 }
    ];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Dagboek Entries');
    window.XLSX.writeFile(workbook, `${filename}.xlsx`);
  } else {
    downloadCsv(rows, `${filename}.csv`);
  }
}

function downloadCsv(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.map(escapeCsvValue).join(';')];

  rows.forEach(row => {
    const line = headers.map(h => escapeCsvValue(row[h])).join(';');
    csvLines.push(line);
  });

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Synchroniseer een enkele entry naar Supabase Cloud
 */
export async function syncEntryToSupabase(entryObj) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const auth = getStoredAuth();
    const user_email = auth?.user?.email || 'daan@student.hu.nl';

    const { error } = await client
      .from('entries')
      .upsert({
        user_email,
        date: entryObj.date,
        mood: Number(entryObj.mood) || 0,
        yesterday_done: entryObj.yesterday_done || '',
        yesterday_learned: entryObj.yesterday_learned || '',
        today_planned: entryObj.today_planned || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_email,date' });

    if (error) {
      console.warn('Supabase upsert fout:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase netwerkfout:', err);
    return false;
  }
}

/**
 * Haal alle entries op uit Supabase Cloud
 */
export async function fetchEntriesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return { error: 'Supabase client niet geconfigureerd' };

  try {
    const { data, error } = await client
      .from('entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    if (Array.isArray(data)) {
      const local = getAllEntries();
      data.forEach(row => {
        local[row.date] = {
          date: row.date,
          mood: row.mood,
          yesterday_done: row.yesterday_done || '',
          yesterday_learned: row.yesterday_learned || '',
          today_planned: row.today_planned || '',
          updatedAt: row.updated_at
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      window.dispatchEvent(new CustomEvent('dagboek:saved', { detail: { fromSupabase: true } }));
      return { success: true, count: data.length, rows: data };
    }
    return { success: true, count: 0, rows: [] };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Push alle lokale entries in één keer naar Supabase Cloud
 */
export async function pushAllEntriesToSupabase() {
  const client = getSupabaseClient();
  if (!client) return { error: 'Vul eerst je Supabase Project URL in' };

  try {
    const local = getAllEntries();
    const dates = Object.keys(local);
    if (dates.length === 0) return { success: true, count: 0 };

    const auth = getStoredAuth();
    const user_email = auth?.user?.email || 'daan@student.hu.nl';

    const payload = dates.map(date => ({
      user_email,
      date,
      mood: Number(local[date].mood) || 0,
      yesterday_done: local[date].yesterday_done || '',
      yesterday_learned: local[date].yesterday_learned || '',
      today_planned: local[date].today_planned || '',
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await client
      .from('entries')
      .upsert(payload, { onConflict: 'user_email,date' });

    if (error) throw error;
    return { success: true, count: payload.length };
  } catch (err) {
    return { error: err.message };
  }
}
