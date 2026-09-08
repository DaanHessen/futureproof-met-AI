# Digitaal Dagboekje — Futureproof met AI! (met SQLite Database)

Een modern, minimalistisch en responsief digitaal reflectie- en leerdagboek, ontwikkeld voor de minor **Futureproof met AI!** aan de **Hogeschool Utrecht (HU)**.

Uitgerust met een **lokale SQLite database** (`dagboek.sqlite`), authenticatie (zonder e-mailbevestiging), een ingebouwde **Database Inspector & SQL Console**, een **10-dagen interactieve mood visualisatie**, dynamische **Google Gemini AI Dagspreuk** en **Excel export**.

---

## Inhoudsopgave
1. [Overzicht van functionaliteiten](#overzicht-van-functionaliteiten)
2. [User Stories uit Week 2 (Slides 13, 14 & 15)](#user-stories-uit-week-2)
3. [Lokale installatie & SQLite Starten](#lokale-installatie--sqlite-starten)
4. [Werken met de SQLite Database (Slide 15)](#werken-met-de-sqlite-database-slide-15)
5. [Publiceren naar Vercel](#publiceren-naar-vercel)
6. [Google Gemini API Key instellen](#google-gemini-api-key-instellen)
7. [Dataopslag: Vragen & Vergelijking](#dataopslag-vragen--vergelijking)
8. [Modulaire opbouw (Aanpassingen maken)](#modulaire-opbouw-aanpassingen-maken)
9. [Architectuur](#architectuur)

---

## Overzicht van functionaliteiten

- **Lokale SQLite Database**: Echte relationele database (`dagboek.sqlite`) beheerd via Node.js 22 built-ins (zero npm install required).
- **Ingebouwde Database Inspector (🗄️ Database)**:
  - Bekijk direct de tabel `entries` (Slide 15 item 5).
  - Bekijk de tabel `users` en vind jezelf als geregistreerde gebruiker terug (Slide 15 item 6).
  - Interactieve **SQL Console** om rechtstreeks `SELECT`-queries uit te voeren.
  - Knop *"⚡ 5 Entries toevoegen"* (Slide 15 item 4) voor snelle initialisatie.
  - Knop *"💾 Download DB"* om het `.sqlite` bestand te downloaden.
- **Account & Authenticatie**: Registreer en log direct in zonder e-mailbevestiging (Slide 15 item 2 & 3).
- **Reflecteren per datum**: Schakel soepel tussen vandaag, gisteren of eerdere dagen via de interactieve 7-dagen strip, pijltjesknoppen of datumkiezer.
- **Gemoedstoestand (1 tot 5 sterren)**: Geef met één klik aan hoe je dag verloopt (van *Moeizaam* tot *Fantastisch*), inclusief visuele sterren en emoji's.
- **Drie kernvragen voor persoonlijke groei**:
  1. *Wat heb ik gisteren gedaan?* (Activiteiten & terugblik)
  2. *Wat heb ik van gisteren geleerd?* (Reflectie & AI-inzichten)
  3. *Wat ga ik vandaag doen?* (Focus & doelen)
- **Automatisch opslaan (Auto-save)**: Je invoer wordt tijdens het typen direct opgeslagen in zowel SQLite als LocalStorage.
- **10-Dagen Mood Horizon**: Een responsieve SVG-grafiek die je gemoedstoestand over de afgelopen 10 dagen toont, inclusief trendanalyse en detectie van eventuele moodswings (Slide 14).
- **AI Spreuk van de Dag**:
  - Dynamisch gegenereerd door **Google Gemini AI** via `/api/spreuk`.
  - Knop *"Nieuwe spreuk"* voor een nieuw citaat.
  - Slimme fallback met 15+ Nederlandstalige citaten over AI en persoonlijke groei.
- **Excel Export**: Download al je notities naar een echt Microsoft Excel-bestand (`.xlsx`) of Nederlands CSV-bestand met `;`.
- **Dark & Light Mode**: Schakel eenvoudig tussen een minimalistisch licht thema en rustgevend donker thema.

---

## User Stories uit Week 2

Conform de opdrachten uit de presentatie (*Week 2 - Vibecoding v3*):

### Slide 13 (Lovable prompt / Dagboekje)
1. **Datumselectie**: *Als gebruiker wil ik eerst op een specifieke datum kunnen klikken, zodat ik de dagboekvragen voor die specifieke dag kan beantwoorden.*
2. **Gemoedstoestand**: *Als gebruiker wil ik kunnen aangeven hoe het vandaag gaat met een score van 1 tot 5 sterren, zodat ik visueel inzicht krijg in mijn dagelijkse gemoedstoestand.*
3. **Gisteren gedaan**: *Als gebruiker wil ik kunnen invullen wat ik gisteren heb gedaan, zodat ik een overzicht heb van mijn activiteiten.*
4. **Gisteren geleerd**: *Als gebruiker wil ik kunnen invullen wat ik van gisteren heb geleerd, zodat ik bewust kan stilstaan bij mijn persoonlijke groei.*
5. **Vandaag doen**: *Als gebruiker wil ik kunnen vastleggen wat ik vandaag ga doen, zodat ik met focus en een duidelijk doel aan mijn dag begin.*

### Slide 14 (Moodswings)
6. **10-Dagen Moodverloop**: *Als gebruiker wil ik kunnen zien hoe mijn mood zich ontwikkelt over de laatste 10 dagen, zodat ik inzicht krijg in eventuele moodswings.*

### Slide 15 (Werken met een database)
7. **Database aanmaken**: Lokale SQLite database (`dagboek.sqlite`).
8. **Registratie zonder emailbevestiging**: Direct registreren en inloggen.
9. **5 Nieuwe entries**: Eenvoudig aanmaken of via de knop *"⚡ 5 Entries toevoegen"*.
10. **Database inspectie**: Bekijk alle rijen in `entries` en vind jezelf terug in `users`.

---

## Lokale installatie & SQLite Starten

Dankzij Node.js 22 zijn er **geen externe dependencies** nodig (`node:sqlite` zit ingebouwd in Node).

### Start de lokale server met SQLite:
```bash
npm start
# of: node server.js
```

Open vervolgens je browser op:
👉 **`http://localhost:3000`**

---

## Werken met de SQLite Database (Slide 15)

1. **Registreren & Inloggen**:
   - Klik rechtsboven op **"Inloggen"**.
   - Kies het tabblad **"Registreren (zonder email)"** of klik op **"⚡ Snelle demo login"**.
   - Vul je e-mailadres en wachtwoord in en klik op **"Account Aanmaken"**. Je bent direct ingelogd!
2. **Entries toevoegen**:
   - Vul je dagboekvragen en sterren in voor vandaag of kies een datum.
   - Of klik in de voettekst / Database Inspector op **"⚡ 5 Entries toevoegen"** om in één keer 5 representatieve dagen toe te voegen.
3. **Database Inspecteren**:
   - Klik bovenin op de knop **"🗄️ Database"**.
   - **Tab `entries`**: Hier zie je alle opgeslagen dagboeknotities, mood scores en datums.
   - **Tab `users`**: Hier vind je jezelf terug met je gebruikers-ID, e-mail en registratiedatum (aangegeven met een *"Jij"* badge).
   - **Tab `SQL Console`**: Voer live queries uit zoals:
     ```sql
     SELECT date, mood, today_planned FROM entries WHERE mood >= 4;
     ```

---

## Publiceren naar Vercel

1. **GitHub Repository**:
   De code staat op GitHub: [`https://github.com/DaanHessen/futureproof-met-AI`](https://github.com/DaanHessen/futureproof-met-AI).
2. **Importeer in Vercel**:
   - Ga naar [vercel.com](https://vercel.com) en klik op **"Add New..."** -> **"Project"**.
   - Selecteer `futureproof-met-AI` en klik op **"Import"**.
3. **Deploy**:
   - Framework Preset: **Other**
   - Klik op **"Deploy"**.

---

## Google Gemini API Key instellen

1. Haal een gratis API key op via [Google AI Studio](https://aistudio.google.com/).
2. Stel deze in Vercel in onder **Project Settings** -> **Environment Variables**:
   - Key: `GEMINI_API_KEY`
   - Value: `AIzaSy...`
3. Her-deploy. De serverless endpoint `/api/spreuk` genereert nu dagelijks verse quotes met Gemini AI!

---

## Dataopslag: Vragen & Vergelijking

| Eigenschap | LocalStorage | SQLite (`dagboek.sqlite`) |
| :--- | :--- | :--- |
| **Locatie** | Browser client-side | Lokaal bestand op server/schijf |
| **Datamodel** | Sleutel/waarde (JSON strings) | Gestructureerd relationeel (SQL tabellen, foreign keys) |
| **Relaties (Users/Entries)** | Handmatig parsen | Automatisch via `FOREIGN KEY (user_id) REFERENCES users(id)` |
| **Query mogelijkheden** | JavaScript filter/map | Volledige SQL (`SELECT`, `JOIN`, `WHERE`, `GROUP BY`) |
| **Backups** | Afhankelijk van browser cache | Eenvoudig bestand kopiëren (`dagboek.sqlite`) |

---

## Modulaire opbouw (Aanpassingen maken)

Wil je nieuwe reflectievragen toevoegen? Open [`js/questions.js`](file:///home/daanh/Projects/code/school/futureproof-met-ai/dagboek/js/questions.js):

```javascript
export const journalQuestions = [
  {
    id: "yesterday_done",
    number: "01",
    tag: "Terugblik",
    title: "Wat heb ik gisteren gedaan?",
    subtitle: "Geef een overzicht van je activiteiten...",
    placeholder: "Beschrijf kort...",
    rows: 4
  }
];
```

---

## Architectuur

```
dagboek/
├── server.js           # Lokale Node.js 22 HTTP server & REST API
├── db.js               # SQLite DatabaseSync manager & schema migraties
├── dagboek.sqlite      # SQLite database bestand (automatisch aangemaakt)
├── index.html          # Semantische HTML5 layout met Database Inspector & Modals
├── package.json        # Start scripts (zero npm dependencies)
├── css/
│   └── style.css       # Design tokens, responsieve layout & database tabellen
├── js/
│   ├── app.js          # Coördinatie, formulierverwerking, auth & database events
│   ├── questions.js    # Modulaire vraag- en mood-definities
│   ├── storage.js      # SQLite backend synchronisatie, LocalStorage & Excel export
│   ├── mood-chart.js   # 10-Dagen interactieve SVG mood curve & trendanalyse
│   └── quotes.js       # AI spreukgenerator met Google Gemini & fallbacks
├── api/
│   ├── spreuk.js       # Vercel Serverless Function voor Gemini AI
│   └── db.js           # Vercel Serverless Function voor database inspectie
├── vercel.json         # Vercel deployment configuratie
├── .gitignore          # Git uitsluitingen
├── README.md           # Deze documentatie
└── DOCUMENTATIE.md     # Technische verantwoording & didactische reflectie
```

---

*Gemaakt door Daan Hessen voor de Minor Futureproof met AI! aan de Hogeschool Utrecht.*
