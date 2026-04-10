from app.models.scan import Scan
from app.repositories.base import PaginateRepositoryMixin, SQLAlchemyRepository


class ScanRepository(PaginateRepositoryMixin[Scan], SQLAlchemyRepository[Scan]):
    model = Scan
