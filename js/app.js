/**
 * js/app.js
 * Hoofdscript voor het digitaal dagboek.
 * Coördineert gebruikersinteractie, datumselectie, auto-save, vraagrendering en thema.
 */

import { journalQuestions, moodOptions } from './questions.js';
import { 
  getEntry, 
  saveEntry, 
  hasEntry, 
  getAllEntries, 
  getLastNDays, 
  getStatistics, 
  exportToExcel, 
  getSettings, 
  saveSettings 
} from './storage.js';
import { renderMoodChart } from './mood-chart.js';
import { getDailyQuote } from './quotes.js';

// Huidige geselecteerde datum (YYYY-MM-DD)
let activeDateStr = getTodayDateString();
let autoSaveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateNavigation();
  initQuote();
  initMoodSelector();
  initQuestions();
  initChart();
  initExportAndSettings();
  initKeyboardShortcuts();

  // Laad de data voor de actieve datum
  loadEntryForDate(activeDateStr);
  updateHeaderStats();
});

// Luister naar custom opslagevents om overal in de UI synchroon te blijven
window.addEventListener('dagboek:saved', () => {
  renderDateStrip();
  updateHeaderStats();
  renderMoodChart('mood-chart-container', (date) => selectDate(date));
});

/**
 * Hulpfunctie voor vandaag in YYYY-MM-DD formaat volgens lokale tijdzone.
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Initialiseer thema (Light/Dark mode)
 */
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('fp_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('fp_theme', newTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

/**
 * Initialiseer datumnavigatie: pijltjes, date-picker, 'Vandaag' knop en strip.
 */
function initDateNavigation() {
  const prevBtn = document.getElementById('prev-day-btn');
  const nextBtn = document.getElementById('next-day-btn');
  const todayBtn = document.getElementById('today-btn');
  const datePicker = document.getElementById('journal-date-picker');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => stepDate(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => stepDate(1));
  }
  if (todayBtn) {
    todayBtn.addEventListener('click', () => selectDate(getTodayDateString()));
  }
  if (datePicker) {
    datePicker.value = activeDateStr;
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        selectDate(e.target.value);
      }
    });
  }

  renderDateStrip();
}

/**
 * Schakel een aantal dagen vooruit of achteruit.
 */
function stepDate(daysOffset) {
  const d = new Date(activeDateStr + 'T12:00:00');
  d.setDate(d.getDate() + daysOffset);
  const nextStr = d.toISOString().split('T')[0];
  selectDate(nextStr);
}

/**
 * Selecteer een specifieke datum en ververs de UI.
 */
function selectDate(dateStr) {
  if (activeDateStr === dateStr) return;
  
  // Sla eerst eventuele niet-opgeslagen wijzigingen van de huidige dag direct op
  flushCurrentEntrySave();

  activeDateStr = dateStr;

  const datePicker = document.getElementById('journal-date-picker');
  if (datePicker) datePicker.value = activeDateStr;

  loadEntryForDate(activeDateStr);
  renderDateStrip();
  updateDateHeading();
}

/**
 * Werk de datumkop bij met een mooie Nederlandse weergave.
 */
