
from fastapi import (
    APIRouter,
    Request,
    Header,
    Depends,
    HTTPException,
    status
)

from pydantic import ValidationError

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import get_db

from app.schemas.webhook import WebhookRequest
from app.utils.signature import verify_signature

from app.models.account import Account
from app.models.webhook_event import WebhookEvent


router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"]
)


@router.post("/calls")
async def receive_call_webhook(
    request: Request,
    x_signature: str | None = Header(
        default=None,
        alias="X-Signature"
    ),
    db: Session = Depends(get_db)
):

    # Step 1: Read original request body
    raw_body = await request.body()

    # Step 2: Check whether signature exists
    if not x_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing webhook signature"
        )

    # Step 3: Verify HMAC signature
    is_valid = verify_signature(
        raw_body,
        x_signature,
        settings.WEBHOOK_SECRET
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature"
        )

    # Step 4: Validate JSON after signature verification
    try:
        event = WebhookRequest.model_validate_json(raw_body)

    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(include_input=False)
        )

    # Step 5: Check duplicate event
    existing_event = db.query(WebhookEvent).filter(
        WebhookEvent.event_id == event.event_id
    ).first()

    if existing_event:
        return {
            "status": "duplicate",
            "message": "Event already received",
            "event_id": event.event_id
        }

    # Step 6: Check whether account exists
    account = db.query(Account).filter(
        Account.account_code == event.account_id
    ).first()

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Step 7: Create webhook event
    webhook_event = WebhookEvent(
        event_id=event.event_id,
        event_type=event.event_type,
        account_code=event.account_id,
        provider_call_id=event.call_id,
        payload=event.model_dump(mode="json"),
        signature_verified=True,
        processing_status="pending"
    )

    try:
        db.add(webhook_event)
        db.commit()
        db.refresh(webhook_event)

    except IntegrityError:
        db.rollback()

        # Another request may have inserted the same event
        duplicate = db.query(WebhookEvent).filter(
            WebhookEvent.event_id == event.event_id
        ).first()

        if duplicate:
            return {
                "status": "duplicate",
                "message": "Event already received",
                "event_id": event.event_id
            }

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint conflict"
        )

    # Step 8: Return successful response
    return {
        "status": "accepted",
        "message": "Webhook event received successfully",
        "event_id": event.event_id
    }
