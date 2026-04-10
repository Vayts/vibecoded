import re
from abc import ABC, abstractmethod
from typing import Any, Callable, Generic, Sequence, Type, TypeVar, Union, overload

from loguru import logger
from pydantic import BaseModel
from sqlalchemy import Column, ColumnClause, Executable, Result, String, delete, func, insert, or_, select, update
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.sql import cast

from app.core.exc.base import DBConnectionException, ObjectExistsException, ObjectNotFoundException
from app.enums import OrderDirection
from app.models.base import Base as BaseDB
from app.schemas.utils.paginator import PaginatedOutput
from app.utils.paginator import paginate

ModelType = TypeVar("ModelType", bound=BaseDB)

action_map = {
    "gt": "__gt__",
    "lt": "__lt__",
    "ge": "__ge__",
    "le": "__le__",
    "in": "in_",
    "contains": "contains",
    "eq": "__eq__",
    "ne": "__ne__",
}


def _parse_integrity_error(e: IntegrityError) -> str:
    match = re.search(r"Key \((.*?)\)=\((.*?)\) already exists", str(e.orig))
    return f"{match.group(1)}={match.group(2)}" if match else ""


class AbstractRepository(ABC, Generic[ModelType]):
    @abstractmethod
    async def get_one(self, **filters: Any) -> ModelType:
        raise NotImplementedError

    @abstractmethod
    async def get_multi(self, offset: int, limit: int, **filters: Any) -> Sequence[ModelType]:
        raise NotImplementedError

    @abstractmethod
    async def create(self, obj_in: BaseModel | dict[str, Any]) -> ModelType:
        raise NotImplementedError

    @abstractmethod
    async def update(
        self, obj_in: BaseModel | dict[str, Any], *, return_object: bool = False, **filters: Any
    ) -> int | ModelType:
        raise NotImplementedError

    @abstractmethod
    async def delete(self, return_object: bool = False, **filters: Any) -> int | ModelType:
        raise NotImplementedError


