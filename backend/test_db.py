import urllib.parse
from sqlalchemy import create_engine
DATABASE_URL = "postgresql://postgres:kdwMbttFqbKYevwzCnjBTnlRNvrcKKmY@junction.proxy.rlwy.net:49488/railway"
print("Connecting...")
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        print("Connected successfully!")
except Exception as e:
    print("Failed:")
    print(e)
