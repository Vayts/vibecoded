from app.core.config.base import BaseConfig


class LangSmithConfig(BaseConfig):
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_PROJECT: str = "yuka"
