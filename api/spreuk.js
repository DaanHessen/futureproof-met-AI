/**
 * api/spreuk.js
 * Vercel Serverless Function voor het genereren van een AI dagspreuk via Google Gemini.
 * Leest veilig de GEMINI_API_KEY uit de Vercel Environment Variables zonder deze bloot te stellen aan de browser.
 */

export default async function handler(req, res) {
  // CORS & caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      spreuk: "AI neemt jouw werk niet over, maar degene die AI goed weet te gebruiken wel.",
      auteur: "Gert van Hardeveld",
      thema: "Futureproof met AI",
      source: "curated-no-key",
      info: "Stel de GEMINI_API_KEY in bij de Vercel Environment Variables om dagelijks dynamisch te genereren met Google AI Studio."
    });
  }

  try {
    const prompt = "Genereer een unieke, prikkelende en inspirerende spreuk van de dag in het Nederlands voor een HBO-student in AI en technologie. Geef UITSLUITEND een valide JSON-object terug: {\"spreuk\": \"...\", \"auteur\": \"...\", \"thema\": \"...\"}";

    // Probeer primair Gemini 2.0 Flash, met fallback naar Gemini 1.5 Flash
    let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.85
        }
      })
    });

    if (!geminiRes.ok) {
      // Fallback naar 1.5-flash
      geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.85
          }
        })
      });
    }

    if (!geminiRes.ok) {
      throw new Error(`Gemini API request status: ${geminiRes.status}`);
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);

    return res.status(200).json({
      spreuk: parsed.spreuk,
      auteur: parsed.auteur || "Google Gemini AI",
      thema: parsed.thema || "AI Wijsheid",
      source: "gemini"
    });
  } catch (error) {
    console.error("Serverless Gemini Error:", error);
    return res.status(200).json({
      spreuk: "Niet wat ons overkomt bepaalt onze dag, maar hoe we ervoor kiezen erop te reageren.",
      auteur: "Epictetus",
      thema: "Veerkracht",
      source: "curated-fallback"
    });
  }
}
