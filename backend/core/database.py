import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL.split('@')[-1] if '@' in settings.MONGODB_URL else settings.MONGODB_URL}...")
    if "mongodb+srv" in settings.MONGODB_URL or "ssl=true" in settings.MONGODB_URL.lower():
        db.client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    else:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    print("Connected to MongoDB client")

async def close_mongo_connection():
    if db.client:
        print("Closing MongoDB connection...")
        db.client.close()
        print("Closed MongoDB connection")
