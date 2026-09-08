/**
 * js/quotes.js
 * Afhandeling van de "Spreuk van de Dag" via Google Gemini AI
 * met serverless Vercel fallback en een rijke ingebouwde verzameling.
 */

import { getSettings } from './storage.js';

// Samengestelde verzameling inspirerende Nederlandstalige spreuken over AI, tech en persoonlijke groei
const CURATED_QUOTES = [
  {
    spreuk: "AI neemt jouw werk niet over, maar degene die AI goed weet te gebruiken wel.",
    auteur: "Gert van Hardeveld",
    thema: "Futureproof"
  },
  {
    spreuk: "We kunnen alleen een korte afstand vooruitzien, maar we zien daar genoeg dat gedaan moet worden.",
    auteur: "Alan Turing",
    thema: "Innovatie"
  },
  {
    spreuk: "De beste manier om de toekomst te voorspellen is om deze zelf te creëren.",
    auteur: "Alan Kay",
    thema: "Creatie"
  },
  {
    spreuk: "Niet wat ons overkomt bepaalt onze dag, maar hoe we ervoor kiezen erop te reageren.",
    auteur: "Epictetus",
    thema: "Veerkracht"
  },
  {
    spreuk: "Eenvoud is de ultieme vorm van verfijning.",
    auteur: "Leonardo da Vinci",
    thema: "Focus"
  },
  {
    spreuk: "Blijf hongerig naar nieuwe kennis, blijf dwaas genoeg om fouten te durven maken.",
    auteur: "Steve Jobs",
    thema: "Groei"
  },
  {
    spreuk: "Technologie is op haar krachtigst wanneer zij de menselijke nieuwsgierigheid versterkt, niet vervangt.",
    auteur: "Ada Lovelace",
    thema: "Mens & AI"
  },
  {
    spreuk: "De kunst van vooruitgang is niet het vermijden van fouten, maar de snelheid waarmee je ervan leert.",
    auteur: "John Dewey",
    thema: "Reflectie"
  },
  {
    spreuk: "Begin vandaag met wat nodig is, doe dan wat mogelijk is, en plotseling doe je het onmogelijke.",
    auteur: "Franciscus van Assisi",
    thema: "Actie"
  },
  {
    spreuk: "Een dag niet gereflecteerd is een dag voorbijgegaan zonder richting.",
    auteur: "Socrates",
    thema: "Inzicht"
  },
  {
    spreuk: "Wie vragen stelt en durft te experimenteren, bezit de sleutel tot innovatie.",
    auteur: "Grace Hopper",
    thema: "Experimenteren"
  },
  {
    spreuk: "Kleine dagelijkse overwinningen leiden op den duur tot buitengewone meesterschap.",
    auteur: "Robin Sharma",
    thema: "Consistentie"
  },
  {
    spreuk: "Vibe coding is geen luiheid, het is het orchestreren van intelligentie met de juiste visie.",
    auteur: "AI Wijsheid",
    thema: "Vibe Coding"
  },
  {
    spreuk: "Rust in je hoofd brengt helderheid in je code en richting in je werk.",
    auteur: "Marcus Aurelius",
    thema: "Mentale Rust"
  },
  {
    spreuk: "De vraag is niet of machines kunnen denken, maar of mensen dat nog willen blijven doen.",
    auteur: "B.F. Skinner",
    thema: "Kritisch Denken"
  }
];

let lastQuoteIndex = -1;

/**
 * Haal de spreuk van de dag op (met caching per datum in localStorage).
 * @param {string} dateStr 
 * @param {boolean} forceNew 
 * @returns {Promise<{ spreuk: string, auteur: string, thema: string, source: string }>}
 */
export async function getDailyQuote(dateStr, forceNew = false) {
  const cacheKey = `fp_quote_${dateStr}`;
  
  if (!forceNew) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // negeer cache fouten
    }
  }

  // Probeer via Vercel serverless function of directe Gemini API
  let quote = null;

  try {
    quote = await fetchFromVercelApi();
  } catch (err) {
    // Probeer directe browser API call als de gebruiker een Gemini key heeft ingesteld
    try {
      quote = await fetchFromClientGemini();
    } catch (err2) {
      // Fallback op gecureerde lijst
      quote = getRandomCuratedQuote();
    }
  }

  if (!quote) {
    quote = getRandomCuratedQuote();
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(quote));
  } catch (e) {
    // negeer opslagfout
  }

  return quote;
}

/**
 * Roep de Vercel Serverless Function `/api/spreuk` aan.
 */
async function fetchFromVercelApi() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const res = await fetch('/api/spreuk', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`API HTTP error: ${res.status}`);
  }

  const data = await res.json();
  if (data && data.spreuk) {
    return {
      spreuk: data.spreuk,
      auteur: data.auteur || 'Google Gemini AI',
      thema: data.thema || 'AI Wijsheid',
      source: 'gemini-vercel'
    };
  }
  throw new Error('Ongeldig API antwoord');
}

/**
 * Directe client-side call naar Gemini als de student een API key heeft ingevuld in instellingen.
 */
async function fetchFromClientGemini() {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey ? settings.geminiApiKey.trim() : '';

  if (!apiKey) {
    throw new Error('Geen client API key beschikbaar');
  }

  const prompt = "Genereer een unieke, korte, inspirerende spreuk van de dag in het Nederlands, passend voor een HBO-student in AI en technologie. Geef UITSLUITEND een valide JSON-object terug zonder markdown tags: {\"spreuk\": \"...\", \"auteur\": \"...\", \"thema\": \"...\"}";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    })
  });

  if (!res.ok) throw new Error('Client Gemini call gefaald');

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);

  return {
    spreuk: parsed.spreuk,
    auteur: parsed.auteur || 'Google Gemini AI',
    thema: parsed.thema || 'AI Inzicht',
    source: 'gemini-direct'
  };
}

/**
 * Haal een willekeurige spreuk uit de lokale collectie.
 */
function getRandomCuratedQuote() {
  let idx;
  do {
    idx = Math.floor(Math.random() * CURATED_QUOTES.length);
  } while (idx === lastQuoteIndex && CURATED_QUOTES.length > 1);

  lastQuoteIndex = idx;
  return {
    ...CURATED_QUOTES[idx],
    source: 'curated'
  };
}
