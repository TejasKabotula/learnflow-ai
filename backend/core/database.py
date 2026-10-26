from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    print("Connected to MongoDB")

async def close_mongo_connection():
    print("Closing MongoDB connection...")
    db.client.close()
    print("Closed MongoDB connection")
