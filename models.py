from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize the db object here, but don't bind it to the app yet
db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin' or 'tech'


class RMARecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rma_code = db.Column(db.String(20), unique=True, nullable=False)
    date_received = db.Column(db.DateTime, default=datetime.utcnow)
    location = db.Column(db.String(50), nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(50), nullable=False)
    address = db.Column(db.String(250))
    product_name = db.Column(db.String(100), nullable=False)
    serial_number = db.Column(db.String(100))
    issue = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default="Pending Drop-off")
    repair_location = db.Column(db.String(100), default="In-House")
    admin_notes = db.Column(db.Text, default="")
