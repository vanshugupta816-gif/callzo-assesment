
import uuid

from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid

from app.models.base import Base


class Call(Base):

    __tablename__ = "calls"

    __table_args__ = (
        UniqueConstraint(
            "account_id",
            "provider_call_id",
            name="uq_call_account_provider_id"
        ),
        CheckConstraint(
            "duration_seconds >= 0",
            name="duration_nonnegative"
        ),
        CheckConstraint(
            "cost_cents >= 0",
            name="cost_nonnegative"
        ),
        CheckConstraint(
            "status IN ('started', 'ended', 'failed')",
            name="valid_status"
        ),
        Index(
            "ix_calls_account_started_at",
            "account_id",
            "started_at"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    provider_call_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="started"
    )

    duration_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    cost_cents: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    destination_country: Mapped[str | None] = mapped_column(
        String(3),
        nullable=True
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    account: Mapped["Account"] = relationship(
        back_populates="calls"
    )
