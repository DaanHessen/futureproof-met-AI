/**
 * db.js
 * SQLite database manager voor het Digitaal Dagboek.
 * Maakt gebruik van de ingebouwde Node.js 22 'node:sqlite' DatabaseSync.
 * Slaat alle tabellen (users, entries, quotes) lokaal op in 'dagboek.sqlite'.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'dagboek.sqlite');

// Initialiseer SQLite database bestand
export const db = new DatabaseSync(DB_PATH);

// Activeer Foreign Keys en WAL mode voor performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Maak het databaseschema aan conform de eisen van de opdracht (Slide 15).
 */
export function initDatabase() {
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
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      quote TEXT NOT NULL,
      author TEXT,
      theme TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  console.log(`[SQLite] Database geïnitialiseerd op: ${DB_PATH}`);
}

/**
 * Wachtwoord hashen met ingebouwde crypto (scrypt)
 */
function hashPassword(password, salt = null) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 32).toString('hex');
  return { hash, salt: generatedSalt };
}

/**
 * Registreer een nieuwe gebruiker zonder emailbevestiging (Slide 15 requirement).
 */
export function registerUser(email, password, name = '') {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email en wachtwoord zijn verplicht');
  }

  const { hash, salt } = hashPassword(password);
  const displayName = name.trim() || normalizedEmail.split('@')[0];

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, salt, name)
    VALUES (?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(normalizedEmail, hash, salt, displayName);
    const userId = Number(result.lastInsertRowid);
    return {
      id: userId,
      email: normalizedEmail,
      name: displayName
    };
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      throw new Error('Er bestaat al een account met dit e-mailadres');
    }
    throw err;
  }
}

/**
 * Inloggen van een gebruiker
 */
export function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const user = stmt.get(normalizedEmail);

  if (!user) {
    throw new Error('Ongeldig e-mailadres of wachtwoord');
  }

  const { hash } = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    throw new Error('Ongeldig e-mailadres of wachtwoord');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at
  };
}

/**
 * Haal gebruiker op via ID
 */
export function getUserById(id) {
  const stmt = db.prepare(`SELECT id, email, name, created_at FROM users WHERE id = ?`);
  return stmt.get(id);
}

/**
 * Haal alle geregistreerde gebruikers op (voor de database inspector view - Slide 15 item 6)
 */
export function getAllUsers() {
  const stmt = db.prepare(`SELECT id, email, name, created_at FROM users ORDER BY id ASC`);
  return stmt.all();
}

/**
 * Haal alle dagboeknotities van een gebruiker op
 */
export function getEntriesForUser(userId) {
  const stmt = db.prepare(`
    SELECT id, user_id, date, mood, yesterday_done, yesterday_learned, today_planned, updated_at
    FROM entries
    WHERE user_id = ?
    ORDER BY date DESC
  `);
  return stmt.all(userId);
}

/**
 * Haal een specifieke datum-entry op
 */
export function getEntry(userId, dateStr) {
  const stmt = db.prepare(`
    SELECT id, user_id, date, mood, yesterday_done, yesterday_learned, today_planned, updated_at
    FROM entries
    WHERE user_id = ? AND date = ?
  `);
  return stmt.get(userId, dateStr);
}

/**
 * Sla een dagboeknotitie op (UPSERT)
 */
export function saveEntry(userId, dateStr, entryData) {
  const stmt = db.prepare(`
    INSERT INTO entries (user_id, date, mood, yesterday_done, yesterday_learned, today_planned, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(user_id, date) DO UPDATE SET
      mood = excluded.mood,
      yesterday_done = excluded.yesterday_done,
      yesterday_learned = excluded.yesterday_learned,
      today_planned = excluded.today_planned,
      updated_at = datetime('now', 'localtime')
  `);

  stmt.run(
    userId,
    dateStr,
    Number(entryData.mood) || 0,
    entryData.yesterday_done || '',
    entryData.yesterday_learned || '',
    entryData.today_planned || ''
  );

  return getEntry(userId, dateStr);
}

/**
 * Maak 5 nieuwe entries aan conform Slide 15, stap 4.
 */
export function seed5EntriesForUser(userId) {
  const samples = [
    {
      offsetDays: 4,
      mood: 4,
      yesterday_done: "Introductie van de minor Futureproof met AI gevolgd. College over de impact van LLM's.",
      yesterday_learned: "Geleerd wat Vibe Coding inhoudt en hoe AI je workflow kan versnellen.",
      today_planned: "Requirements opstellen voor het digitale dagboekje en prompt experimenten starten."
    },
    {
      offsetDays: 3,
      mood: 3,
      yesterday_done: "Prompt geschreven in Google AI Studio voor de eerste versie van het dagboekje.",
      yesterday_learned: "AI geeft betere output als je strikte beperkingen meegeeft (max 5 user stories).",
      today_planned: "De gegenereerde HTML/JS code testen op mijn telefoon."
    },
    {
      offsetDays: 2,
      mood: 5,
      yesterday_done: "Koppeling gemaakt met GitHub en de repository klaargezet voor deployment.",
      yesterday_learned: "Waarom je nooit een Gemini API key direct in frontend code zet, maar via environment variables.",
      today_planned: "Project deployen op Vercel en de spreuk-functie controleren."
    },
    {
      offsetDays: 1,
      mood: 4,
      yesterday_done: "Vercel deployment voltooid. De spreuk van de dag succesvol gekoppeld aan Gemini AI.",
      yesterday_learned: "Hoe serverless functions communiceren met externe API's zonder keys te lekken.",
      today_planned: "Lokale SQLite database bouwen en registratie zonder emailbevestiging toevoegen."
    },
    {
      offsetDays: 0,
      mood: 5,
      yesterday_done: "SQLite tabellen voor users en entries geïmplementeerd en gekoppeld aan de frontend.",
      yesterday_learned: "Het verschil tussen LocalStorage en een relationele database met SQL queries.",
      today_planned: "10-dagen mood visualisatie testen en database inspector inspecteren."
    }
  ];

  const created = [];
  const baseDate = new Date();

  for (const sample of samples) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - sample.offsetDays);
    const dateStr = d.toISOString().split('T')[0];

    const entry = saveEntry(userId, dateStr, sample);
    created.push(entry);
  }

  return created;
}

/**
 * Inspecteer alle data in de SQLite database (Slide 15 item 5 & 6)
 */
export function getDatabaseInspection() {
  const usersStmt = db.prepare(`SELECT id, email, name, created_at FROM users ORDER BY id ASC`);
  const entriesStmt = db.prepare(`
    SELECT e.id, e.user_id, u.email as user_email, e.date, e.mood, 
           e.yesterday_done, e.yesterday_learned, e.today_planned, e.updated_at
    FROM entries e
    LEFT JOIN users u ON e.user_id = u.id
    ORDER BY e.date DESC
  `);

  return {
    dbPath: DB_PATH,
    tables: ['users', 'entries', 'quotes'],
    users: usersStmt.all(),
    entries: entriesStmt.all()
  };
}

/**
 * Voer een veilige SELECT query uit (voor de SQL console in de inspector)
 */
export function executeSelectQuery(query) {
  const trimmed = query.trim();
  if (!trimmed.toLowerCase().startsWith('select')) {
    throw new Error('Alleen SELECT queries zijn toegestaan in de database console');
  }

  const stmt = db.prepare(trimmed);
  return stmt.all();
}
