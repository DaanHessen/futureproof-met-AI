/**
 * js/app.js
 * Hoofdscript voor het digitaal dagboek.
 * Coördineert gebruikersinteractie, datumselectie, auto-save, vraagrendering,
 * SQLite database inspectie en gebruikersauthenticatie.
 */

import { journalQuestions, moodOptions } from './questions.js';
import { 
  getEntry, 
  saveEntry, 
  hasEntry, 
  getLastNDays, 
  getStatistics, 
  exportToExcel, 
  getSettings, 
  saveSettings,
  apiLogin,
  apiRegister,
  apiLogout,
  checkAuthSession,
  getStoredAuth,
  syncEntriesFromBackend,
  seed5Entries,
  getDatabaseInspection,
  runSqlQuery
} from './storage.js';
import { renderMoodChart } from './mood-chart.js';
import { getDailyQuote } from './quotes.js';

let activeDateStr = getTodayDateString();
let autoSaveTimeout = null;
let currentAuthMode = 'login'; // 'login' | 'register'

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initDateNavigation();
  initQuote();
  initMoodSelector();
  initQuestions();
  initChart();
  initExportAndSettings();
  initAuthModal();
  initDatabaseModal();
  initKeyboardShortcuts();

  // Controleer actieve sessie en synchroniseer
  await checkUserSession();

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
 * Controleer en update de authenticatiestatus van de gebruiker.
 */
async function checkUserSession() {
  const user = await checkAuthSession();
  updateAuthUI(user);
  if (user) {
    await syncEntriesFromBackend();
    loadEntryForDate(activeDateStr);
  }
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('auth-btn');
  const label = document.getElementById('auth-btn-label');
  if (!authBtn || !label) return;

  if (user) {
    label.textContent = user.name || user.email.split('@')[0];
    authBtn.classList.add('is-logged-in');
    authBtn.title = `Ingelogd als ${user.email} (klik om uit te loggen)`;
  } else {
    label.textContent = 'Inloggen';
    authBtn.classList.remove('is-logged-in');
    authBtn.title = 'Inloggen of registreren zonder e-mail';
  }
}

/**
 * Initialiseer de Authenticatie Modal (Slide 15 item 2 & 3)
 */
function initAuthModal() {
  const authBtn = document.getElementById('auth-btn');
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const form = document.getElementById('auth-form');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const nameGroup = document.getElementById('group-auth-name');
  const submitBtn = document.getElementById('auth-submit-btn');
  const msgBox = document.getElementById('auth-message-box');
  const demoBtn = document.getElementById('quick-demo-auth-btn');

  if (authBtn) {
    authBtn.addEventListener('click', async () => {
      const current = getStoredAuth();
      if (current && current.user) {
        if (confirm(`Je bent momenteel ingelogd als ${current.user.email}.\nWil je uitloggen?`)) {
          await apiLogout();
          updateAuthUI(null);
          alert('Je bent succesvol uitgelogd.');
        }
      } else {
        if (modal) modal.classList.add('is-open');
      }
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      currentAuthMode = 'login';
      tabLogin.classList.add('is-active');
      tabRegister.classList.remove('is-active');
      if (nameGroup) nameGroup.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Inloggen';
      hideAuthMessage();
    });

    tabRegister.addEventListener('click', () => {
      currentAuthMode = 'register';
      tabRegister.classList.add('is-active');
      tabLogin.classList.remove('is-active');
      if (nameGroup) nameGroup.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Account Aanmaken';
      hideAuthMessage();
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('auth-email-input');
      const passInput = document.getElementById('auth-password-input');
      const nameInput = document.getElementById('auth-name-input');
      if (emailInput) emailInput.value = 'daan@student.hu.nl';
      if (passInput) passInput.value = 'Futureproof2026!';
      if (nameInput) nameInput.value = 'Daan Hessen';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email-input').value.trim();
      const password = document.getElementById('auth-password-input').value;
      const name = document.getElementById('auth-name-input')?.value.trim();

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verwerken...';
      }

      try {
        let user;
        if (currentAuthMode === 'register') {
          user = await apiRegister(email, password, name);
          showAuthMessage('Account aangemaakt en direct ingelogd zonder verificatie!', 'success');
        } else {
          user = await apiLogin(email, password);
          showAuthMessage('Succesvol ingelogd!', 'success');
        }

        updateAuthUI(user);
        await syncEntriesFromBackend();
        loadEntryForDate(activeDateStr);

        setTimeout(() => {
          if (modal) modal.classList.remove('is-open');
          hideAuthMessage();
        }, 900);
      } catch (err) {
        showAuthMessage(err.message || 'Er is een fout opgetreden', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = currentAuthMode === 'register' ? 'Account Aanmaken' : 'Inloggen';
        }
      }
    });
  }

  function showAuthMessage(text, type) {
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = `auth-message-box ${type}`;
    msgBox.style.display = 'block';
  }

  function hideAuthMessage() {
    if (!msgBox) return;
    msgBox.style.display = 'none';
  }
}

