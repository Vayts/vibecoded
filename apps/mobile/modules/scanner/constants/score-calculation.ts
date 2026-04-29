export const SCORE_CALCULATION = [
  {
    title: 'Nutritional value',
    text: [
      'We analyze key nutrients such as sugar, salt, saturated fat, calories, protein, and fiber.',
      'Lower levels of sugar, salt, and unhealthy fats improve the score. Higher levels of protein and fiber increase the score. Moderate values are considered neutral.',
    ],
  },
  {
    title: 'Product category context',
    text: [
      'Foods are evaluated within their category (e.g. beverages, snacks, dairy). This ensures fair comparisons — for example, higher calories may be expected in snacks but not in drinks.',
    ],
  },
  {
    title: 'Diet compatibility',
    text: [
      'We check whether the product aligns with your dietary preferences (e.g. vegan, gluten-free).',
    ],
    list: [
      'Compatible products receive a positive impact.',
      'Conflicts significantly reduce the score.',
    ],
  },
  {
    title: 'Allergens',
    text: [
      'If a product contains ingredients you are allergic to, the score is strongly reduced regardless of other factors.',
    ],
  },
  {
    title: 'Additives',
    text: ['Products containing additives are flagged and may negatively affect the evaluation.'],
  },
  {
    title: 'Nutri-Score (if available)',
    text: ['Official Nutri-Score ratings (A–E) are incorporated into the score:'],
    list: ['A/B improve the score.', 'D/E lower it.'],
  },
  {
    title: 'Your personal goals',
    text: ['The score adapts to your goals, such as:'],
  },
];
