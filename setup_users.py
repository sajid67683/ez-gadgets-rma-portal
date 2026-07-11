import os
from werkzeug.security import generate_password_hash
from pymongo import MongoClient
from dotenv import load_dotenv

# 1. Load the connection string from your .env file
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

# 2. Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.ezgadgets_rma

# Optional: Clear out any old users if you run this multiple times
db.users.delete_many({})

# 3. Create Admin User
db.users.insert_one({
    "username": "admin",
    "password_hash": generate_password_hash("ezadmin123")
})

# 4. Create Tech User
db.users.insert_one({
    "username": "tech",
    "password_hash": generate_password_hash("werepair123")
})

print("Users successfully created in MongoDB!")