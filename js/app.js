/**
 * js/app.js
 * Hoofdscript voor het digitaal dagboek.
 * Snelle, rustige interactie, direct schakelende spreuken en volledige viewport layout.
 */

import { journalQuestions, moodOptions } from './questions.js';
import { 
  getEntry, 
  saveEntry, 
  hasEntry, 
  getLastNDays, 
  getStatistics, 
  exportToExcel, 
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
let currentAuthMode = 'login';

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initDateNavigation();
  initQuote();
  initMoodSelector();
  initQuestions();
  initChart();
  initExport();
  initAuthModal();
  initDatabaseModal();
  initKeyboardShortcuts();

  await checkUserSession();
  loadEntryForDate(activeDateStr);
  updateHeaderStats();
});

window.addEventListener('dagboek:saved', () => {
  renderSidebarDaysList();
  updateHeaderStats();
  renderMoodChart('sidebar-mood-chart', (date) => selectDate(date));
});

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const saved = localStorage.getItem('fp_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = saved || (prefersDark ? 'dark' : 'light');

  applyTheme(current);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('fp_theme', next);
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

async function checkUserSession() {
  const user = await checkAuthSession();
  updateAuthUI(user);
  if (user) {
    await syncEntriesFromBackend();
    loadEntryForDate(activeDateStr);
  }
}

function updateAuthUI(user) {
  const label = document.getElementById('auth-btn-label');
  if (!label) return;
  label.textContent = user ? (user.name || user.email.split('@')[0]) : 'Inloggen / Registreren';
}

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

  renderSidebarDaysList();
}

function stepDate(daysOffset) {
  const d = new Date(activeDateStr + 'T12:00:00');
  d.setDate(d.getDate() + daysOffset);
  selectDate(d.toISOString().split('T')[0]);
}

function selectDate(dateStr) {
  if (activeDateStr === dateStr) return;
  flushCurrentEntrySave();
  activeDateStr = dateStr;

  const datePicker = document.getElementById('journal-date-picker');
  if (datePicker) datePicker.value = activeDateStr;

  loadEntryForDate(activeDateStr);
  renderSidebarDaysList();
  updateDateHeading();

  // Update ook de quote voor die dag
  const quote = getDailyQuote(activeDateStr, false);
  const quoteText = document.getElementById('daily-quote-text');
  const quoteAuthor = document.getElementById('daily-quote-author');
  if (quoteText && quote) quoteText.textContent = `“${quote.spreuk}”`;
  if (quoteAuthor && quote) quoteAuthor.textContent = `— ${quote.auteur}`;
}

function updateDateHeading() {
  const headingElem = document.getElementById('active-date-heading');
  const badgeElem = document.getElementById('active-date-badge');
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
    badgeElem.textContent = isToday ? 'Vandaag' : 'Archief';
    badgeElem.className = isToday ? 'date-badge is-today' : 'date-badge';
  }
}

function renderSidebarDaysList() {
  const list = document.getElementById('sidebar-days-list');
  if (!list) return;

  const days = getLastNDays(14, getTodayDateString());
  const todayStr = getTodayDateString();

  let html = '';
  days.forEach(day => {
    const isSelected = day.date === activeDateStr;
    const isToday = day.date === todayStr;
    const isFilled = hasEntry(day.date);
    const entry = day.entry;
    const moodEmoji = entry && entry.mood > 0 ? moodOptions.find(m => m.value === entry.mood)?.emoji : '';

    html += `
      <button type="button" class="sidebar-day-item ${isSelected ? 'is-active' : ''}" data-date="${day.date}">
        <div class="day-item-left">
          <span class="day-item-name">${isToday ? 'Vandaag' : day.dayName}</span>
          <span class="day-item-date">${day.formattedDate}</span>
        </div>
        <div class="day-item-mood">
          ${moodEmoji ? `<span>${moodEmoji}</span>` : (isFilled ? '<span class="day-item-empty-dot" style="background:var(--accent-blue);"></span>' : '<span class="day-item-empty-dot"></span>')}
        </div>
      </button>
    `;
  });

  list.innerHTML = html;

  list.querySelectorAll('.sidebar-day-item').forEach(item => {
    item.addEventListener('click', () => {
      selectDate(item.getAttribute('data-date'));
    });
  });
}

