/**
 * js/storage.js
 * Afhandeling van LocalStorage data, persistentie, statistieken en export naar Excel/CSV.
 */

const STORAGE_KEY = 'fp_dagboek_entries_v1';
const SETTINGS_KEY = 'fp_dagboek_settings_v1';

/**
 * Haal alle opgeslagen dagboek-entries op.
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
 * Controleer of er voor een bepaalde dag al inhoud is ingevuld.
 * @param {string} dateStr 
 * @returns {boolean}
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
 * @param {string} dateStr 
 * @param {object} data 
 */
export function saveEntry(dateStr, data) {
  try {
    const entries = getAllEntries();
    entries[dateStr] = {
      date: dateStr,
      mood: Number(data.mood) || 0,
      yesterday_done: data.yesterday_done || '',
      yesterday_learned: data.yesterday_learned || '',
      today_planned: data.today_planned || '',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    
    // Dispatch custom event zodat chart en UI direct kunnen updaten
    window.dispatchEvent(new CustomEvent('dagboek:saved', {
      detail: { date: dateStr, entry: entries[dateStr] }
    }));
    return true;
  } catch (err) {
    console.error('Fout bij opslaan entry:', err);
    return false;
  }
}

/**
 * Haal de entries op van de afgelopen N dagen (standaard 10 dagen t/m vandaag).
 * @param {number} count 
 * @param {string} [endDateStr] 
 * @returns {Array<{ date: string, formattedDate: string, dayName: string, entry: object|null }>}
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

  // Bereken huidige streak (aaneengesloten dagen)
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const str = checkDate.toISOString().split('T')[0];
    if (hasEntry(str)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Als vandaag nog niet is ingevuld, controleer of gisteren wel is ingevuld
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
    currentStreak: streak,
    moodCounts: {
      1: moods.filter(m => m === 1).length,
      2: moods.filter(m => m === 2).length,
      3: moods.filter(m => m === 3).length,
      4: moods.filter(m => m === 4).length,
      5: moods.filter(m => m === 5).length
    }
  };
}

/**
 * Haal gebruikersinstellingen op (zoals eigen Gemini API key).
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
 * Exporteer alle entries naar Excel (.xlsx) of Nederlandse CSV (met ';').
 * @param {'xlsx' | 'csv'} format 
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

  // Gebruik SheetJS indien beschikbaar in window
  if (format === 'xlsx' && window.XLSX) {
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    
    // Stel kolombreedtes in voor nette opmaak
    worksheet['!cols'] = [
      { wch: 12 }, // Datum
      { wch: 14 }, // Weekdag
      { wch: 8 },  // Gemoedstoestand cijfer
      { wch: 24 }, // Gemoedstoestand label
      { wch: 45 }, // Gisteren gedaan
      { wch: 45 }, // Gisteren geleerd
      { wch: 45 }, // Vandaag doen
      { wch: 20 }  // Laatst bijgewerkt
    ];

    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Dagboek Entries');
    window.XLSX.writeFile(workbook, `${filename}.xlsx`);
  } else {
    // Val terug op een Excel-geoptimaliseerde CSV met UTF-8 BOM en puntkomma (NL Excel standaard)
    downloadCsv(rows, `${filename}.csv`);
  }
}

/**
 * Download als CSV met UTF-8 BOM zodat Excel op Windows/Mac direct accenten herkent.
 */
function downloadCsv(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(escapeCsvValue).join(';')
  ];

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
