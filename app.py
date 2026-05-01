from flask import Flask
import os
from dotenv import load_dotenv

# Import the database object from our new models file
from models import db

# Import our new route blueprints
from routes.customer import customer_bp
from routes.admin import admin_bp
from routes.repair import repair_bp

load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)

db_url = os.environ.get("DATABASE_URL")
if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + \
        os.path.join(INSTANCE_DIR, 'ezgadgets_rma.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'ez-gadgets-rma-91716493987'

# Initialize the database with this app
db.init_app(app)

# --- REGISTER BLUEPRINTS ---
# This is where we plug in the three "modules" we just built
app.register_blueprint(customer_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(repair_bp)

if __name__ == '__main__':
    with app.app_context():
        # Will safely create tables if they don't exist
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5005)