function updateDateHeading() {
  const headingElem = document.getElementById('active-date-heading');
  const badgeElem = document.getElementById('active-date-badge');
  const todayBtn = document.getElementById('today-btn');
  const todayStr = getTodayDateString();

  const d = new Date(activeDateStr + 'T12:00:00');
  const fullFormatter = new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (headingElem) {
    const formatted = fullFormatter.format(d);
    headingElem.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const isToday = activeDateStr === todayStr;
  if (badgeElem) {
    if (isToday) {
      badgeElem.textContent = 'Vandaag';
      badgeElem.className = 'date-badge is-today';
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = activeDateStr === yesterday.toISOString().split('T')[0];
      badgeElem.textContent = isYesterday ? 'Gisteren' : 'Archief';
      badgeElem.className = 'date-badge is-past';
    }
  }

  if (todayBtn) {
    todayBtn.style.display = isToday ? 'none' : 'inline-flex';
  }
}

/**
 * Render de interactieve datumstrip met de afgelopen 7 dagen.
 */
function renderDateStrip() {
  const container = document.getElementById('date-strip-container');
  if (!container) return;

  const days = getLastNDays(7, getTodayDateString());
  const todayStr = getTodayDateString();

  let html = '';
  days.forEach(day => {
    const isSelected = day.date === activeDateStr;
    const isToday = day.date === todayStr;
    const isFilled = hasEntry(day.date);
    const entry = day.entry;
    const moodEmoji = entry && entry.mood > 0 ? moodOptions.find(m => m.value === entry.mood)?.emoji : '';

    html += `
      <button type="button" class="date-chip ${isSelected ? 'is-active' : ''} ${isFilled ? 'is-filled' : ''}" data-date="${day.date}">
        <span class="date-chip-day">${isToday ? 'Vandaag' : day.dayName}</span>
        <span class="date-chip-num">${day.formattedDate}</span>
        <span class="date-chip-status">
          ${moodEmoji ? `<span class="chip-mood">${moodEmoji}</span>` : (isFilled ? '<span class="chip-dot"></span>' : '<span class="chip-empty"></span>')}
        </span>
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.date-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const date = chip.getAttribute('data-date');
      selectDate(date);
    });
  });
}

/**
 * Render de modulaire dagboekvragen dynamisch in de DOM.
 */
function initQuestions() {
  const container = document.getElementById('questions-container');
  if (!container) return;

  let html = '';
  journalQuestions.forEach(q => {
    html += `
      <section class="question-card" id="card-${q.id}">
        <div class="question-card-header">
          <div class="question-meta">
            <span class="question-number">${q.number}</span>
            <span class="question-tag">${q.tag}</span>
          </div>
          <h4 class="question-title">${q.title}</h4>
          <p class="question-subtitle">${q.subtitle}</p>
        </div>
        <div class="question-card-body">
          <textarea 
            id="input-${q.id}" 
            class="journal-textarea" 
            placeholder="${q.placeholder}" 
            rows="${q.rows || 4}"
            data-question-id="${q.id}"
          ></textarea>
        </div>
      </section>
    `;
  });

  container.innerHTML = html;

  // Koppel auto-save listeners aan elk textarea
  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    if (textarea) {
      textarea.addEventListener('input', () => {
        triggerAutoSave();
        adjustTextareaHeight(textarea);
      });
    }
  });
}

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.max(textarea.scrollHeight, 90) + 'px';
}

/**
 * Initialiseer de mood (sterren) selectie.
 */
function initMoodSelector() {
  const starsContainer = document.getElementById('mood-stars-group');
  if (!starsContainer) return;

  let html = '';
  moodOptions.forEach(opt => {
    html += `
      <button 
        type="button" 
        class="mood-star-btn" 
        data-mood-value="${opt.value}"
        title="${opt.stars} sterren: ${opt.label} (${opt.description})"
      >
        <span class="star-icon">★</span>
        <span class="star-val">${opt.value}</span>
      </button>
    `;
  });

  starsContainer.innerHTML = html;

  // Event listeners voor sterren
  starsContainer.querySelectorAll('.mood-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.getAttribute('data-mood-value'));
      const currentEntry = getEntry(activeDateStr);
      // Toggle uit als er al op dezelfde ster wordt geklikt
      const newMood = currentEntry.mood === val ? 0 : val;
      setMoodValue(newMood, true);
    });

    // Hover preview
    btn.addEventListener('mouseenter', () => {
      const val = Number(btn.getAttribute('data-mood-value'));
      previewMoodHighlight(val);
    });
  });

  starsContainer.addEventListener('mouseleave', () => {
    const currentEntry = getEntry(activeDateStr);
    previewMoodHighlight(currentEntry.mood || 0);
  });
}

function previewMoodHighlight(val) {
  const btns = document.querySelectorAll('.mood-star-btn');
  btns.forEach(b => {
    const bVal = Number(b.getAttribute('data-mood-value'));
    if (bVal <= val) {
      b.classList.add('is-hovered');
    } else {
      b.classList.remove('is-hovered');
    }
  });
}

function setMoodValue(val, triggerSave = true) {
  const btns = document.querySelectorAll('.mood-star-btn');
  const labelElem = document.getElementById('mood-status-label');

  btns.forEach(b => {
    const bVal = Number(b.getAttribute('data-mood-value'));
    b.classList.remove('is-hovered');
    if (bVal <= val && val > 0) {
      b.classList.add('is-active');
    } else {
      b.classList.remove('is-active');
    }
  });

  const opt = moodOptions.find(o => o.value === val);
  if (labelElem) {
    if (opt) {
      labelElem.innerHTML = `<span class="mood-badge-emoji">${opt.emoji}</span> <strong>${opt.stars} sterren</strong> — ${opt.label} <span class="mood-subtext">(${opt.description})</span>`;
    } else {
      labelElem.textContent = 'Klik op een ster om je gemoedstoestand aan te geven (1-5)';
    }
  }

  if (triggerSave) {
    flushCurrentEntrySave();
  }
}

/**
 * Laad een entry in de formuliervelden.
 */
function loadEntryForDate(dateStr) {
  const entry = getEntry(dateStr);

  // Vul mood in
  setMoodValue(entry.mood || 0, false);

  // Vul vragen in
  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    if (textarea) {
      textarea.value = entry[q.id] || '';
      adjustTextareaHeight(textarea);
    }
  });

  updateDateHeading();
  updateSaveStatus(entry.updatedAt ? `Laatst opgeslagen om ${formatTime(entry.updatedAt)}` : 'Nog niet opgeslagen voor deze datum');
}

/**
 * Verzamel huidige formulierdata en sla op in localStorage.
 */
function flushCurrentEntrySave() {
  clearTimeout(autoSaveTimeout);

  let activeMood = 0;
  const activeBtn = document.querySelectorAll('.mood-star-btn.is-active');
  if (activeBtn.length > 0) {
    activeMood = activeBtn.length;
  }

  const data = {
    mood: activeMood
  };

  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    data[q.id] = textarea ? textarea.value : '';
  });

  const success = saveEntry(activeDateStr, data);
  if (success) {
    const now = new Date();
    updateSaveStatus(`Opgeslagen om ${formatTime(now)} ✓`, 'saved');
  } else {
    updateSaveStatus('Fout bij opslaan in LocalStorage', 'error');
  }
}

/**
 * Debounced trigger voor auto-save bij typen.
 */
function triggerAutoSave() {
  updateSaveStatus('Opslaan...', 'saving');
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    flushCurrentEntrySave();
  }, 450);
}

function updateSaveStatus(text, stateClass = '') {
  const statusElem = document.getElementById('save-status-pill');
  if (!statusElem) return;

  statusElem.textContent = text;
  statusElem.className = `save-status-pill ${stateClass}`;
}

function formatTime(dateObjOrString) {
  const d = new Date(dateObjOrString);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * AI Spreuk van de Dag integratie.
 */
function initQuote() {
  const quoteText = document.getElementById('daily-quote-text');
  const quoteAuthor = document.getElementById('daily-quote-author');
  const quoteTheme = document.getElementById('daily-quote-theme');
  const refreshBtn = document.getElementById('refresh-quote-btn');

  async function loadQuote(forceNew = false) {
    if (refreshBtn) {
      refreshBtn.classList.add('is-loading');
      refreshBtn.disabled = true;
    }

    try {
      const quote = await getDailyQuote(activeDateStr, forceNew);
      if (quoteText) quoteText.textContent = `“${quote.spreuk}”`;
      if (quoteAuthor) quoteAuthor.textContent = quote.auteur;
      if (quoteTheme) quoteTheme.textContent = quote.thema;
    } catch (err) {
      console.error('Fout bij laden spreuk:', err);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('is-loading');
        refreshBtn.disabled = false;
      }
    }
  }

  // Laad eerste spreuk
  loadQuote(false);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadQuote(true);
    });
  }
}

/**
 * 10-Dagen Mood Chart initialiseren.
 */
function initChart() {
  renderMoodChart('mood-chart-container', (date) => selectDate(date));
}

/**
 * Werk statistieken in de header bij (streak & totaal).
 */
function updateHeaderStats() {
  const stats = getStatistics();
  const streakElem = document.getElementById('header-streak-count');
  const totalDaysElem = document.getElementById('header-total-days');

  if (streakElem) streakElem.textContent = stats.currentStreak;
  if (totalDaysElem) totalDaysElem.textContent = stats.totalDays;
}

/**
 * Export modal en Instellingen modal.
 */
function initExportAndSettings() {
  // Export buttons
  const exportHeaderBtn = document.getElementById('export-excel-btn');
  const exportModal = document.getElementById('export-modal');
  const closeExportBtn = document.getElementById('close-export-modal');
  const confirmXlsxBtn = document.getElementById('confirm-export-xlsx');
  const confirmCsvBtn = document.getElementById('confirm-export-csv');

  if (exportHeaderBtn && exportModal) {
    exportHeaderBtn.addEventListener('click', () => {
      exportModal.classList.add('is-open');
    });
  }

  if (closeExportBtn && exportModal) {
    closeExportBtn.addEventListener('click', () => {
      exportModal.classList.remove('is-open');
    });
  }

  if (confirmXlsxBtn) {
    confirmXlsxBtn.addEventListener('click', () => {
      exportToExcel('xlsx');
      if (exportModal) exportModal.classList.remove('is-open');
    });
  }

  if (confirmCsvBtn) {
    confirmCsvBtn.addEventListener('click', () => {
      exportToExcel('csv');
      if (exportModal) exportModal.classList.remove('is-open');
    });
  }

  // Instellingen modal
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-modal');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const apiKeyInput = document.getElementById('settings-gemini-key');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      const current = getSettings();
      if (apiKeyInput) apiKeyInput.value = current.geminiApiKey || '';
      settingsModal.classList.add('is-open');
    });
  }

  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('is-open');
    });
  }

  if (saveSettingsBtn && settingsModal) {
    saveSettingsBtn.addEventListener('click', () => {
      const keyVal = apiKeyInput ? apiKeyInput.value.trim() : '';
      saveSettings({ geminiApiKey: keyVal });
      settingsModal.classList.remove('is-open');
      alert('Instellingen opgeslagen!');
    });
  }

  // Sluit modals bij klik op backdrop
  window.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.remove('is-open');
    if (e.target === settingsModal) settingsModal.classList.remove('is-open');
  });
}

/**
 * Handige sneltoetsen voor snelle navigatie.
 */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Negeer als gebruiker in een textarea of input typt
    if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === 'ArrowLeft' && e.altKey) {
      stepDate(-1);
    } else if (e.key === 'ArrowRight' && e.altKey) {
      stepDate(1);
    } else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
      selectDate(getTodayDateString());
    }
  });
}
