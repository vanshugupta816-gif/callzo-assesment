
import uuid

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Boolean,
    CheckConstraint,
    Index,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WebhookEvent(Base):

    __tablename__ = "webhook_events"

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('call.started', 'call.ended', 'call.failed')",
            name="valid_event_type"
        ),
        CheckConstraint(
            "processing_status IN ('pending', 'processed', 'failed')",
            name="valid_processing_status"
        ),
        Index(
            "ix_webhook_events_status_received",
            "processing_status",
            "received_at"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    event_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    event_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    account_code: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("accounts.account_code", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    provider_call_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False
    )

    signature_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    processing_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    account: Mapped["Account"] = relationship(
        back_populates="webhook_events"
    )
