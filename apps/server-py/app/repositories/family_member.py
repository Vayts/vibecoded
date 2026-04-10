from app.models.family_member import FamilyMember
from app.repositories.base import SQLAlchemyRepository


class FamilyMemberRepository(SQLAlchemyRepository[FamilyMember]):
    model = FamilyMember
