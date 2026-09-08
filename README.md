# Digitaal Dagboekje — Futureproof met AI!

Een modern, minimalistisch en responsief digitaal reflectie- en leerdagboek, ontwikkeld voor de minor **Futureproof met AI!** aan de **Hogeschool Utrecht (HU)**.

Gebouwd met vanilla JavaScript (ES modules), moderne CSS met CSS-variabelen en semantische HTML5. Geen zware frameworks of build-stappen nodig: direct klaar voor hosting op **Vercel** via GitHub.

---

## Inhoudsopgave
1. [Overzicht van functionaliteiten](#overzicht-van-functionaliteiten)
2. [User Stories uit Week 2](#user-stories-uit-week-2)
3. [Lokale installatie & gebruik](#lokale-installatie--gebruik)
4. [Publiceren naar Vercel (Stap-voor-stap)](#publiceren-naar-vercel-stap-voor-stap)
5. [Google Gemini API Key instellen](#google-gemini-api-key-instellen)
6. [Dataopslag: Vragen & Inzichten](#dataopslag-vragen--inzichten)
7. [Modulaire opbouw (Aanpassingen maken)](#modulaire-opbouw-aanpassingen-maken)
8. [Architectuur](#architectuur)

---

## Overzicht van functionaliteiten

- **Reflecteren per datum**: Schakel soepel tussen vandaag, gisteren of eerdere dagen via de interactieve 7-dagen strip, pijltjesknoppen of de datumkiezer.
- **Gemoedstoestand (1 tot 5 sterren)**: Geef met één klik aan hoe je dag verloopt (van *Moeizaam* tot *Fantastisch*), inclusief visuele sterren en emoji's.
- **Drie kernvragen voor persoonlijke groei**:
  1. *Wat heb ik gisteren gedaan?* (Activiteiten & terugblik)
  2. *Wat heb ik van gisteren geleerd?* (Reflectie & AI-inzichten)
  3. *Wat ga ik vandaag doen?* (Focus & doelen)
- **Automatisch opslaan (Auto-save)**: Je invoer wordt tijdens het typen met een subtiele debounce direct en lokaal opgeslagen.
- **10-Dagen Mood Horizon**: Een interactieve, responsieve SVG-grafiek die je gemoedstoestand over de afgelopen 10 dagen toont, inclusief trendanalyse en detectie van eventuele moodswings.
- **AI Spreuk van de Dag**:
  - Dynamisch gegenereerd door **Google Gemini AI** via een veilige Vercel Serverless Function (`/api/spreuk`).
  - Knop *"Nieuwe spreuk"* om een nieuwe inspirerende quote op te halen.
  - Intelligente fallback op een rijke verzameling Nederlandse quotes over AI, innovatie en veerkracht.
- **Excel Export**: Download al je dagboeknotities naar een écht Microsoft Excel-bestand (`.xlsx`) of een geoptimaliseerd Nederlands CSV-bestand (met `;` scheidingsteken en UTF-8 BOM).
- **Dark & Light Mode**: Schakel eenvoudig tussen een minimalistisch licht thema en een rustgevend donker thema (onthoudt voorkeur).
- **Volledig responsief**: Werkt optimaal op desktop, tablet en mobiele telefoon.

---

## User Stories uit Week 2

Conform de opdrachten uit de presentatie (*Week 2 - Vibecoding v3*):

1. **Datumselectie**: *Als gebruiker wil ik eerst op een specifieke datum kunnen klikken, zodat ik de dagboekvragen voor die specifieke dag kan beantwoorden.*
2. **Gemoedstoestand**: *Als gebruiker wil ik kunnen aangeven hoe het vandaag gaat met een score van 1 tot 5 sterren, zodat ik visueel inzicht krijg in mijn dagelijkse gemoedstoestand.*
3. **Gisteren gedaan**: *Als gebruiker wil ik kunnen invullen wat ik gisteren heb gedaan, zodat ik een overzicht heb van mijn activiteiten.*
4. **Gisteren geleerd**: *Als gebruiker wil ik kunnen invullen wat ik van gisteren heb geleerd, zodat ik bewust kan stilstaan bij mijn persoonlijke groei.*
5. **Vandaag doen**: *Als gebruiker wil ik kunnen vastleggen wat ik vandaag ga doen, zodat ik met focus en een duidelijk doel aan mijn dag begin.*
6. **Mood trend & moodswings**: *Als gebruiker wil ik kunnen zien hoe mijn mood zich ontwikkelt over de laatste 10 dagen, zodat ik inzicht krijg in eventuele moodswings.*
7. **Spreuk van de dag**: *Als gebruiker wil ik dagelijks een inspirerende AI-spreuk zien en een knop hebben voor een nieuwe spreuk.*
8. **Excel Download**: *Als gebruiker wil ik alle dagboek entries met één klik kunnen downloaden naar Excel.*

---

## Lokale installatie & gebruik

Er zijn **geen build tools** (zoals npm, vite of webpack) vereist. Het project gebruikt moderne ES modules.

### Optie 1: Direct in de browser openen
Open `index.html` simpelweg in je webbrowser (Chrome, Brave, Firefox of Edge).

### Optie 2: Lokale ontwikkelserver (aanbevolen voor ES Modules)
Open een terminal in de projectmap en start een lokale webserver:

```bash
# Met Python 3
python3 -m http.server 3000

# Of met Node (npx)
npx serve .
```

Ga vervolgens naar `http://localhost:3000` in je browser.

---

## Publiceren naar Vercel (Stap-voor-stap)

Zoals behandeld op slide 10 van het college:

1. **GitHub Repository**:
   De code staat al op je GitHub repository (`https://github.com/DaanHessen/futureproof-met-AI`).
2. **Account bij Vercel**:
   Ga naar [vercel.com](https://vercel.com) en log in met je GitHub-account.
3. **Nieuw project importeren**:
   - Klik op **"Add New..."** -> **"Project"**.
   - Zoek naar de repository `futureproof-met-AI` en klik op **"Import"**.
4. **Instellingen & Deploy**:
   - Project Name: bijvoorbeeld `dagboek-futureproof`
   - Framework Preset: **Other** (standaard statische HTML/JS)
   - Root Directory: `./` (standaard)
   - Klik op **"Deploy"**.
5. **Klaar!**
   Vercel controleert je code en publiceert je website binnen enkele seconden naar een live `.vercel.app` URL.

---

## Google Gemini API Key instellen

Zoals uitgelegd op slide 11 & 12 van het college:

### Waarom een Environment Variable?
Een API-sleutel mag **nooit** direct in de frontend JavaScript code gezet worden. Als je code op GitHub staat, kan iedereen je sleutel kopiëren en jouw Google AI tokens verbruiken. 

In dit project wordt de sleutel veilig beheerd via een serverloze backend-functie (`/api/spreuk.js`), die op de servers van Vercel draait en niet toegankelijk is voor bezoekers.

### Stap-voor-stap in Vercel instellen:
1. Haal een gratis API-sleutel op via [Google AI Studio](https://aistudio.google.com/).
2. Ga in Vercel naar je project dashboard.
3. Klik op **Settings** -> **Environment Variables**.
4. Voeg een nieuwe variabele toe:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Plak hier je sleutel (bijv. `AIzaSy...`)
   - **Environments**: Vink *Production*, *Preview* en *Development* aan.
5. Klik op **Save**.
6. Trigger een her-deploy (of doe een nieuwe commit) zodat Vercel de nieuwe variabele inlaadt.

*Tip: Als je lokaal test zonder Vercel, kun je via het tandwiel-icoontje (rechtsboven) ook tijdelijk lokaal een API-sleutel invullen.*

---

## Dataopslag: Vragen & Inzichten

Uit Slide 7 van de les:

### 1. Waar staat je data nu?
De dagboek-data wordt bewaard in de **LocalStorage** van je eigen webbrowser.
Je kunt dit zelf inspecteren:
- Druk op `F12` in je browser (of rechtermuisknop -> *Inspecteren*).
- Ga naar het tabblad **Applicatie** (Chrome/Brave) of **Opslag** (Firefox).
- Klik in het linkermenu onder **Lokale opslag** (Local Storage) op je website-URL.
- Je ziet daar de sleutel `fp_dagboek_entries_v1` staan met een JSON-object van al jouw dagelijkse antwoorden!

### 2. Wat is het voordeel van deze opslag?
- **Privacy & Veiligheid**: Je persoonlijke gedachten, reflecties en gemoedstoestand blijven 100% op jouw eigen apparaat. Er gaat geen persoonlijke tekst naar externe databases of cloudaanbieders.
- **Snelheid**: Data wordt direct in fracties van milliseconden opgeslagen en ingeladen.
- **Offline beschikbaar**: De app werkt ook vlekkeloos zonder internetverbinding (bijvoorbeeld in de trein).
- **Geen onderhoudskosten**: Er is geen dure externe database-server nodig.

### 3. Wat is het nadeel van deze opslag?
- **Niet gesynchroniseerd over meerdere apparaten**: Notities die je op je laptop maakt, zijn niet automatisch zichtbaar op je telefoon.
- **Kans op dataverlies bij browseropruiming**: Als je je browsergeschiedenis/sitegegevens wist, kan ook de LocalStorage gewist worden.
  - *Oplossing*: Gebruik regelmatig de knop **"Excel Export"** om een veilige backup op te slaan!

---

## Modulaire opbouw (Aanpassingen maken)

Wil je nieuwe vragen toevoegen of bestaande vragen herformuleren? Dat kan in één enkel bestand!

Open [`js/questions.js`](file:///home/daanh/Projects/code/school/futureproof-met-ai/dagboek/js/questions.js):

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
  },
  // Voeg hier eenvoudig een vraag 04 toe!
];
```

De applicatie past zich automatisch aan: de nieuwe vraag verschijnt direct in de gebruikersinterface, wordt meegenomen in de auto-save en belandt automatisch in de geëxporteerde Excel-kolommen.

---

## Architectuur

```
dagboek/
├── index.html          # Semantische HTML5 hoofdstructuur
├── css/
│   └── style.css       # Design tokens, typografie, responsieve layout & animaties
├── js/
│   ├── app.js          # Coördinatie, events, datepicker en formulieren
│   ├── questions.js    # Modulaire vraag- en mood-definities
│   ├── storage.js      # LocalStorage beheer, statistieken en Excel export
│   ├── mood-chart.js   # 10-Dagen interactieve SVG mood curve & trendanalyse
│   └── quotes.js       # AI spreukgenerator met Google Gemini & curated fallbacks
├── api/
│   └── spreuk.js       # Vercel Serverless Function voor veilige Google AI Studio aanroep
├── vercel.json         # Vercel configuratie
├── .gitignore          # Git uitsluitingen
└── README.md           # Deze documentatie
```

---

*Gemaakt door Daan Hessen voor de Minor Futureproof met AI! aan de Hogeschool Utrecht.*