class SQLAlchemyRepository(AbstractRepository, Generic[ModelType]):
    model: Type[ModelType]
    default_order_by: str = "created_at"

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.model_name = self.model.__name__

    async def execute(self, statement: Executable, action: Callable[[Any], Any] | None = None) -> Any:
        try:
            result: Result = await self.session.execute(statement)
            return action(result) if action else result

        except IntegrityError as e:
            if "duplicate" in str(e).lower():
                raise ObjectExistsException(_parse_integrity_error(e))
            raise e

        except NoResultFound:
            raise ObjectNotFoundException(f"{self.model_name} not found")

        except OSError as e:
            raise DBConnectionException(str(e))

    async def get_one(self, **filters: Any) -> ModelType:
        statement = select(self.model).where(*self._where(filters))
        return await self.execute(statement=statement, action=lambda r: r.scalars().one())

    async def get_one_or_none(self, **filters: Any) -> ModelType | None:
        statement = select(self.model).where(*self._where(filters))
        return await self.execute(statement=statement, action=lambda r: r.scalars().one_or_none())

    async def get_multi(self, offset: int = 0, limit: int = 50, /, **filters: Any) -> Sequence[ModelType]:
        statement = select(self.model).where(*self._where(filters)).offset(offset).limit(limit)
        if field := getattr(self.model, self.default_order_by, None):
            statement = statement.order_by(field.desc())
        return await self.execute(statement=statement, action=lambda r: r.scalars().all())

    async def create(self, obj_in: BaseModel | dict[str, Any]) -> ModelType:
        logger.debug(f"Creating {self.model_name}")
        data = obj_in.model_dump(mode="json") if isinstance(obj_in, BaseModel) else obj_in
        statement = insert(self.model).values(**data).returning(self.model)
        return await self.execute(statement=statement, action=lambda r: r.scalar_one())

    async def update(
        self, obj_in: BaseModel | dict[str, Any], *, return_object: bool = False, **filters: Any
    ) -> int | ModelType:
        logger.debug(f"Updating {self.model_name} with {filters=}")
        data = obj_in.model_dump(mode="json") if isinstance(obj_in, BaseModel) else obj_in
        statement = update(self.model).where(*self._where(filters)).values(**data)
        if return_object:
            statement = statement.returning(self.model)
            return await self.execute(statement=statement, action=lambda r: r.scalars().one())
        return await self.execute(statement=statement, action=lambda r: r.rowcount)

    async def delete(self, return_object: bool = False, **filters: Any) -> int | ModelType:
        logger.debug(f"Deleting {self.model_name} with {filters=}")
        statement = delete(self.model).where(*self._where(filters))
        if return_object:
            statement = statement.returning(self.model)
            return await self.execute(statement=statement, action=lambda r: r.scalars().one())
        return await self.execute(statement=statement, action=lambda r: r.rowcount)

    async def get_or_create(self, data: BaseModel | dict[str, Any], **lookup_filters: Any) -> ModelType:
        existing = await self.get_one_or_none(**lookup_filters)
        if existing:
            return existing
        return await self.create(data)

    async def get_count(self, **filters: Any) -> int:
        statement = select(func.count(self.model.id)).where(*self._where(filters))
        return await self.execute(statement, action=lambda r: r.scalar())

    def _where(self, filters: dict[str, Any]) -> list[ColumnClause]:
        clauses: list[ColumnClause] = []
        for key, value in filters.items():
            if "__" not in key:
                key = f"{key}__eq"
            column_name, action_name = key.split("__", 1)
            column: Column = getattr(self.model, column_name, None)
            if column is None:
                raise ValueError(f"Invalid column '{column_name}' on {self.model_name}")
            action = action_map.get(action_name)
            if action is None:
                raise ValueError(f"Unsupported filter action '{action_name}'")
            clauses.append(getattr(column, action)(value))
        return clauses

    # Alias kept for PaginateRepositoryMixin compatibility
    def get_where_clauses(self, filters: dict[str, Any]) -> list[ColumnClause]:
        return self._where(filters)


class PaginateRepositoryMixin(Generic[ModelType]):
    model: Type[ModelType]
    session: AsyncSession
    get_where_clauses: Callable
    execute: Callable

    async def paged_list(
        self,
        *,
        page: int = 1,
        per_page: int = 20,
        order_by: str = "created_at",
        order_direction: OrderDirection = OrderDirection.DESC,
        **filters: Any,
    ) -> PaginatedOutput:
        statement = select(self.model).where(*self._get_filters(filters))
        return await paginate(
            self,
            statement,
            page=page,
            per_page=per_page,
            order_by=order_by,
            order_direction=order_direction,
        )

    def _get_model_field(self, field: Union[str, InstrumentedAttribute]) -> InstrumentedAttribute:
        if isinstance(field, InstrumentedAttribute):
            return cast(field, String) if "id" in field.key.lower() else field
        try:
            model_field = getattr(self.model, field)
            return cast(model_field, String) if "id" in field.lower() else model_field
        except AttributeError:
            raise ValueError(f"Field '{field}' does not exist on {self.model.__name__}")

    def _get_filters(self, filters: dict) -> list:
        search: str | None = filters.pop("search", None)
        search_fields: list | None = filters.pop("search_fields", None)
        where_clauses = self.get_where_clauses(filters)
        if search and search_fields:
            where_clauses.append(or_(*[self._get_model_field(f).ilike(f"%{search}%") for f in search_fields]))
        return where_clauses

    @overload
    def get_model_field(self, field: str) -> Any: ...

    @overload
    def get_model_field(self, field: InstrumentedAttribute) -> InstrumentedAttribute: ...

    def get_model_field(self, field: Union[str, InstrumentedAttribute]) -> InstrumentedAttribute:
        return self._get_model_field(field)
