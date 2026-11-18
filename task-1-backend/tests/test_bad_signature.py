
def test_invalid_signature(client):

    response = client.post(
        "/webhooks/calls",
        headers={
            "X-Signature": "invalid_signature"
        },
        json={
            "event_id": "evt_test_001",
            "event_type": "call.started"
        }
    )

    assert response.status_code == 401


def test_missing_signature(client):

    response = client.post(
        "/webhooks/calls",
        json={
            "event_id": "evt_test_002"
        }
    )

    assert response.status_code == 401