function initQuestions() {
  const container = document.getElementById('questions-container');
  if (!container) return;

  let html = '';
  journalQuestions.forEach(q => {
    html += `
      <div class="prompt-card">
        <label for="input-${q.id}" class="prompt-title">${q.title}</label>
        <textarea 
          id="input-${q.id}" 
          class="prompt-textarea" 
          placeholder="${q.placeholder}" 
          rows="${q.rows || 4}"
        ></textarea>
      </div>
    `;
  });

  container.innerHTML = html;

  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    if (textarea) {
      textarea.addEventListener('input', () => {
        triggerAutoSave();
        adjustHeight(textarea);
      });
    }
  });
}

function adjustHeight(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight, 100) + 'px';
}

function initMoodSelector() {
  const group = document.getElementById('mood-stars-group');
  if (!group) return;

  let html = '';
  moodOptions.forEach(opt => {
    html += `
      <button type="button" class="star-btn" data-value="${opt.value}" title="${opt.stars} sterren: ${opt.label}">
        ★
      </button>
    `;
  });

  group.innerHTML = html;

  group.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.getAttribute('data-value'));
      const curr = getEntry(activeDateStr);
      const nextMood = curr.mood === val ? 0 : val;
      setMood(nextMood, true);
    });

    btn.addEventListener('mouseenter', () => {
      previewStars(Number(btn.getAttribute('data-value')));
    });
  });

  group.addEventListener('mouseleave', () => {
    const curr = getEntry(activeDateStr);
    previewStars(curr.mood || 0);
  });
}

function previewStars(val) {
  document.querySelectorAll('.star-btn').forEach(b => {
    const bVal = Number(b.getAttribute('data-value'));
    if (bVal <= val) {
      b.classList.add('is-hovered');
    } else {
      b.classList.remove('is-hovered');
    }
  });
}

function setMood(val, triggerSave = true) {
  const btns = document.querySelectorAll('.star-btn');
  const label = document.getElementById('mood-status-label');

  btns.forEach(b => {
    const bVal = Number(b.getAttribute('data-value'));
    b.classList.remove('is-hovered');
    if (bVal <= val && val > 0) {
      b.classList.add('is-active');
    } else {
      b.classList.remove('is-active');
    }
  });

  const opt = moodOptions.find(o => o.value === val);
  if (label) {
    label.textContent = opt ? `${opt.emoji} ${opt.stars} sterren — ${opt.label}` : 'Kies een score (1 tot 5)';
  }

  if (triggerSave) {
    flushCurrentEntrySave();
  }
}

function loadEntryForDate(dateStr) {
  const entry = getEntry(dateStr);
  setMood(entry.mood || 0, false);

  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    if (textarea) {
      textarea.value = entry[q.id] || '';
      adjustHeight(textarea);
    }
  });

  updateDateHeading();
  updateSaveStatus(entry.updatedAt ? 'Opgeslagen' : 'Nieuw');
}

function flushCurrentEntrySave() {
  clearTimeout(autoSaveTimeout);

  const activeStars = document.querySelectorAll('.star-btn.is-active');
  const data = { mood: activeStars.length };

  journalQuestions.forEach(q => {
    const textarea = document.getElementById(`input-${q.id}`);
    data[q.id] = textarea ? textarea.value : '';
  });

  const success = saveEntry(activeDateStr, data);
  if (success) {
    updateSaveStatus('Opgeslagen ✓', 'saved');
  }
}

function triggerAutoSave() {
  updateSaveStatus('Opslaan...');
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    flushCurrentEntrySave();
  }, 400);
}

