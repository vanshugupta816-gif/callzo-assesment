# Callzo Webhook Backend

## 1. Project Overview

Callzo Webhook Backend is a FastAPI-based
application that receives and processes webhook
events related to telephone calls.

It verifies webhook signatures, stores call
information, calculates monthly usage and
monitors account spending limits.

## 2. Technology Stack

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- Docker
- Docker Compose
- Pytest

## 3. Project Features

- Webhook signature verification using HMAC-SHA256
- Webhook event validation
- Call event processing
- Duplicate event handling
- Out-of-order event handling
- Late event handling
- Monthly usage calculation
- Monthly cap enforcement
- Database transaction management

## 4. Project Structure

Explain the purpose of:

- app/models
- app/schemas
- app/routes
- app/services
- app/repositories
- tests

## 5. Environment Configuration

Create a .env file using .env.example.

Required variables:

DATABASE_URL=
WEBHOOK_SECRET=

Never commit your actual .env file.

## 6. Installation

Install Docker Desktop.

Clone the project.

Configure environment variables.

## 7. Running the Application

Run:

docker compose build

docker compose up -d api

docker compose up --force-recreate simulator

## 8. API Endpoints

GET /

GET /health

POST /webhooks/calls

## 9. Database Models

- Account
- Call
- WebhookEvent
- MonthlyUsage

Explain their relationships.

## 10. Webhook Processing

Explain:

- HMAC verification
- Payload validation
- Event processing
- Idempotency
- Out-of-order handling
- Late event handling

## 11. Monthly Usage and Cap Enforcement

Explain:

- Monthly call count
- Monthly duration
- Monthly cost
- Monthly spending cap
- Cap status

## 12. Testing

Explain all seven simulator scenarios:

- normal
- duplicates
- out_of_order
- late
- malformed
- bad_signature
- cap_burst

## 13. Cap Enforcement Policy

Explain the chosen soft-cap policy
and how exceeded accounts are handled.

## 14. Security

- Environment variables
- HMAC signature verification
- Constant-time signature comparison
- Input validation
- Database constraints

## 15. Future Improvements

- Pre-call authorization for hard cap enforcement
- Monitoring and alerting
- Improved observability
