
from app.services.cap_service import calculate_cap_status


def test_usage_below_cap():
    assert calculate_cap_status(500, 1000) == "under_cap"


def test_usage_equal_to_cap():
    assert calculate_cap_status(1000, 1000) == "reached"


def test_usage_above_cap():
    assert calculate_cap_status(1200, 1000) == "exceeded"


def test_zero_cap():
    assert calculate_cap_status(0, 0) == "reached"