function updateSaveStatus(text, cls = '') {
  const el = document.getElementById('save-status-pill');
  if (el) {
    el.textContent = text;
    el.className = `save-pill ${cls}`;
  }
}

/**
 * AI Spreuk integratie: DIRECTE verversing op klik (geen timeout of vertraging!)
 */
function initQuote() {
  const quoteText = document.getElementById('daily-quote-text');
  const quoteAuthor = document.getElementById('daily-quote-author');
  const refreshBtn = document.getElementById('refresh-quote-btn');

  function render(q) {
    if (!q) return;
    if (quoteText) quoteText.textContent = `“${q.spreuk}”`;
    if (quoteAuthor) quoteAuthor.textContent = `— ${q.auteur}`;
  }

  // Toon initiële quote
  render(getDailyQuote(activeDateStr, false));

  // Directe switch naar volgende spreuk bij klik
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const next = getDailyQuote(activeDateStr, true);
      render(next);
    });
  }

  window.addEventListener('dagboek:quote-updated', (e) => {
    render(e.detail);
  });
}

function initChart() {
  renderMoodChart('sidebar-mood-chart', (date) => selectDate(date));
}

function updateHeaderStats() {
  const stats = getStatistics();
  const streakEl = document.getElementById('header-streak-count');
  if (streakEl) streakEl.textContent = stats.currentStreak;
}

function initExport() {
  const btn = document.getElementById('export-excel-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      exportToExcel('xlsx');
    });
  }
}

function initAuthModal() {
  const btn = document.getElementById('auth-btn');
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const form = document.getElementById('auth-form');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const nameGroup = document.getElementById('group-auth-name');
  const submitBtn = document.getElementById('auth-submit-btn');
  const demoBtn = document.getElementById('quick-demo-auth-btn');

  if (btn) {
    btn.addEventListener('click', () => {
      const current = getStoredAuth();
      if (current && current.user) {
        if (confirm(`Ingelogd als ${current.user.email}.\nWil je uitloggen?`)) {
          apiLogout();
          updateAuthUI(null);
        }
      } else {
        if (modal) modal.classList.add('is-open');
      }
    });
  }

  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      currentAuthMode = 'login';
      tabLogin.classList.add('is-active');
      tabRegister.classList.remove('is-active');
      if (nameGroup) nameGroup.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Inloggen';
    });

    tabRegister.addEventListener('click', () => {
      currentAuthMode = 'register';
      tabRegister.classList.add('is-active');
      tabLogin.classList.remove('is-active');
      if (nameGroup) nameGroup.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Registreren';
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      document.getElementById('auth-email-input').value = 'daan@student.hu.nl';
      document.getElementById('auth-password-input').value = 'Futureproof2026!';
      document.getElementById('auth-name-input').value = 'Daan Hessen';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email-input').value.trim();
      const password = document.getElementById('auth-password-input').value;
      const name = document.getElementById('auth-name-input')?.value.trim();

      try {
        let user;
        if (currentAuthMode === 'register') {
          user = await apiRegister(email, password, name);
        } else {
          user = await apiLogin(email, password);
        }
        updateAuthUI(user);
        await syncEntriesFromBackend();
        loadEntryForDate(activeDateStr);
        if (modal) modal.classList.remove('is-open');
      } catch (err) {
        alert(err.message || 'Inloggen mislukt');
      }
    });
  }
}

