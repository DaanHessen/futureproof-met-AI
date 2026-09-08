/**
 * js/mood-chart.js
 * Visualisatie van het gemoedstoestand-verloop over de afgelopen 10 dagen.
 * Berekent en toont mood trends, schommelingen en interactieve SVG-grafiek.
 */

import { getLastNDays, getStatistics } from './storage.js';
import { moodOptions } from './questions.js';

export function renderMoodChart(containerId, onSelectDateCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const daysData = getLastNDays(10);
  const stats = getStatistics();

  // Filter dagen met een ingevulde mood
  const pointsWithMood = daysData.filter(d => d.entry && d.entry.mood > 0);

  // Analyseer moodswings en trend
  const analysis = analyzeMoodTrend(daysData);

  container.innerHTML = `
    <div class="chart-header">
      <div class="chart-title-group">
        <div class="chart-eyebrow">Trends & Inzichten</div>
        <h3 class="chart-title">Gemoedstoestand afgelopen 10 dagen</h3>
      </div>
      <div class="chart-badges">
        <div class="stat-pill" title="Gemiddelde gemoedstoestand">
          <span class="stat-label">Gemiddeld:</span>
          <span class="stat-value">${stats.averageMood > 0 ? stats.averageMood + ' / 5' : '—'}</span>
        </div>
        <div class="stat-pill ${analysis.trendClass}">
          <span class="stat-icon">${analysis.trendIcon}</span>
          <span class="stat-label">${analysis.trendLabel}</span>
        </div>
      </div>
    </div>

    <div class="chart-svg-wrapper" id="mood-svg-container">
      ${buildSvgMarkup(daysData)}
      <div class="chart-tooltip" id="chart-tooltip" style="display: none;"></div>
    </div>

    <div class="chart-insight-bar">
      <div class="insight-icon">💡</div>
      <div class="insight-text">${analysis.insightText}</div>
    </div>
  `;

  // Voeg interactieve hover en click events toe aan de datapunten
  attachChartInteractions(daysData, onSelectDateCallback);
}

function analyzeMoodTrend(daysData) {
  const moods = daysData
    .filter(d => d.entry && d.entry.mood > 0)
    .map(d => ({ date: d.date, mood: d.entry.mood }));

  if (moods.length < 2) {
    return {
      trendIcon: '📊',
      trendLabel: 'Startfase',
      trendClass: 'trend-neutral',
      insightText: 'Vul minstens 2 dagen in om inzicht te krijgen in je gemoedstoestand en eventuele moodswings.'
    };
  }

  // Bereken volatiliteit (verschil tussen opeenvolgende dagen)
  let maxSwing = 0;
  let swingsCount = 0;
  for (let i = 1; i < moods.length; i++) {
    const diff = Math.abs(moods[i].mood - moods[i - 1].mood);
    if (diff > maxSwing) maxSwing = diff;
    if (diff >= 2) swingsCount++;
  }

  const firstMood = moods[0].mood;
  const lastMood = moods[moods.length - 1].mood;
  const diffTotal = lastMood - firstMood;

  let trendIcon = '➔';
  let trendLabel = 'Stabiel';
  let trendClass = 'trend-neutral';
  let insightText = 'Je gemoedstoestand is relatief gelijkmatig de afgelopen periode.';

  if (diffTotal >= 1.5) {
    trendIcon = '↗';
    trendLabel = 'Stijgende lijn';
    trendClass = 'trend-up';
    insightText = 'Positieve opwaartse trend! Je energie en voldoening nemen zichtbaar toe.';
  } else if (diffTotal <= -1.5) {
    trendIcon = '↘';
    trendLabel = 'Aandachtspunt';
    trendClass = 'trend-down';
    insightText = 'Je score laat een daling zien. Kijk eens naar wat er gisteren energie heeft gekost.';
  }

  if (swingsCount >= 2 || maxSwing >= 3) {
    trendIcon = '⚡';
    trendLabel = 'Schommelend';
    trendClass = 'trend-warning';
    insightText = `Er zijn opvallende pieken en dalen (tot ${maxSwing} sterren verschil). Reflecteer op oorzaken van stress of piekmomenten.`;
  } else if (maxSwing <= 1 && moods.length >= 4) {
    trendIcon = '⚖️';
    trendLabel = 'Zeer stabiel';
    trendClass = 'trend-up';
    insightText = 'Mooie consistente gemoedstoestand zonder onverwachte moodswings. Uitstekende balans!';
  }

  return { trendIcon, trendLabel, trendClass, insightText };
}