/**
 * Initialiseer de SQLite Database Inspector Modal (Slide 15 item 5 & 6)
 */
function initDatabaseModal() {
  const dbBtn = document.getElementById('db-inspect-btn');
  const footerDbBtn = document.getElementById('footer-db-btn');
  const footerSeedBtn = document.getElementById('footer-seed-btn');
  const modal = document.getElementById('db-modal');
  const closeBtn = document.getElementById('close-db-modal');
  const closeBottomBtn = document.getElementById('close-db-modal-btn');
  const seedBtn = document.getElementById('btn-seed-5-entries');
  const runSqlBtn = document.getElementById('btn-run-sql');
  const tabs = document.querySelectorAll('.db-tab-btn');

  const openModal = async () => {
    if (modal) {
      modal.classList.add('is-open');
      await loadDatabaseInspectionView();
    }
  };

  if (dbBtn) dbBtn.addEventListener('click', openModal);
  if (footerDbBtn) footerDbBtn.addEventListener('click', openModal);

  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  if (closeBottomBtn && modal) closeBottomBtn.addEventListener('click', () => modal.classList.remove('is-open'));

  // Tab switcher
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const targetTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.db-tab-content').forEach(c => c.classList.remove('is-active'));
      const activeContent = document.getElementById(`tab-content-${targetTab}`);
      if (activeContent) activeContent.classList.add('is-active');
    });
  });

  // 5 Entries toevoegen knop (Slide 15 item 4)
  const handleSeed = async () => {
    const success = await seed5Entries();
    if (success) {
      alert('5 voorbeeld-entries zijn succesvol toegevoegd aan SQLite!');
      await loadDatabaseInspectionView();
      loadEntryForDate(activeDateStr);
    }
  };

  if (seedBtn) seedBtn.addEventListener('click', handleSeed);
  if (footerSeedBtn) footerSeedBtn.addEventListener('click', handleSeed);

  // SQL Console uitvoeren
  if (runSqlBtn) {
    runSqlBtn.addEventListener('click', async () => {
      const sqlInput = document.getElementById('sql-query-input');
      const resultsArea = document.getElementById('sql-results-area');
      const query = sqlInput ? sqlInput.value.trim() : '';

      if (!query) return;

      resultsArea.innerHTML = '<div class="sql-empty-hint">Query uitvoeren...</div>';

      const res = await runSqlQuery(query);
      if (res.error) {
        resultsArea.innerHTML = `<div class="auth-message-box error" style="display:block;">Fout: ${escapeHtml(res.error)}</div>`;
        return;
      }

      if (!res.rows || res.rows.length === 0) {
        resultsArea.innerHTML = '<div class="sql-empty-hint">Geen rijen geretourneerd door de query.</div>';
        return;
      }

      const headers = Object.keys(res.rows[0]);
      let tableHtml = `<table class="db-table"><thead><tr>`;
      headers.forEach(h => { tableHtml += `<th>${escapeHtml(h)}</th>`; });
      tableHtml += `</tr></thead><tbody>`;

      res.rows.forEach(r => {
        tableHtml += `<tr>`;
        headers.forEach(h => {
          const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : 'NULL';
          tableHtml += `<td>${escapeHtml(val)}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table>`;
      resultsArea.innerHTML = `<div class="db-table-wrapper">${tableHtml}</div>`;
    });
  }
}

async function loadDatabaseInspectionView() {
  const data = await getDatabaseInspection();
  const entriesTbody = document.getElementById('db-entries-tbody');
  const usersTbody = document.getElementById('db-users-tbody');
  const entriesCount = document.getElementById('db-entries-count');
  const usersCount = document.getElementById('db-users-count');
  const pathLabel = document.getElementById('db-path-label');

  if (pathLabel && data.dbPath) {
    pathLabel.textContent = data.dbPath.split('/').pop() || 'dagboek.sqlite';
  }

  // 1. Vul Entries tabel
  if (entriesTbody) {
    if (!data.entries || data.entries.length === 0) {
      entriesTbody.innerHTML = `<tr><td colspan="7" class="td-empty">Geen entries gevonden in de SQLite database.</td></tr>`;
      if (entriesCount) entriesCount.textContent = '0';
    } else {
      if (entriesCount) entriesCount.textContent = data.entries.length;
      let html = '';
      data.entries.forEach(e => {
        html += `
          <tr>
            <td class="td-id">#${e.id || '-'}</td>
            <td class="td-date">${e.date}</td>
            <td class="td-mood">${e.mood > 0 ? e.mood + ' ★' : '—'}</td>
            <td class="td-text">${escapeHtml(e.yesterday_done || '—')}</td>
            <td class="td-text">${escapeHtml(e.yesterday_learned || '—')}</td>
            <td class="td-text">${escapeHtml(e.today_planned || '—')}</td>
            <td style="font-size: 0.7rem; color: var(--text-muted);">${e.updated_at ? e.updated_at.slice(0, 16) : '—'}</td>
          </tr>
        `;
      });
      entriesTbody.innerHTML = html;
    }
  }

  // 2. Vul Users tabel (Slide 15 item 6: 'kun je jezelf terugvinden')
  if (usersTbody) {
    if (!data.users || data.users.length === 0) {
      usersTbody.innerHTML = `<tr><td colspan="4" class="td-empty">Geen geregistreerde gebruikers.</td></tr>`;
      if (usersCount) usersCount.textContent = '0';
    } else {
      if (usersCount) usersCount.textContent = data.users.length;
      let html = '';
      data.users.forEach(u => {
        const isCurrent = getStoredAuth()?.user?.id === u.id;
        html += `
          <tr style="${isCurrent ? 'background: var(--accent-blue-subtle);' : ''}">
            <td class="td-id">#${u.id}</td>
            <td><strong>${escapeHtml(u.email)}</strong> ${isCurrent ? '<span class="date-badge is-today" style="margin-left: 0.3rem;">Jij</span>' : ''}</td>
            <td>${escapeHtml(u.name || '—')}</td>
            <td style="font-size: 0.72rem; color: var(--text-muted);">${u.created_at ? u.created_at.slice(0, 16) : '—'}</td>
          </tr>
        `;
      });
      usersTbody.innerHTML = html;
    }
  }
}

/**
 * Initialiseer datumnavigatie
 */
function initDateNavigation() {
  const prevBtn = document.getElementById('prev-day-btn');
  const nextBtn = document.getElementById('next-day-btn');
  const todayBtn = document.getElementById('today-btn');
  const datePicker = document.getElementById('journal-date-picker');

  if (prevBtn) prevBtn.addEventListener('click', () => stepDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => stepDate(1));
  if (todayBtn) todayBtn.addEventListener('click', () => selectDate(getTodayDateString()));
  if (datePicker) {
    datePicker.value = activeDateStr;
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) selectDate(e.target.value);
    });
  }

  renderDateStrip();
}

