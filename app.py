from routes.repair import repair_bp
from routes.admin import admin_bp
from routes.customer import customer_bp
from flask import Flask
import os
from dotenv import load_dotenv

# Load environment variables (this reads your .env file when testing locally)
load_dotenv()

# Import our route blueprints

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ez-gadgets-rma-91716493987'

# --- REGISTER BLUEPRINTS ---
# Plug in the three modules
app.register_blueprint(customer_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(repair_bp)

# Vercel requires the 'app' object to be initialized, but it ignores this bottom block.
# This bottom block is strictly so you can still run 'python app.py' locally to test!
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005)