function initDatabaseModal() {
  const btn = document.getElementById('db-inspect-btn');
  const modal = document.getElementById('db-modal');
  const closeBtn = document.getElementById('close-db-modal');
  const closeBottom = document.getElementById('close-db-modal-btn');
  const seedBtn = document.getElementById('btn-seed-5-entries');
  const runSqlBtn = document.getElementById('btn-run-sql');
  const tabs = document.querySelectorAll('.db-tab');

  const open = async () => {
    if (modal) {
      modal.classList.add('is-open');
      await loadDbInspection();
    }
  };

  if (btn) btn.addEventListener('click', open);
  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
  if (closeBottom && modal) closeBottom.addEventListener('click', () => modal.classList.remove('is-open'));

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      const target = t.getAttribute('data-tab');
      ['entries', 'users', 'sql'].forEach(tabName => {
        const el = document.getElementById(`tab-content-${tabName}`);
        if (el) el.style.display = tabName === target ? 'block' : 'none';
      });
    });
  });

  if (seedBtn) {
    seedBtn.addEventListener('click', async () => {
      await seed5Entries();
      await loadDbInspection();
      loadEntryForDate(activeDateStr);
      alert('5 entries toegevoegd aan SQLite!');
    });
  }

  if (runSqlBtn) {
    runSqlBtn.addEventListener('click', async () => {
      const input = document.getElementById('sql-query-input');
      const area = document.getElementById('sql-results-area');
      const sql = input ? input.value.trim() : '';
      if (!sql) return;

      const res = await runSqlQuery(sql);
      if (res.error) {
        area.innerHTML = `<div style="padding:0.75rem; color: #e11d48;">Fout: ${escapeHtml(res.error)}</div>`;
        return;
      }
      if (!res.rows || res.rows.length === 0) {
        area.innerHTML = `<div style="padding:1rem; color: var(--text-muted);">0 rijen gevonden.</div>`;
        return;
      }

      const headers = Object.keys(res.rows[0]);
      let tableHtml = `<table class="db-table"><thead><tr>`;
      headers.forEach(h => { tableHtml += `<th>${escapeHtml(h)}</th>`; });
      tableHtml += `</tr></thead><tbody>`;
      res.rows.forEach(r => {
        tableHtml += `<tr>`;
        headers.forEach(h => {
          tableHtml += `<td>${escapeHtml(String(r[h] ?? ''))}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table>`;
      area.innerHTML = tableHtml;
    });
  }
}

async function loadDbInspection() {
  const data = await getDatabaseInspection();
  const entriesTbody = document.getElementById('db-entries-tbody');
  const usersTbody = document.getElementById('db-users-tbody');
  const entriesCount = document.getElementById('db-entries-count');
  const usersCount = document.getElementById('db-users-count');

  if (entriesCount && data.entries) entriesCount.textContent = data.entries.length;
  if (usersCount && data.users) usersCount.textContent = data.users.length;

  if (entriesTbody && data.entries) {
    let html = '';
    data.entries.forEach(e => {
      html += `
        <tr>
          <td>#${e.id || '-'}</td>
          <td><strong>${e.date}</strong></td>
          <td>${e.mood > 0 ? e.mood + ' ★' : '—'}</td>
          <td>${escapeHtml(e.yesterday_done || '—')}</td>
          <td>${escapeHtml(e.yesterday_learned || '—')}</td>
          <td>${escapeHtml(e.today_planned || '—')}</td>
          <td style="font-size: 0.7rem; color: var(--text-muted);">${e.updated_at ? e.updated_at.slice(0, 16) : '—'}</td>
        </tr>
      `;
    });
    entriesTbody.innerHTML = html || '<tr><td colspan="7">Geen entries</td></tr>';
  }

  if (usersTbody && data.users) {
    let html = '';
    data.users.forEach(u => {
      html += `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${escapeHtml(u.email)}</strong></td>
          <td>${escapeHtml(u.name || '—')}</td>
          <td style="font-size: 0.72rem; color: var(--text-muted);">${u.created_at ? u.created_at.slice(0, 16) : '—'}</td>
        </tr>
      `;
    });
    usersTbody.innerHTML = html || '<tr><td colspan="4">Geen users</td></tr>';
  }
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft' && e.altKey) stepDate(-1);
    else if (e.key === 'ArrowRight' && e.altKey) stepDate(1);
    else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
      selectDate(getTodayDateString());
    }
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
