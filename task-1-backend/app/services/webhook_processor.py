from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import case

from app.services.cap_service import calculate_cap_status