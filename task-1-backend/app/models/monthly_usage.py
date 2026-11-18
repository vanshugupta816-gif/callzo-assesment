
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    UniqueConstraint
)
from sqlalchemy.sql import func

from app.database import Base


class MonthlyUsage(Base):
    __tablename__ = "monthly_usage"

    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "year",
            "month",
            name="uq_monthly_usage_account_year_month"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    account_id = Column(
        Integer,
        ForeignKey("accounts.id"),
        nullable=False
    )

    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    total_calls = Column(Integer, default=0, nullable=False)
    total_duration_seconds = Column(Integer, default=0, nullable=False)
    total_cost_cents = Column(Integer, default=0, nullable=False)

    cap_limit_cents = Column(Integer, nullable=False)

    cap_status = Column(String, default="under_cap", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
