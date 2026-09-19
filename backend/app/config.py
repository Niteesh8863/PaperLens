from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://paperlens:paperlens@db:5432/paperlens"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_expire_minutes: int = 60
    upload_dir: str = "./uploads"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
settings = Settings()
