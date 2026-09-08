/**
 * api/db.js
 * Vercel Serverless Function voor Database inspectie en SQL queries.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';

const DB_PATH = path.join(os.tmpdir(), 'dagboek_vercel.sqlite');
const db = new DatabaseSync(DB_PATH);

// Zorg dat tabellen bestaan
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    mood INTEGER DEFAULT 0,
    yesterday_done TEXT DEFAULT '',
    yesterday_learned TEXT DEFAULT '',
    today_planned TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE (user_id, date)
  );
`);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET') {
      const users = db.prepare('SELECT id, email, name, created_at FROM users').all();
      const entries = db.prepare('SELECT * FROM entries ORDER BY date DESC').all();
      return res.status(200).json({
        dbPath: DB_PATH,
        tables: ['users', 'entries'],
        users,
        entries
      });
    }

    if (req.method === 'POST') {
      const { sql } = req.body || {};
      if (!sql || !sql.trim().toLowerCase().startsWith('select')) {
        return res.status(400).json({ error: 'Alleen SELECT queries zijn toegestaan' });
      }
      const rows = db.prepare(sql).all();
      return res.status(200).json({ success: true, count: rows.length, rows });
    }

    res.status(404).json({ error: 'Niet gevonden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
