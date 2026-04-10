from app.models.user_identity import UserIdentity
from app.repositories.base import SQLAlchemyRepository


class UserIdentityRepository(SQLAlchemyRepository[UserIdentity]):
    model = UserIdentity
