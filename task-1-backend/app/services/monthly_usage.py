
from datetime import datetime, timezone

from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.monthly_usage import MonthlyUsage
from app.services.cap_service import calculate_cap_status


def update_monthly_usage(
    db: Session,
    account,
    event_timestamp: datetime,
    payload: dict
):
    """
    Update monthly usage for an account.

    Uses UTC calendar months for billing.
    Creates a new monthly usage record or atomically
    increments an existing record.
    """

    # Convert event timestamp to UTC
    billing_timestamp = event_timestamp.astimezone(timezone.utc)

    usage_year = billing_timestamp.year
    usage_month = billing_timestamp.month

    # Extract call information
    duration = payload["duration_seconds"]
    cost = payload["cost_cents"]

    # Get account monthly spending cap
    monthly_cap = account.monthly_cap_cents

    # Calculate initial cap status
    initial_cap_status = calculate_cap_status(
        cost,
        monthly_cap
    )

    # Prepare insert statement
    usage_statement = insert(MonthlyUsage).values(
        account_id=account.id,
        year=usage_year,
        month=usage_month,
        total_calls=1,
        total_duration_seconds=duration,
        total_cost_cents=cost,
        cap_limit_cents=monthly_cap,
        cap_status=initial_cap_status
    )

    # Calculate updated total cost atomically
    new_total_cost = MonthlyUsage.total_cost_cents + cost

    # Insert or update existing monthly usage
    usage_statement = usage_statement.on_conflict_do_update(
        index_elements=[
            MonthlyUsage.account_id,
            MonthlyUsage.year,
            MonthlyUsage.month
        ],
        set_={
            "total_calls": MonthlyUsage.total_calls + 1,

            "total_duration_seconds":
                MonthlyUsage.total_duration_seconds + duration,

            "total_cost_cents": new_total_cost,

            "cap_limit_cents": monthly_cap,

            "cap_status": case(
                (
                    new_total_cost > monthly_cap,
                    "exceeded"
                ),
                (
                    new_total_cost == monthly_cap,
                    "reached"
                ),
                else_="under_cap"
            ),

            "updated_at": datetime.now(timezone.utc)
        }
    )

    # Execute database operation
    db.execute(usage_statement)
