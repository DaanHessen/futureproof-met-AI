/**
 * js/questions.js
 * Modulaire dagboekvragen en gemoedstoestanden.
 * Eenvoudig, natuurlijk en zonder overbodige decoratie.
 */

export const moodOptions = [
  { value: 1, label: "Moeizaam", stars: 1, emoji: "🌧️" },
  { value: 2, label: "Matig", stars: 2, emoji: "⛅" },
  { value: 3, label: "Neutraal", stars: 3, emoji: "🌤️" },
  { value: 4, label: "Goed", stars: 4, emoji: "☀️" },
  { value: 5, label: "Fantastisch", stars: 5, emoji: "🚀" }
];

export const journalQuestions = [
  {
    id: "yesterday_done",
    title: "Wat heb ik gisteren gedaan?",
    placeholder: "Kort overzicht van je activiteiten, taken en waar je je tijd aan hebt besteed...",
    rows: 4
  },
  {
    id: "yesterday_learned",
    title: "Wat heb ik van gisteren geleerd?",
    placeholder: "Inzichten, ontdekkingen, wat werkte goed of wat kan de volgende keer beter...",
    rows: 4
  },
  {
    id: "today_planned",
    title: "Wat ga ik vandaag doen?",
    placeholder: "Doelen, prioriteiten en intenties om met focus aan de dag te beginnen...",
    rows: 4
  }
];
