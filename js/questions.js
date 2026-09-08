/**
 * Modulaire configuratie voor het digitaal dagboek.
 * 
 * Dit bestand definieert alle reflectievragen en gemoedstoestanden.
 * Wil je in de toekomst een vraag toevoegen of aanpassen?
 * Dat kan eenvoudig door dit bestand aan te passen.
 */

export const moodOptions = [
  {
    value: 1,
    label: "Moeizaam",
    stars: 1,
    emoji: "🌧️",
    description: "Veel tegenslag of lage energie",
    color: "#ef4444"
  },
  {
    value: 2,
    label: "Matig",
    stars: 2,
    emoji: "⛅",
    description: "Niet optimaal, kan beter",
    color: "#f97316"
  },
  {
    value: 3,
    label: "Neutraal",
    stars: 3,
    emoji: "🌤️",
    description: "Rustige, evenwichtige dag",
    color: "#eab308"
  },
  {
    value: 4,
    label: "Goed",
    stars: 4,
    emoji: "☀️",
    description: "Productief, energiek en fijn",
    color: "#10b981"
  },
  {
    value: 5,
    label: "Fantastisch",
    stars: 5,
    emoji: "🚀",
    description: "In de flow, grote stappen gezet",
    color: "#3b82f6"
  }
];

export const journalQuestions = [
  {
    id: "yesterday_done",
    number: "01",
    tag: "Terugblik",
    title: "Wat heb ik gisteren gedaan?",
    subtitle: "Geef een overzicht van je activiteiten, taken en waar je je tijd aan hebt besteed.",
    placeholder: "Beschrijf kort wat je gisteren hebt ondernomen...",
    rows: 4
  },
  {
    id: "yesterday_learned",
    number: "02",
    tag: "Groei & Inzicht",
    title: "Wat heb ik van gisteren geleerd?",
    subtitle: "Reflecteer bewust op nieuwe kennis, inzichten, fouten of vaardigheden.",
    placeholder: "Welk inzicht, aha-moment of leerpunt neem je mee?",
    rows: 4
  },
  {
    id: "today_planned",
    number: "03",
    tag: "Focus & Doel",
    title: "Wat ga ik vandaag doen?",
    subtitle: "Stel duidelijke prioriteiten zodat je met focus en een helder doel aan je dag begint.",
    placeholder: "Wat zijn je belangrijkste doelen of acties voor vandaag?",
    rows: 4
  }
];