function buildSvgMarkup(daysData) {
  const width = 740;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Y-as mapping: 1 (onderaan) tot 5 (bovenaan)
  const getY = (val) => {
    const normalized = (val - 1) / 4; // 0 tot 1
    return paddingTop + chartHeight - normalized * chartHeight;
  };

  // X-as mapping: 10 dagen verdeeld over de breedte
  const getX = (index) => {
    return paddingLeft + (index / (daysData.length - 1)) * chartWidth;
  };

  // Horizontale hulplijnen (1 t/m 5)
  let gridLinesHtml = '';
  const yLevels = [
    { val: 5, label: '5 ★', emoji: '🚀' },
    { val: 4, label: '4 ★', emoji: '☀️' },
    { val: 3, label: '3 ★', emoji: '🌤️' },
    { val: 2, label: '2 ★', emoji: '⛅' },
    { val: 1, label: '1 ★', emoji: '🌧️' }
  ];

  yLevels.forEach(lvl => {
    const y = getY(lvl.val);
    gridLinesHtml += `
      <g class="chart-grid-row">
        <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line" />
        <text x="${paddingLeft - 12}" y="${y + 4}" class="chart-y-label">${lvl.val}</text>
      </g>
    `;
  });

  // Punten verzamelen voor curve
  const validPoints = [];
  daysData.forEach((day, index) => {
    if (day.entry && day.entry.mood > 0) {
      validPoints.push({
        x: getX(index),
        y: getY(day.entry.mood),
        index,
        day
      });
    }
  });

  // Pad genereren
  let pathD = '';
  let areaD = '';
  if (validPoints.length >= 2) {
    pathD = `M ${validPoints[0].x} ${validPoints[0].y}`;
    for (let i = 1; i < validPoints.length; i++) {
      // Gebruik soepele kubische Bezier kromme
      const p0 = validPoints[i - 1];
      const p1 = validPoints[i];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    const firstX = validPoints[0].x;
    const lastX = validPoints[validPoints.length - 1].x;
    const bottomY = getY(1);
    areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Render X-as datums en stippen
  let columnsHtml = '';
  daysData.forEach((day, index) => {
    const x = getX(index);
    const isToday = index === daysData.length - 1;
    const hasData = day.entry && day.entry.mood > 0;
    const yVal = hasData ? getY(day.entry.mood) : getY(1);

    columnsHtml += `
      <g class="chart-col" data-date="${day.date}" data-index="${index}">
        <!-- Verticale hulplijn per dag -->
        <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${height - paddingBottom}" class="chart-col-line ${isToday ? 'is-today-line' : ''}" />
        
        <!-- X-as label (datum en dag) -->
        <text x="${x}" y="${height - paddingBottom + 18}" class="chart-x-date ${isToday ? 'is-today-text' : ''}">${day.formattedDate}</text>
        <text x="${x}" y="${height - paddingBottom + 32}" class="chart-x-day">${day.dayName}</text>

        <!-- Knooppunt / Stip indien data aanwezig -->
        ${hasData ? `
          <circle cx="${x}" cy="${yVal}" r="8" class="chart-node-glow" />
          <circle cx="${x}" cy="${yVal}" r="5" class="chart-node" data-date="${day.date}" />
        ` : `
          <circle cx="${x}" cy="${height - paddingBottom}" r="2" class="chart-empty-dot" />
        `}
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" class="mood-chart-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
        </linearGradient>
        <linearGradient id="moodLineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#60a5fa" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>

      <!-- Raster lijnen -->
      ${gridLinesHtml}

      <!-- Vlak onder de lijn -->
      ${areaD ? `<path d="${areaD}" fill="url(#moodAreaGrad)" class="chart-area" />` : ''}

      <!-- Hoofd trendlijn -->
      ${pathD ? `<path d="${pathD}" fill="none" stroke="url(#moodLineGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="chart-path" />` : ''}

      <!-- Dagen kolommen & stippen -->
      ${columnsHtml}
    </svg>
  `;
}

function attachChartInteractions(daysData, onSelectDateCallback) {
  const svgWrapper = document.getElementById('mood-svg-container');
  const tooltip = document.getElementById('chart-tooltip');
  if (!svgWrapper || !tooltip) return;

  const cols = svgWrapper.querySelectorAll('.chart-col');
  const svg = svgWrapper.querySelector('.mood-chart-svg');

  cols.forEach(col => {
    const dateStr = col.getAttribute('data-date');
    const dayItem = daysData.find(d => d.date === dateStr);

    col.addEventListener('mouseenter', (e) => {
      showTooltip(e, dayItem, svgWrapper, tooltip);
    });

    col.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    col.addEventListener('click', () => {
      if (typeof onSelectDateCallback === 'function') {
        onSelectDateCallback(dateStr);
      }
    });
  });
}

function showTooltip(e, dayItem, container, tooltip) {
  if (!dayItem) return;

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const entry = dayItem.entry;
  const moodObj = entry && entry.mood > 0 ? moodOptions.find(m => m.value === entry.mood) : null;

  let content = `
    <div class="tooltip-header">
      <span class="tooltip-date">${dayItem.dayName} ${dayItem.formattedDate}</span>
      ${moodObj ? `<span class="tooltip-mood">${moodObj.emoji} ${moodObj.stars}★ ${moodObj.label}</span>` : '<span class="tooltip-empty">Nog geen invoer</span>'}
    </div>
  `;

  if (entry) {
    if (entry.yesterday_done) {
      const snippet = entry.yesterday_done.length > 70 ? entry.yesterday_done.slice(0, 67) + '...' : entry.yesterday_done;
      content += `<div class="tooltip-row"><strong>Gedaan:</strong> ${escapeHtml(snippet)}</div>`;
    }
    if (entry.today_planned) {
      const snippet = entry.today_planned.length > 70 ? entry.today_planned.slice(0, 67) + '...' : entry.today_planned;
      content += `<div class="tooltip-row"><strong>Plan:</strong> ${escapeHtml(snippet)}</div>`;
    }
  }

  content += `<div class="tooltip-tip">Klik om naar deze dag te gaan ↗</div>`;

  tooltip.innerHTML = content;
  tooltip.style.display = 'block';

  // Tooltip positionering
  let left = mouseX - 110;
  if (left < 10) left = 10;
  if (left + 230 > rect.width) left = rect.width - 240;

  let top = mouseY - 90;
  if (top < 10) top = mouseY + 20;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
