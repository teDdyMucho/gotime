from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # API
    api_secret_key: str
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # SendGrid
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""
    sendgrid_from_name: str = "Go Time Transportation"
    sendgrid_template_accepted: str = ""
    sendgrid_template_declined: str = ""
    sendgrid_template_needs_info: str = ""
    sendgrid_template_canceled: str = ""
    sendgrid_template_general_alert: str = ""

    # n8n
    n8n_webhook_base_url: str = ""
    n8n_trip_decision_webhook: str = "/webhook/trip-decision"
    n8n_trip_canceled_webhook: str = "/webhook/trip-canceled"
    n8n_manual_alert_webhook: str = "/webhook/manual-alert"
    n8n_api_key: str = ""

    @property
    def origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.allowed_origins.split(",")]
        # In development, allow all localhost ports (5173–5200) so Vite port shifts don't break CORS
        if self.environment == "development":
            for port in range(5173, 5201):
                origin = f"http://localhost:{port}"
                if origin not in origins:
                    origins.append(origin)
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