function stepDate(daysOffset) {
  const d = new Date(activeDateStr + 'T12:00:00');
  d.setDate(d.getDate() + daysOffset);
  const nextStr = d.toISOString().split('T')[0];
  selectDate(nextStr);
}

function selectDate(dateStr) {
  if (activeDateStr === dateStr) return;
  flushCurrentEntrySave();
  activeDateStr = dateStr;

  const datePicker = document.getElementById('journal-date-picker');
  if (datePicker) datePicker.value = activeDateStr;

  loadEntryForDate(activeDateStr);
  renderDateStrip();
  updateDateHeading();
}

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

  starsContainer.querySelectorAll('.mood-star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.getAttribute('data-mood-value'));
      const currentEntry = getEntry(activeDateStr);
      const newMood = currentEntry.mood === val ? 0 : val;
      setMoodValue(newMood, true);
    });

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

function loadEntryForDate(dateStr) {
  const entry = getEntry(dateStr);
  setMoodValue(entry.mood || 0, false);

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

function flushCurrentEntrySave() {
  clearTimeout(autoSaveTimeout);

  let activeMood = 0;
  const activeBtn = document.querySelectorAll('.mood-star-btn.is-active');
  if (activeBtn.length > 0) {
    activeMood = activeBtn.length;
  }

  const data = { mood: activeMood };
  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    data[q.id] = textarea ? textarea.value : '';
  });

  const success = saveEntry(activeDateStr, data);
  if (success) {
    const now = new Date();
    updateSaveStatus(`Opgeslagen om ${formatTime(now)} ✓`, 'saved');
  } else {
    updateSaveStatus('Fout bij opslaan', 'error');
  }
}

