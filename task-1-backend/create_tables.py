
from app.database import engine
from app.models import Base

# Importing app.models registers all four models.

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
