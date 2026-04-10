FROM python:3.13-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies (no project itself yet)
RUN uv sync --frozen --no-install-project --no-dev

# Copy source
COPY . .

# Install the project
RUN uv sync --frozen --no-dev

EXPOSE 3000

CMD ["uv", "run", "uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "3000"]
