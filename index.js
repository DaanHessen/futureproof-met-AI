/**
 * index.js
 * Vercel Serverless Entrypoint Handler.
 * Zorgt voor correcte MIME types en serving van alle bestanden.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  let pathname = url.pathname.replace(/^\/+/, ''); // verwijder leading slashes

  if (!pathname || pathname === '') {
    pathname = 'index.html';
  }

  // Kandidaat-locaties doorzoeken
  const candidates = [
    path.join(__dirname, pathname),
    path.join(process.cwd(), pathname),
    path.join(__dirname, 'public', pathname),
    path.join(process.cwd(), 'public', pathname)
  ];

  let targetFile = null;
  for (const p of candidates) {
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      targetFile = p;
      break;
    }
  }

  const ext = path.extname(pathname).toLowerCase();

  // Als het een asset is (.css, .js, etc.) en niet gevonden is, stuur een 404 met juiste MIME type, GEEN index.html!
  if (!targetFile && (ext === '.css' || ext === '.js' || ext === '.json' || ext === '.svg' || ext === '.png')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');
    res.end(`/* 404: Niet gevonden: ${pathname} */`);
    return;
  }

  // Voor overige paden: val terug op index.html (SPA routing)
  if (!targetFile) {
    const htmlCandidates = [
      path.join(__dirname, 'index.html'),
      path.join(process.cwd(), 'index.html'),
      path.join(__dirname, 'public', 'index.html'),
      path.join(process.cwd(), 'public', 'index.html')
    ];
    for (const p of htmlCandidates) {
      if (fs.existsSync(p)) {
        targetFile = p;
        break;
      }
    }
  }

  if (!targetFile || !fs.existsSync(targetFile)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Niet gevonden');
    return;
  }

  const finalExt = path.extname(targetFile).toLowerCase();
  const contentType = MIME_TYPES[finalExt] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(targetFile).pipe(res);
}
