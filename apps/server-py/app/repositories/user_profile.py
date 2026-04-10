from app.models.user_profile import UserProfile
from app.repositories.base import SQLAlchemyRepository


class UserProfileRepository(SQLAlchemyRepository[UserProfile]):
    model = UserProfile
