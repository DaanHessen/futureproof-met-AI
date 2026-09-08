/**
 * server.js
 * Lokale backend server met ingebouwde SQLite database voor het Digitaal Dagboek.
 * Biedt REST endpoints voor authenticatie (registratie zonder emailbevestiging),
 * entries beheer, database inspectie en statische bestanden.
 * 
 * Geen externe npm packages vereist: draait 100% op Node.js 22 built-ins.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { 
  initDatabase, 
  registerUser, 
  loginUser, 
  getUserById, 
  getEntriesForUser, 
  saveEntry, 
  seed5EntriesForUser, 
  getDatabaseInspection, 
  executeSelectQuery 
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Initialiseer SQLite tabellen
initDatabase();

// Eenvoudige in-memory sessies op token basis
const sessions = new Map();

function generateSessionToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function getUserIdFromRequest(req) {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/fp_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (token && sessions.has(token)) {
    return sessions.get(token).userId;
  }
  return null;
}

// MIME types voor statische bestanden
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sqlite': 'application/x-sqlite3'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname, urlObj);
    return;
  }

  // Statische bestandsafhandeling
  handleStaticRequest(req, res, pathname);
});

async function handleApiRequest(req, res, pathname, urlObj) {
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  const getBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Ongeldige JSON'));
        }
      });
      req.on('error', reject);
    });
  };

  try {
    // 1. Registratie zonder emailbevestiging (Slide 15 item 2 & 3)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await getBody();
      if (!body.email || !body.password) {
        return sendJson(400, { error: 'E-mailadres en wachtwoord zijn verplicht' });
      }

      const user = registerUser(body.email, body.password, body.name);
      const token = generateSessionToken(user.id);
      res.setHeader('Set-Cookie', `fp_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
      return sendJson(201, { success: true, user, token, message: 'Registratie geslaagd!' });
    }

    // 2. Inloggen
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await getBody();
      if (!body.email || !body.password) {
        return sendJson(400, { error: 'E-mailadres en wachtwoord zijn verplicht' });
      }

      const user = loginUser(body.email, body.password);
      const token = generateSessionToken(user.id);
      res.setHeader('Set-Cookie', `fp_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
      return sendJson(200, { success: true, user, token, message: 'Succesvol ingelogd!' });
    }

    // 3. Uitloggen
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', `fp_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
      return sendJson(200, { success: true, message: 'Uitgelogd' });
    }

    // 4. Huidige gebruiker ophalen
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return sendJson(200, { user: null });
      }
      const user = getUserById(userId);
      return sendJson(200, { user: user ? { id: user.id, email: user.email, name: user.name } : null });
    }

    // 5. Entries ophalen voor gebruiker
    if (pathname === '/api/entries' && req.method === 'GET') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return sendJson(401, { error: 'Niet ingelogd' });
      }
      const entries = getEntriesForUser(userId);
      return sendJson(200, { entries });
    }

    // 6. Entry opslaan
    if (pathname === '/api/entries' && req.method === 'POST') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return sendJson(401, { error: 'Niet ingelogd' });
      }
      const body = await getBody();
      if (!body.date) {
        return sendJson(400, { error: 'Datum ontbreekt' });
      }
      const saved = saveEntry(userId, body.date, body);
      return sendJson(200, { success: true, entry: saved });
    }

    // 7. Maak 5 nieuwe entries (Slide 15 item 4)
    if (pathname === '/api/db/seed5' && req.method === 'POST') {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return sendJson(401, { error: 'Log eerst in om 5 voorbeeld-entries toe te voegen' });
      }
      const created = seed5EntriesForUser(userId);
      return sendJson(200, { success: true, count: created.length, entries: created });
    }

    // 8. Database inspectie (Slide 15 item 5 & 6)
    if (pathname === '/api/db/inspect' && req.method === 'GET') {
      const inspection = getDatabaseInspection();
      return sendJson(200, inspection);
    }

    // 9. SQL Console query uitvoeren
    if (pathname === '/api/db/query' && req.method === 'POST') {
      const body = await getBody();
      if (!body.sql) {
        return sendJson(400, { error: 'Geen query opgegeven' });
      }
      try {
        const rows = executeSelectQuery(body.sql);
        return sendJson(200, { success: true, count: rows.length, rows });
      } catch (err) {
        return sendJson(400, { error: err.message });
      }
    }

    // 10. Download SQLite database bestand
    if (pathname === '/api/db/download' && req.method === 'GET') {
      const dbPath = path.join(__dirname, 'dagboek.sqlite');
      if (fs.existsSync(dbPath)) {
        res.writeHead(200, {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': 'attachment; filename="dagboek.sqlite"'
        });
        fs.createReadStream(dbPath).pipe(res);
        return;
      }
      return sendJson(404, { error: 'Database nog niet gevonden' });
    }

    // 11. AI Spreuk generator
    if (pathname === '/api/spreuk' && req.method === 'GET') {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (apiKey) {
        try {
          const prompt = "Genereer een korte, inspirerende spreuk van de dag in het Nederlands voor een HBO-student in AI en technologie. Geef UITSLUITEND een valide JSON-object terug: {\"spreuk\": \"...\", \"auteur\": \"...\", \"thema\": \"...\"}";
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.85 }
            })
          });
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            return sendJson(200, { ...parsed, source: 'gemini' });
          }
        } catch (e) {
          console.error('Gemini error:', e);
        }
      }

      return sendJson(200, {
        spreuk: "AI neemt jouw werk niet over, maar degene die AI goed weet te gebruiken wel.",
        auteur: "Gert van Hardeveld",
        thema: "Futureproof met AI",
        source: "curated"
      });
    }

    sendJson(404, { error: 'Endpoint niet gevonden' });
  } catch (err) {
    console.error('API Error:', err);
    sendJson(500, { error: err.message || 'Interne serverfout' });
  }
}

function handleStaticRequest(req, res, pathname) {
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Veiligheid: voorkom directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Verboden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Niet gevonden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 Digitaal Dagboek actief op http://localhost:${PORT}`);
  console.log(`  💾 SQLite Database: ./dagboek.sqlite`);
  console.log(`  📊 Database Inspector: http://localhost:${PORT} -> [🗄️ Database]`);
  console.log(`======================================================\n`);
});
