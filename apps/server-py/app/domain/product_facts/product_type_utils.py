from typing import Optional

from app.domain.product_facts.schema import NormalizedProduct, ProductType

_PRODUCT_TYPE_RULES: list[tuple[ProductType, list[str]]] = [
    (
        "beverage",
        [
            "beverage",
            "drink",
            "juice",
            "soda",
            "water",
            "tea",
            "coffee",
            "milk drink",
            "smoothie",
            "energy drink",
            "boisson",
            "getränk",
        ],
    ),
    ("yogurt", ["yogurt", "yoghurt", "yaourt", "joghurt", "skyr"]),
    ("cheese", ["cheese", "fromage", "käse", "queso", "formaggio"]),
    ("dairy", ["dairy", "milk", "cream", "butter", "lait", "milch", "crème"]),
    ("meat", ["meat", "chicken", "beef", "pork", "turkey", "lamb", "sausage", "ham", "viande", "fleisch"]),
    ("fish", ["fish", "salmon", "tuna", "shrimp", "seafood", "poisson", "fisch"]),
    ("bread", ["bread", "baguette", "toast", "pain", "brot", "roll", "pita"]),
    ("cereal", ["cereal", "muesli", "granola", "oat", "porridge", "flakes", "céréale"]),
    ("sauce", ["sauce", "ketchup", "mustard", "mayonnaise", "dressing", "vinaigrette", "soße"]),
    ("sweet", ["candy", "chocolate", "confectionery", "bonbon", "gummy", "süßigkeit", "praline"]),
    ("dessert", ["dessert", "pudding", "ice cream", "mousse", "cake", "pastry", "pie", "tart"]),
    ("snack", ["snack", "chip", "crisp", "cracker", "pretzel", "popcorn", "nut mix", "bar"]),
    ("ready_meal", ["ready meal", "prepared", "frozen meal", "microwave", "pizza", "lasagna", "plat préparé"]),
    ("plant_protein", ["tofu", "tempeh", "seitan", "plant-based", "vegan meat", "soy protein", "protéine végétale"]),
    ("fruit_vegetable", ["fruit", "vegetable", "salad", "légume", "obst", "gemüse", "compote"]),
]


def detect_product_type(product: NormalizedProduct) -> Optional[ProductType]:
    search_texts = [
        *[t.lower() for t in (product.get("category_tags") or [])],
        (product.get("categories") or "").lower(),
        (product.get("product_name") or "").lower(),
    ]
    search_texts = [t for t in search_texts if t]

    if not search_texts:
        return None

    combined = " ".join(search_texts)

    for product_type, keywords in _PRODUCT_TYPE_RULES:
        for keyword in keywords:
            if keyword in combined:
                return product_type

    return "other"