function triggerAutoSave() {
  updateSaveStatus('Opslaan in SQLite...', 'saving');
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

  loadQuote(false);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadQuote(true);
    });
  }
}

function initChart() {
  renderMoodChart('mood-chart-container', (date) => selectDate(date));
}

function updateHeaderStats() {
  const stats = getStatistics();
  const streakElem = document.getElementById('header-streak-count');
  const totalDaysElem = document.getElementById('header-total-days');

  if (streakElem) streakElem.textContent = stats.currentStreak;
  if (totalDaysElem) totalDaysElem.textContent = stats.totalDays;
}

function initExportAndSettings() {
  const exportHeaderBtn = document.getElementById('export-excel-btn');
  const exportModal = document.getElementById('export-modal');
  const closeExportBtn = document.getElementById('close-export-modal');
  const cancelExportBtn = document.getElementById('cancel-export-modal-btn');
  const confirmXlsxBtn = document.getElementById('confirm-export-xlsx');
  const confirmCsvBtn = document.getElementById('confirm-export-csv');

  if (exportHeaderBtn && exportModal) {
    exportHeaderBtn.addEventListener('click', () => exportModal.classList.add('is-open'));
  }

  if (closeExportBtn && exportModal) {
    closeExportBtn.addEventListener('click', () => exportModal.classList.remove('is-open'));
  }

  if (cancelExportBtn && exportModal) {
    cancelExportBtn.addEventListener('click', () => exportModal.classList.remove('is-open'));
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
  const closeSettingsBottomBtn = document.getElementById('close-settings-modal-btn');
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
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('is-open'));
  }

  if (closeSettingsBottomBtn && settingsModal) {
    closeSettingsBottomBtn.addEventListener('click', () => settingsModal.classList.remove('is-open'));
  }

  if (saveSettingsBtn && settingsModal) {
    saveSettingsBtn.addEventListener('click', () => {
      const keyVal = apiKeyInput ? apiKeyInput.value.trim() : '';
      saveSettings({ geminiApiKey: keyVal });
      settingsModal.classList.remove('is-open');
      alert('Instellingen opgeslagen!');
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.remove('is-open');
    if (e.target === settingsModal) settingsModal.classList.remove('is-open');
    const authModal = document.getElementById('auth-modal');
    if (e.target === authModal) authModal.classList.remove('is-open');
    const dbModal = document.getElementById('db-modal');
    if (e.target === dbModal) dbModal.classList.remove('is-open');
  });
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
