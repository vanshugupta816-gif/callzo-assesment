
import uuid

from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Integer,
    Boolean,
    DateTime,
    CheckConstraint,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.models.base import Base


class Account(Base):

    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            "monthly_cap_cents >= 0",
            name="monthly_cap_nonnegative"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    account_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    monthly_cap_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    calls: Mapped[list["Call"]] = relationship(
        back_populates="account"
    )

    webhook_events: Mapped[list["WebhookEvent"]] = relationship(
        back_populates="account"
    )

    monthly_usages: Mapped[list["MonthlyUsage"]] = relationship(
        back_populates="account"
    )
