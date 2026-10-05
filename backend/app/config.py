"""Setelan backend dari environment."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
ONTO_DIR = ROOT / "ontology"
CACHE_KB = ONTO_DIR / ".cache" / "kb.rdfxml"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    # LLM (openai-compatible). Dua model: router (murah) + narasi (menengah).
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model_router: str | None = None
    llm_model_narasi: str | None = None

    def llm_siap(self) -> bool:
        return bool(self.llm_base_url and self.llm_api_key)


settings = Settings()
