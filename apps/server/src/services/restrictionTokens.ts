/**
 * Multilingual token lists for dietary restriction conflict detection.
 * Each list covers English + French, German, Spanish, Italian, Slavic, Dutch, Portuguese.
 * Cyrillic tokens use substring matching (JS \b doesn't support Unicode word boundaries).
 */

const PLANT_BASED_DAIRY_EXCLUDE = [
  /\b(?:cocoa|shea|peanut|almond|cashew|mango|avocado|kokum|sal)\s+butter/i,
  /\b(?:coconut|almond|oat|soy|rice|hemp|cashew|hazelnut)\s+(?:milk|cream|yogurt|cheese)/i,
  /\bbutterscotch\b/i,
];

const VEGAN_TOKENS = [
  'meat', 'beef', 'chicken', 'pork', 'fish', 'tuna', 'salmon', 'shellfish', 'shrimp', 'crab',
  'dairy', 'milk', 'whey', 'butter', 'cheese', 'cream', 'yogurt', 'egg', 'honey', 'gelatin',
  'lard', 'tallow', 'suet', 'bacon', 'ham', 'sausage', 'turkey', 'lamb', 'duck', 'anchovy',
  'collagen', 'casein', 'lactose',
  'porc', 'boeuf', 'poulet', 'viande', 'poisson', 'lait', 'fromage', 'oeuf', 'miel',
  'gélatine', 'beurre', 'crème',
  'schwein', 'rind', 'huhn', 'hähnchen', 'fleisch', 'fisch', 'milch', 'käse', 'sahne',
  'honig', 'gelatine',
  'cerdo', 'carne', 'pollo', 'pescado', 'leche', 'queso', 'huevo', 'mantequilla',
  'maiale', 'manzo', 'pesce', 'latte', 'formaggio', 'uova',
  'свинина', 'свинін', 'яловичина', 'курятина', 'курка', "м'ясо", 'мясо', 'риба', 'рыба',
  'молоко', 'масло', 'яйц', 'мед', 'желатин',
  'wieprzow', 'wołowin', 'kurczak', 'mięs', 'mleko', 'jaj',
  'varken', 'kip', 'vlees', 'vis', 'melk', 'kaas',
  'porco', 'frango', 'peixe', 'leite', 'queijo', 'ovo',
];

const VEGETARIAN_TOKENS = [
  'meat', 'beef', 'chicken', 'pork', 'fish', 'tuna', 'salmon', 'shellfish', 'shrimp', 'crab',
  'gelatin', 'lard', 'tallow', 'suet', 'bacon', 'ham', 'sausage', 'turkey', 'lamb', 'duck',
  'anchovy',
  'porc', 'boeuf', 'poulet', 'viande', 'poisson', 'gélatine',
  'schwein', 'rind', 'huhn', 'hähnchen', 'fleisch', 'fisch', 'gelatine',
  'cerdo', 'carne', 'pollo', 'pescado',
  'свинина', 'свинін', 'яловичина', 'курятина', 'курка', "м'ясо", 'мясо', 'риба', 'рыба',
  'желатин',
  'wieprzow', 'wołowin', 'kurczak', 'mięs',
  'maiale', 'manzo', 'pesce',
  'varken', 'kip', 'vlees', 'vis',
  'porco', 'frango', 'peixe',
];

const HALAL_TOKENS = [
  'pork', 'bacon', 'ham', 'lard', 'wine', 'beer', 'rum', 'alcohol', 'sausage', 'salami',
  'prosciutto',
  'porc', 'jambon', 'saindoux', 'vin', 'bière', 'alcool',
  'schwein', 'schinken', 'schmalz', 'wein', 'bier', 'alkohol',
  'cerdo', 'jamón', 'manteca', 'vino', 'cerveza',
  'свинина', 'свинін', 'сало', 'вино', 'пиво', 'алкоголь',
  'wieprzow', 'szynk',
  'maiale', 'prosciutto', 'strutto', 'vino', 'birra',
  'varken', 'wijn', 'bier',
  'porco', 'presunto', 'banha', 'vinho', 'cerveja',
];

const KOSHER_TOKENS = [
  'pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster', 'lard', 'sausage',
  'salami', 'prosciutto',
  'porc', 'jambon', 'crevette', 'crabe', 'homard', 'saindoux',
  'schwein', 'schinken', 'garnele', 'krabbe', 'hummer', 'schmalz',
  'cerdo', 'jamón', 'camarón', 'cangrejo', 'langosta', 'manteca',
  'свинина', 'свинін', 'сало', 'креветк', 'краб',
  'wieprzow', 'szynk',
  'maiale', 'gambero', 'granchio', 'aragosta', 'strutto',
  'varken', 'garnaal', 'krab', 'kreeft',
  'porco', 'presunto', 'camarão', 'caranguejo', 'lagosta', 'banha',
];

export const RESTRICTION_RULE_TOKENS = {
  VEGAN: { tokens: VEGAN_TOKENS, excludePatterns: PLANT_BASED_DAIRY_EXCLUDE },
  VEGETARIAN: { tokens: VEGETARIAN_TOKENS, excludePatterns: [] as RegExp[] },
  GLUTEN_FREE: { tokens: ['gluten', 'wheat', 'barley', 'rye'], excludePatterns: [] as RegExp[] },
  DAIRY_FREE: {
    tokens: ['dairy', 'milk', 'whey', 'butter', 'cheese', 'cream', 'yogurt'],
    excludePatterns: PLANT_BASED_DAIRY_EXCLUDE,
  },
  NUT_FREE: {
    tokens: ['peanut', 'tree nut', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio', 'nut'],
    excludePatterns: [] as RegExp[],
  },
  HALAL: { tokens: HALAL_TOKENS, excludePatterns: [] as RegExp[] },
  KOSHER: { tokens: KOSHER_TOKENS, excludePatterns: [] as RegExp[] },
} as const;
