from app.models.product_ingredient_cache import ProductIngredientCache
from app.repositories.base import SQLAlchemyRepository


class ProductIngredientCacheRepository(SQLAlchemyRepository[ProductIngredientCache]):
    model = ProductIngredientCache
