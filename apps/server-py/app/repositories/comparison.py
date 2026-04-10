from app.models.comparison import Comparison
from app.repositories.base import PaginateRepositoryMixin, SQLAlchemyRepository


class ComparisonRepository(PaginateRepositoryMixin[Comparison], SQLAlchemyRepository[Comparison]):
    model = Comparison
