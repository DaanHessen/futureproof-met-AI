/**
 * js/mood-chart.js
 * Minimalistische 10-dagen mood visualisatie.
 * Rustig, strak vectorontwerp zonder overbodige visuele ruis.
 */

import { getLastNDays, getStatistics } from './storage.js';

export function renderMoodChart(containerId, onSelectDateCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const daysData = getLastNDays(10);
  const stats = getStatistics();

  const width = 300;
  const height = 90;
  const padX = 20;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const getY = (val) => padY + chartH - ((val - 1) / 4) * chartH;
  const getX = (idx) => padX + (idx / (daysData.length - 1)) * chartW;

  const valid = [];
  daysData.forEach((d, i) => {
    if (d.entry && d.entry.mood > 0) {
      valid.push({ x: getX(i), y: getY(d.entry.mood), d, idx: i });
    }
  });

  let lineD = '';
  let areaD = '';
  if (valid.length >= 2) {
    lineD = `M ${valid[0].x} ${valid[0].y}`;
    for (let i = 1; i < valid.length; i++) {
      const p0 = valid[i - 1];
      const p1 = valid[i];
      const cx = (p0.x + p1.x) / 2;
      lineD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const firstX = valid[0].x;
    const lastX = valid[valid.length - 1].x;
    const bottomY = getY(1);
    areaD = `${lineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  let dotsHtml = '';
  daysData.forEach((d, i) => {
    const x = getX(i);
    const hasData = d.entry && d.entry.mood > 0;
    const y = hasData ? getY(d.entry.mood) : getY(1);
    const isToday = i === daysData.length - 1;

    dotsHtml += `
      <g class="chart-point" data-date="${d.date}" style="cursor: pointer;">
        <circle cx="${x}" cy="${y}" r="${hasData ? 4 : 2}" 
          class="${hasData ? 'chart-dot-active' : 'chart-dot-empty'} ${isToday ? 'is-today' : ''}" />
        <title>${d.dayName} ${d.formattedDate}: ${hasData ? d.entry.mood + '/5 sterren' : 'Geen invoer'}</title>
      </g>
    `;
  });

  container.innerHTML = `
    <div class="mood-chart-box">
      <div class="mood-chart-top">
        <span class="mood-chart-label">Mood trend (10d)</span>
        <span class="mood-chart-stat">${stats.averageMood > 0 ? stats.averageMood + ' ★ gem.' : '—'}</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" class="mini-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4f759b" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#4f759b" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Referentielijnen voor min/max -->
        <line x1="${padX}" y1="${getY(5)}" x2="${width - padX}" y2="${getY(5)}" stroke="currentColor" stroke-dasharray="2 3" stroke-opacity="0.12" />
        <line x1="${padX}" y1="${getY(3)}" x2="${width - padX}" y2="${getY(3)}" stroke="currentColor" stroke-dasharray="2 3" stroke-opacity="0.08" />
        <line x1="${padX}" y1="${getY(1)}" x2="${width - padX}" y2="${getY(1)}" stroke="currentColor" stroke-dasharray="2 3" stroke-opacity="0.12" />

        ${areaD ? `<path d="${areaD}" fill="url(#chartFillGrad)" />` : ''}
        ${lineD ? `<path d="${lineD}" fill="none" stroke="#4f759b" stroke-width="2" stroke-linecap="round" />` : ''}
        ${dotsHtml}
      </svg>
    </div>
  `;

  container.querySelectorAll('.chart-point').forEach(pt => {
    pt.addEventListener('click', () => {
      const date = pt.getAttribute('data-date');
      if (typeof onSelectDateCallback === 'function') {
        onSelectDateCallback(date);
      }
    });
  });
}
