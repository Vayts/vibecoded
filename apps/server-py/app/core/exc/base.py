from fastapi import HTTPException
from loguru import logger


class BaseHTTPException(HTTPException):
    _exception_alias: str = "INTERNAL_ERROR"
    message_pattern: str = "An unexpected error occurred."

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(
            status_code=self.status_code,  # type: ignore[attr-defined]
            detail=detail or self.message_pattern,
        )
        logger.debug(f"[{self._exception_alias}] {self.detail}")


class BadRequestException(BaseHTTPException):
    _exception_alias = "BAD_REQUEST"
    status_code = 400
    message_pattern = "Bad request."


class UnauthorizedException(BaseHTTPException):
    _exception_alias = "UNAUTHORIZED"
    status_code = 401
    message_pattern = "Authentication required."


class ForbiddenException(BaseHTTPException):
    _exception_alias = "FORBIDDEN"
    status_code = 403
    message_pattern = "You do not have permission to perform this action."


class ObjectNotFoundException(BaseHTTPException):
    _exception_alias = "NOT_FOUND"
    status_code = 404
    message_pattern = "The requested resource was not found."


class ObjectExistsException(BaseHTTPException):
    _exception_alias = "CONFLICT"
    status_code = 409
    message_pattern = "The resource already exists."


class InsufficientBalanceException(BaseHTTPException):
    _exception_alias = "INSUFFICIENT_BALANCE"
    status_code = 402
    message_pattern = "Insufficient generation balance. Please upgrade your plan."


class DBConnectionException(BaseHTTPException):
    _exception_alias = "DB_CONNECTION_ERROR"
    status_code = 503
    message_pattern = "Database connection error."
