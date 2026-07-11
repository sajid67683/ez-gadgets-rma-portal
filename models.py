import os
from pymongo import MongoClient
from dotenv import load_dotenv

# 1. Tell Python to look for your .env file and load the passwords
load_dotenv()

# 2. Securely grab the connection string from the environment
MONGO_URI = os.getenv("MONGO_URI")

# 3. Connect to your MongoDB Atlas cluster
client = MongoClient(MONGO_URI)

# 4. Select the specific database
db = client.ezgadgets_rma