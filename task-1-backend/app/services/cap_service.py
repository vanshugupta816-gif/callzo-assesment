
def calculate_cap_status(
    total_cost_cents: int,
    monthly_cap_cents: int
) -> str:

    if total_cost_cents > monthly_cap_cents:
        return "exceeded"

    elif total_cost_cents == monthly_cap_cents:
        return "reached"

    else:
        return "under_cap"
