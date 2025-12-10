# File: app/database.py
"""
MongoDB Database Connection Module
Handles connection to MongoDB using Motor (async driver)
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fault_detection")

# Global database client
_client: AsyncIOMotorClient = None
_database = None
_is_connected = False


async def connect_to_database():
    """Initialize MongoDB connection"""
    global _client, _database, _is_connected
    
    try:
        _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _database = _client[DATABASE_NAME]
        
        # Test connection with a short timeout
        await _client.admin.command('ping')
        _is_connected = True
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes for better query performance
        await create_indexes()
        
        return _database
    except Exception as e:
        _is_connected = False
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e


async def close_database_connection():
    """Close MongoDB connection"""
    global _client, _is_connected
    if _client:
        _client.close()
        _is_connected = False
        print("🔌 MongoDB connection closed")


async def create_indexes():
    """Create indexes for faster queries"""
    global _database
    
    if _database is None:
        return
    
    try:
        # Machines collection indexes
        machines_collection = _database.machines
        
        # Compound index for common query patterns
        await machines_collection.create_index([
            ("date", DESCENDING),
            ("customerId", ASCENDING),
            ("statusName", ASCENDING)
        ])
        
        # Individual indexes for filtering
        await machines_collection.create_index("date")
        await machines_collection.create_index("customerId")
        await machines_collection.create_index("areaId")
        await machines_collection.create_index("statusName")
        await machines_collection.create_index("machineType")
        await machines_collection.create_index("machineId")
        
        # Sync metadata collection index
        sync_collection = _database.sync_metadata
        await sync_collection.create_index("sync_type", unique=True)
        
        print("📊 Database indexes created")
    except Exception as e:
        print(f"⚠️ Warning: Could not create indexes: {e}")


def get_database():
    """Get the database instance"""
    global _database, _is_connected
    if not _is_connected or _database is None:
        return None
    return _database


def get_collection(name: str):
    """Get a specific collection"""
    db = get_database()
    if db is None:
        return None
    return db[name]


def is_connected() -> bool:
    """Check if database is connected"""
    global _is_connected
    return _is_connected
