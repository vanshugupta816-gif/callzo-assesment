
FROM python:3.12-slim

# Set working directory
WORKDIR /code

# Install dependencies first
COPY requirements.txt .
COPY wheelhouse /wheelhouse

RUN pip install --no-cache-dir --default-timeout=120 --retries 5 -r requirements.txt
# Copy application code
COPY ./app ./app

COPY ./tests ./tests

# Expose application port
EXPOSE 8000

# Start FastAPI using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
