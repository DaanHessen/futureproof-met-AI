/**
 * api/db.js
 * Vercel Serverless Function voor Database inspectie en status.
 * Voorkomt het importeren van node:sqlite (wat niet beschikbaar is in Vercel Serverless).
 * De echte SQLite database (dagboek.sqlite) draait lokaal via `npm start`.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        dbPath: 'SQLite (Vercel Serverless / Cloud Modus)',
        tables: ['users', 'entries', 'quotes'],
        users: [
          {
            id: 1,
            email: 'daan@student.hu.nl',
            name: 'Daan Hessen',
            created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
          }
        ],
        entries: [],
        note: 'Op Vercel draait de applicatie serverless met client-side storage. Lokaal (via `npm start`) verbindt de app met het echte `dagboek.sqlite` bestand op je schijf.'
      });
    }

    if (req.method === 'POST') {
      const { sql } = req.body || {};
      if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
        return res.status(400).json({ error: 'Alleen SELECT queries zijn toegestaan in deze console' });
      }

      return res.status(200).json({
        success: true,
        count: 1,
        rows: [
          {
            status: 'Query geaccepteerd (Serverless sandbox)',
            query: sql,
            tip: 'Draai `npm start` lokaal om direct tegen het echte dagboek.sqlite bestand te bevragen.'
          }
        ]
      });
    }

    res.status(404).json({ error: 'Niet gevonden' });
  } catch (err) {
    res.status(200).json({ error: err.message, status: 'fallback' });
  }
}
