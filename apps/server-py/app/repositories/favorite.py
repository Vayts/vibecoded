from app.models.favorite import Favorite
from app.repositories.base import PaginateRepositoryMixin, SQLAlchemyRepository


class FavoriteRepository(PaginateRepositoryMixin[Favorite], SQLAlchemyRepository[Favorite]):
    model = Favorite
