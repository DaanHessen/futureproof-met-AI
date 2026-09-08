# Technische Documentatie & Ontwerpkeuzes — Digitaal Dagboek

Dit document beschrijft de architectuur, ontwerpfilosofie en didactische beantwoording van alle opdrachten uit **Week 2 — Vibecoding** (Slides 1 tot en met 15) van de Minor *Futureproof met AI!* (Hogeschool Utrecht).

---

## 1. Didactische Verantwoording (Collegevragen & Slides)

### Slide 15: Werken met een database (SQLite Integratie)
> *"1. Maak Database  
> 2. Login met registratie, zonder email bevestiging  
> 3. Registreer en log in  
> 4. Maak 5 nieuwe entries  
> 5. Ga naar database, zie je de entries  
> 6. Ga naar users en kun je je zelf terugvinden  
> 7. Koppeling met AI voor spreuk van de dag"*

In plaats van een externe clouddienst (zoals Supabase in Lovable) is voor dit project gekozen voor een **lokale SQLite database** (`dagboek.sqlite`). Dit biedt enorme didactische en praktische voordelen:
1. **Zero-setup & Lokaal eigenaarschap**: Geen externe cloud tokens of kredietlimieten; draait volledig standalone via Node.js 22 built-in `node:sqlite`.
2. **Authenticatie zonder e-mailbevestiging**: De gebruiker kan zich registreren met enkel een e-mail en wachtwoord. Het wachtwoord wordt veilig gehasht met de Node.js crypto bibliotheek (`scrypt`). Er is geen wachttijd voor e-mailverificatie, zodat de flow naadloos is.
3. **Database Inspector in de UI**: Via de knop **"🗄️ Database"** opent een geïntegreerde inspector:
   - **Tabel `entries`**: Toont alle opgeslagen dagboeknotities, mood scores en datums.
   - **Tabel `users`**: Toont alle geregistreerde accounts, met een speciale *"Jij"* badge bij het actieve account, zodat de student zichzelf direct terugvindt conform Slide 15 item 6.
   - **SQL Console**: Biedt studenten de mogelijkheid om echte SQL queries uit te voeren (bijv. `SELECT * FROM entries WHERE mood = 5`).
   - **5 Voorbeeld-entries knop**: Met één klik kunnen 5 representatieve dagboekdagen gegenereerd worden om de database en grafiek te testen.

---

### Slide 7: Vragen over Dataopslag
> *"Wat is het voordeel van deze opslag en wat is het nadeel?"*

#### Vergelijking LocalStorage vs. SQLite:

| Criterium | LocalStorage (Slide 7 & 8) | SQLite Database (Slide 15) |
| :--- | :--- | :--- |
| **Opslaglocatie** | In het geheugen van de webbrowser | In een bestand op de harde schijf (`dagboek.sqlite`) |
| **Datastructuur** | Sleutel-waarde paren (JSON tekst) | Relationele tabellen met typed kolommen & foreign keys |
| **Query mogelijkheden** | JavaScript filters | Krachtige SQL queries (`JOIN`, `GROUP BY`, indexering) |
| **Multi-user ondersteuning** | Nee (slechts 1 browser sessie) | Ja (`users` tabel met `user_id` relatie) |
| **Backups & Exporteren** | Gevoelig voor browser-opruiming | Eenvoudig bestand `.sqlite` kopiëren of downloaden |

---

### Slide 11 & 12: Werken met API Keys & Gemini AI
> *"Waarom werkt de spreuk niet meer in productie zonder API key en hoe lossen we dit op?"*

Een API key in frontend code is zichtbaar voor iedereen in de netwerkinspecteur van de browser. In dit project draait de aanroep via de backend:
- Lokaal: via de endpoint `/api/spreuk` in `server/server.js`.
- Vercel: statische client-side fallback naar gecureerde Nederlandse wijsheden over technologie en groei.
Beide omgevingen werken direct zonder configuratie.

---

## 2. Frontend Design Principes

Conform de **frontend-design** richtlijnen:
- **Rustgevend & Focusgericht**: Een harmonieus porselein- en zacht mistpalet met leisteenblauwe accenten en diep houtskool voor ultiem contrast.
- **Niet-AI Typografie**: *Satoshi* (Fontshare) voor de interface & koppen, *Schibsted Grotesk* (Google Fonts) voor redactionele bodytekst, en *Instrument Serif* voor het dagelijkse citaat.
- **10-Dagen Mood Horizon**: Een minimalistische sparkline vectorcurve met automatische detectie van gemoedstoestand-schommelingen.

---

## 3. Modulaire Architectuur & Bestandsstructuur

| Bestand | Rol & Verantwoordelijkheid |
| :--- | :--- |
| `server/server.js` | Lokale Node.js 22 HTTP server met REST API endpoints voor auth, entries en database inspectie. |
| `server/db.js` | SQLite DatabaseSync manager, tabellen initialisatie, password hashing en queries. |
| `dagboek.sqlite` | Het daadwerkelijke SQLite databasebestand. |
| `index.html` | Semantische HTML5 hoofdstructuur met Database Inspector & Modals. |
| `css/style.css` | Design tokens, responsieve layout, dark/light mode en databasetabellen. |
| `js/questions.js` | Modulaire vraag- en moodconfiguraties. |
| `js/storage.js` | Client storage manager met SQLite REST API synchronisatie en LocalStorage fallback. |
| `js/mood-chart.js` | 10-dagen interactieve SVG mood curve & trendanalyse. |
| `js/quotes.js` | AI spreukgenerator met Google Gemini & gecureerde fallbacks. |
| `js/app.js` | Hoofdscript: coördinatie, formulierafhandeling, modal dialogen en sneltoetsen. |
| `api/spreuk.js` | Vercel Serverless Function voor Gemini AI Dagspreuk. |
| `api/db.js` | Vercel Serverless Function voor database inspectie. |

---

*Gemaakt door Daan Hessen voor de Minor Futureproof met AI! aan de Hogeschool Utrecht.*
