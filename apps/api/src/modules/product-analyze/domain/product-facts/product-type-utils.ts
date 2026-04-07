import type { NormalizedProduct, ProductType } from '@acme/shared';

interface ProductTypeRule {
  type: ProductType;
  keywords: string[];
}

const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  {
    type: 'beverage',
    keywords: [
      'beverage',
      'drink',
      'juice',
      'soda',
      'water',
      'tea',
      'coffee',
      'milk drink',
      'smoothie',
      'energy drink',
      'boisson',
      'getränk',
    ],
  },
  {
    type: 'yogurt',
    keywords: ['yogurt', 'yoghurt', 'yaourt', 'joghurt', 'skyr'],
  },
  {
    type: 'cheese',
    keywords: ['cheese', 'fromage', 'käse', 'queso', 'formaggio'],
  },
  {
    type: 'dairy',
    keywords: ['dairy', 'milk', 'cream', 'butter', 'lait', 'milch', 'crème'],
  },
  {
    type: 'meat',
    keywords: [
      'meat',
      'chicken',
      'beef',
      'pork',
      'turkey',
      'lamb',
      'sausage',
      'ham',
      'viande',
      'fleisch',
    ],
  },
  {
    type: 'fish',
    keywords: [
      'fish',
      'salmon',
      'tuna',
      'shrimp',
      'seafood',
      'poisson',
      'fisch',
    ],
  },
  {
    type: 'bread',
    keywords: ['bread', 'baguette', 'toast', 'pain', 'brot', 'roll', 'pita'],
  },
  {
    type: 'cereal',
    keywords: [
      'cereal',
      'muesli',
      'granola',
      'oat',
      'porridge',
      'flakes',
      'céréale',
    ],
  },
  {
    type: 'sauce',
    keywords: [
      'sauce',
      'ketchup',
      'mustard',
      'mayonnaise',
      'dressing',
      'vinaigrette',
      'soße',
    ],
  },
  {
    type: 'sweet',
    keywords: [
      'candy',
      'chocolate',
      'confectionery',
      'bonbon',
      'gummy',
      'süßigkeit',
      'praline',
    ],
  },
  {
    type: 'dessert',
    keywords: [
      'dessert',
      'pudding',
      'ice cream',
      'mousse',
      'cake',
      'pastry',
      'pie',
      'tart',
    ],
  },
  {
    type: 'snack',
    keywords: [
      'snack',
      'chip',
      'crisp',
      'cracker',
      'pretzel',
      'popcorn',
      'nut mix',
      'bar',
    ],
  },
  {
    type: 'ready_meal',
    keywords: [
      'ready meal',
      'prepared',
      'frozen meal',
      'microwave',
      'pizza',
      'lasagna',
      'plat préparé',
    ],
  },
  {
    type: 'plant_protein',
    keywords: [
      'tofu',
      'tempeh',
      'seitan',
      'plant-based',
      'vegan meat',
      'soy protein',
      'protéine végétale',
    ],
  },
  {
    type: 'fruit_vegetable',
    keywords: [
      'fruit',
      'vegetable',
      'salad',
      'légume',
      'obst',
      'gemüse',
      'compote',
    ],
  },
];

/**
 * Detect product type from normalized product categories and name.
 * Uses keyword matching against category tags, categories string, and product name.
 */
export const detectProductType = (
  product: NormalizedProduct,
): ProductType | null => {
  const searchTexts = [
    ...(product.category_tags ?? []),
    product.categories ?? '',
    product.product_name ?? '',
  ]
    .map((t) => t.toLowerCase())
    .filter(Boolean);

  if (searchTexts.length === 0) return null;

  const combined = searchTexts.join(' ');

  for (const rule of PRODUCT_TYPE_RULES) {
    for (const keyword of rule.keywords) {
      if (combined.includes(keyword)) {
        return rule.type;
      }
    }
  }

  return 'other';
};
