# Technische Documentatie & Ontwerpkeuzes — Digitaal Dagboek

Dit document beschrijft de architectuur, ontwerpfilosofie en de didactische beantwoording van de opdrachten uit **Week 2 — Vibecoding** van de Minor *Futureproof met AI!* (Hogeschool Utrecht).

---

## 1. Didactische Verantwoording (Collegevragen)

In de presentatie van Gert van Hardeveld worden verschillende onderzoeksvragen gesteld:

### Vraag 4 & 5: Dataopslag en analyse
> *"Zoek eens op waar je data nu staat. Vraag het aan AI en kijk eens of je de data ook kunt vinden? Wat is het voordeel van deze opslag en wat is het nadeel?"*

#### Waar staat de data?
De data bevindt zich in de `window.localStorage` van de browser, onder de sleutel `fp_dagboek_entries_v1`. Dit is een client-side key-value store die persistent blijft zolang de browser cache niet expliciet gewist wordt. In de browser-ontwikkelaarstools (`F12` -> *Application* of *Storage* -> *Local Storage*) is de volledige JSON-structuur per datum in te zien en te bewerken.

#### Voordelen:
1. **Privacy-by-design**: Geen servers die persoonlijke reflecties verzamelen. Voldoet optimaal aan de AVG/GDPR principes.
2. **Zero-latency**: Geen netwerklatentie bij opslaan of opvragen; direct interactief.
3. **Offline-first**: De gebruiker kan altijd notities bijwerken, zelfs zonder netwerkverbinding.
4. **Geen operationele kosten**: Geen cloud databases (zoals Supabase of Firebase) nodig.

#### Nadelen:
1. **Apparaatsgebondenheid**: Geen cross-device synchronisatie tussen desktop en smartphone.
2. **Kwetsbaarheid voor opschoning**: Als een gebruiker browsergegevens wist, gaat de lokale opslag verloren (gecompenseerd door de ingebouwde Excel/CSV-export).
3. **Opslaglimiet**: Browsers hanteren meestal een quotum van 5MB tot 10MB (voor tekstuele dagboeknotities is dit overigens ruim voldoende voor jaren aan data).

---

### Vraag over API-keys (Slide 11 & 12)
> *"Waarom werkt de spreuk niet meer in productie zonder API key configuratie en hoe lossen we dit op?"*

Wanneer een client-side applicatie direct communiceert met Google Gemini via een in de code geschreven API key, ligt die sleutel open en bloot in de broncode op GitHub. Iedereen met toegang tot de repository kan deze sleutel ontvreemden.

#### Onze Oplossing:
In dit project is een hybride architectuur geïmplementeerd:
1. **Vercel Serverless Function (`api/spreuk.js`)**:
   De serverless functie draait in Node.js op de Vercel infrastructuur. Hier wordt `process.env.GEMINI_API_KEY` uitgelezen. De bezoeker in de browser ziet enkel het resultaat van de gegenereerde spreuk en nooit de sleutel zelf.
2. **Graceful Degradation**:
   Als er nog geen sleutel is ingesteld op Vercel of als de app lokaal offline geopend wordt, crasht de applicatie niet. In plaats daarvan wordt automatisch een inspirerende, zorgvuldig gecureerde Nederlandse AI-spreuk getoond, met een duidelijke melding in de console en instellingen hoe de gebruiker zijn sleutel kan toevoegen.

---

## 2. Frontend Design Principes

Volgens de *Frontend Design* richtlijnen is gekozen voor een ontwerp dat ver weg blijft van generieke AI-sjablonen (zoals overdadig warm-crème met terracotta of schreeuwerig cyberpunk neongroen).

### Visual Identity & Karakter
- **Sfeer**: Helder, sereen, minimalistisch en focus-gedreven. De interface dient als een rustige digitale werkplek voor dagelijkse introspectie en focus.
- **Kleurpalet**:
  - Mist & Leisteen basis (`#f8fafc` / `#090d16`)
  - Subtiele, haarscherpe verdelers (`#e2e8f0` / `#1f293d`)
  - Accentkleur: Diep elektrisch blauw (`#2563eb`) en smaragdgroen (`#059669`) voor succes- en opslagstatussen.
  - Gemoedstoestand-accenten: Warm amber (`#d97706` / `#f59e0b`) voor de 1-5 sterren component.
- **Typografisch Systeem**:
  - *Plus Jakarta Sans*: Voor de interface, koppen en tekstvelden (moderne neo-grotesk met uitstekende schermleesbaarheid).
  - *JetBrains Mono*: Voor badges, datums en technische metadata.
  - *Cursief serif/italic styling*: Voor het AI citaat, waardoor de spreuk een reflectief en tijdloos karakter krijgt.
- **Signature Element**:
  - De **10-Dagen Mood Horizon**: Een dynamische, interactieve vectorgrafiek (SVG) met een zachte gradient curve en zwevende tooltips die in één oogopslag inzicht biedt in mentale stabiliteit en veerkracht.

---

## 3. Modulaire Code Architectuur

De code is strikt opgedeeld volgens het Single Responsibility Principle (SRP):

| Bestand | Verantwoordelijkheid |
| :--- | :--- |
| `index.html` | Semantische structuur, toegankelijkheid (WAI-ARIA) en modal containers. |
| `css/style.css` | Design tokens, CSS-variabelen, dark mode media-queries en responsieve breakpoints. |
| `js/questions.js` | Modulaire configuratie van reflectievragen en gemoedstoestanden. |
| `js/storage.js` | LocalStorage CRUD-operaties, streak-berekening en Excel/CSV generatie. |
| `js/mood-chart.js` | SVG rendering, Bezier curve wiskunde, tooltips en moodswing trendanalyse. |
| `js/quotes.js` | AI API integratie, caching per datum en lokale gecureerde spreuken. |
| `js/app.js` | Hoofdcoördinatie, formulierverwerking, debounce auto-save en sneltoetsen. |
| `api/spreuk.js` | Vercel Serverless Function voor veilige Google Gemini integratie. |

---

## 4. Toegankelijkheid (A11y) & Sneltoetsen

- Volledig te bedienen via toetsenbord (`Tab`, `Shift+Tab`, `Space`, `Enter`).
- Handige sneltoetsen:
  - `Alt + ←`: Vorige dag
  - `Alt + →`: Volgende dag
  - `T`: Direct naar Vandaag springen
- Hoge contrastverhoudingen (WCAG 2.1 AA compliant) in zowel lichte als donkere modus.
