# Import all models here so that Base.metadata is fully populated
# when Alembic's env.py imports it.
from app.models.base import Base
from app.models.comparison import Comparison
from app.models.family_member import FamilyMember
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.product_ingredient_cache import ProductIngredientCache
from app.models.scan import Scan
from app.models.user import User
from app.models.user_identity import UserIdentity
from app.models.user_profile import UserProfile

__all__ = [
    "Base",
    "Comparison",
    "FamilyMember",
    "Favorite",
    "Product",
    "ProductIngredientCache",
    "Scan",
    "User",
    "UserIdentity",
    "UserProfile",
]
