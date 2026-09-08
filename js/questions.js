/**
 * js/questions.js
 * Modulaire dagboekvragen en gemoedstoestanden.
 * Professioneel, minimalistisch en vrij van emoji-ruis.
 */

export const moodOptions = [
  { value: 1, label: "Moeizaam", stars: 1 },
  { value: 2, label: "Matig", stars: 2 },
  { value: 3, label: "Neutraal", stars: 3 },
  { value: 4, label: "Goed", stars: 4 },
  { value: 5, label: "Fantastisch", stars: 5 }
];

export const journalQuestions = [
  {
    id: "yesterday_done",
    title: "Wat heb ik gisteren gedaan?",
    placeholder: "Overzicht van activiteiten, voltooide taken en werkzaamheden...",
    rows: 4
  },
  {
    id: "yesterday_learned",
    title: "Wat heb ik van gisteren geleerd?",
    placeholder: "Reflectie op nieuwe kennis, inzichten of vaardigheden...",
    rows: 4
  },
  {
    id: "today_planned",
    title: "Wat ga ik vandaag doen?",
    placeholder: "Belangrijkste prioriteiten, doelen en focus voor vandaag...",
    rows: 4
  }
];
