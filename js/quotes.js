/**
 * js/quotes.js
 * Snelle, betrouwbare spreuk van de dag met directe rotatie en optionele AI verrijking.
 */

import { getSettings } from './storage.js';

export const QUOTES = [
  {
    spreuk: "AI neemt jouw werk niet over, maar degene die AI goed weet te gebruiken wel.",
    auteur: "Gert van Hardeveld",
    thema: "Futureproof"
  },
  {
    spreuk: "Eenvoud is de ultieme vorm van perfectie.",
    auteur: "Leonardo da Vinci",
    thema: "Focus"
  },
  {
    spreuk: "We kunnen slechts een korte afstand vooruitzien, maar we zien genoeg dat gedaan moet worden.",
    auteur: "Alan Turing",
    thema: "Innovatie"
  },
  {
    spreuk: "Niet wat er gebeurt bepaalt je dag, maar hoe je ervoor kiest erop te reageren.",
    auteur: "Epictetus",
    thema: "Veerkracht"
  },
  {
    spreuk: "De beste manier om de toekomst te voorspellen is om haar zelf te ontwerpen.",
    auteur: "Alan Kay",
    thema: "Creatie"
  },
  {
    spreuk: "Blijf nieuwsgierig naar nieuwe ideeën, blijf moedig genoeg om te proberen.",
    auteur: "Steve Jobs",
    thema: "Groei"
  },
  {
    spreuk: "Technologie is op haar mooist wanneer zij menselijke intelligentie versterkt in plaats van vervangt.",
    auteur: "Ada Lovelace",
    thema: "Mens & AI"
  },
  {
    spreuk: "Rust in je hoofd brengt helderheid in je keuzes en richting in je werk.",
    auteur: "Marcus Aurelius",
    thema: "Rust"
  },
  {
    spreuk: "Begin met wat nodig is, doe dan wat mogelijk is, en je bereikt wat eerst onbereikbaar leek.",
    auteur: "Franciscus van Assisi",
    thema: "Actie"
  },
  {
    spreuk: "Een dag met bewuste reflectie geeft richting aan alle dagen die volgen.",
    auteur: "Socrates",
    thema: "Reflectie"
  },
  {
    spreuk: "Wie durft te experimenteren en fouten omarmt als feedback, leert het snelst.",
    auteur: "Grace Hopper",
    thema: "Leren"
  },
  {
    spreuk: "Vibe coding is het orchestreren van intelligentie met een heldere visie en smaak.",
    auteur: "AI Wijsheid",
    thema: "Vibe Coding"
  },
  {
    spreuk: "Kleine dagelijkse stappen leveren op termijn buitengewone resultaten op.",
    auteur: "James Clear",
    thema: "Consistentie"
  }
];

let currentIndex = 0;

/**
 * Haal direct de spreuk op voor een datum.
 * Schakelt bij 'forceNew' onmiddellijk over naar de volgende spreuk (0ms vertraging!).
 */
export function getDailyQuote(dateStr, forceNew = false) {
  const cacheKey = `fp_quote_${dateStr}`;

  if (!forceNew) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
  }

  // Bepaal index op basis van datum of volgende in de rij
  if (forceNew) {
    currentIndex = (currentIndex + 1) % QUOTES.length;
  } else {
    // Deterministic op basis van datum
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    currentIndex = Math.abs(hash) % QUOTES.length;
  }

  const quote = QUOTES[currentIndex];

  try {
    localStorage.setItem(cacheKey, JSON.stringify(quote));
  } catch (e) {}

  // Probeer optioneel op de achtergrond Gemini aan te roepen als die beschikbaar is
  tryFetchGeminiInBackground(dateStr, cacheKey);

  return quote;
}

/**
 * Optionele achtergrondaanroep naar Gemini zonder de UI ooit te blokkeren
 */
async function tryFetchGeminiInBackground(dateStr, cacheKey) {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;

  // Alleen als er lokaal een key is of Vercel serverless draait
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch('/api/spreuk', { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.spreuk && data.source === 'gemini') {
        const geminiQuote = {
          spreuk: data.spreuk,
          auteur: data.auteur || 'Google Gemini AI',
          thema: data.thema || 'AI Inzicht'
        };
        localStorage.setItem(cacheKey, JSON.stringify(geminiQuote));
        window.dispatchEvent(new CustomEvent('dagboek:quote-updated', { detail: geminiQuote }));
      }
    }
  } catch (e) {
    // Geen probleem, de ingebouwde spreuk staat al klaar
  }
}
