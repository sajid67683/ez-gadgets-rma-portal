from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
import string
import requests
import os

GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJ-m39N1lQ82y76-KnTGj5dxL4mWbsHULFcAvHRv-rBKctYKlverRDLzVRPhSTuqCi4g/exec"

app = Flask(__name__)

# --- CONFIGURATION ---
# Get the absolute path to the directory this file is in
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Point directly to the instance folder that Docker is protecting
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)

# Update the connection string to use the protected folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + \
    os.path.join(INSTANCE_DIR, 'ezgadgets_rma.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'ez-gadgets-rma-91716493987'
db = SQLAlchemy(app)


# --- DATABASE MODEL ---
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


# --- HELPER FUNCTION ---

def generate_rma_code(location):
    if "Badda" in location:
        prefix = "EZ-BDA"
    elif "Multiplan" in location:
        prefix = "EZ-MLT"
    else:
        prefix = "EZ-CTG"
    date_str = datetime.now().strftime("%y%m%d")
    random_chars = ''.join(random.choices(
        string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{date_str}-{random_chars}"


# ==========================================
# PAGE ROUTES & AUTHENTICATION
# ==========================================

@app.route('/')
def customer_portal():
    return render_template('customer.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == 'ezadmin123':
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('login.html', error="Invalid password. Access denied.")
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('customer_portal'))


@app.route('/admin')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    return render_template('admin.html')


# ==========================================
# CUSTOMER API ENDPOINTS
# ==========================================

@app.route('/api/rma/create', methods=['POST'])
def create_rma():
    data = request.json
    # 1. Generate RMA Code based on selected branch
    branch_location = data.get('location', 'CTG Branch')
    new_code = generate_rma_code(branch_location)
    # 2. Create the Database Record
    # Note: Mapping JS keys (customerName) to DB keys (customer_name)
    new_rma = RMARecord(
        rma_code=new_code,
        location=branch_location,
        customer_name=data.get('customerName'),
        contact=data.get('contact'),
        address=data.get('address'),
        product_name=data.get('productName'),
        serial_number=data.get('serialNumber'),
        issue=data.get('issue')
    )
    try:
        # 3. Save to Local SQLite Database
        db.session.add(new_rma)
        db.session.commit()
        # 4. Sync to Google Sheets
        # This sends all data including the address to your Apps Script
        requests.get(GOOGLE_SCRIPT_URL, params={
            'action': 'add',
            'rma_code': new_code,
            'date': datetime.now().strftime("%d/%m/%Y"),
            'location': new_rma.location,
            'customerName': new_rma.customer_name,
            'contact': new_rma.contact,
            'productName': new_rma.product_name,
            'serialNumber': new_rma.serial_number,
            'issue': new_rma.issue,
            'address': new_rma.address  # Included as requested
        }, timeout=5)
        return jsonify({
            "success": True,
            "rma_code": new_code
        })
    except Exception as e:
        db.session.rollback()
        print(f"CRITICAL ERROR: {e}")
        return jsonify({
            "success": False,
            "error": "Database or Sync failed. Please try again."
        }), 500


@app.route('/api/rma/status/<code>', methods=['GET'])
def check_status(code):
    record = RMARecord.query.filter_by(rma_code=code).first()
    if record:
        return jsonify({
            "success": True,
            "rma_code": record.rma_code,
            "product_name": record.product_name,
            "status": record.status,
            "date_received": record.date_received.strftime("%d %b %Y")
        })
    return jsonify({"success": False, "error": "RMA not found."}), 404


# ==========================================
# ADMIN API ENDPOINTS
# ==========================================

@app.route('/api/admin/rma/all', methods=['GET'])
def get_all_rmas():
    records = RMARecord.query.order_by(RMARecord.date_received.desc()).all()
    result = [{
        "rma_code": r.rma_code,
        "customer_name": r.customer_name,
        "contact": r.contact,
        "address": r.address,
        "product_name": r.product_name,
        "serial_number": r.serial_number,
        "issue": r.issue,
        "status": r.status,
        "location": r.location,
        "repair_location": r.repair_location,
        "admin_notes": r.admin_notes,
        "date": r.date_received.strftime("%d/%m/%Y")
    } for r in records]
    return jsonify({"success": True, "records": result})


@app.route('/api/admin/rma/update', methods=['POST'])
def update_rma():
    data = request.json
    record = RMARecord.query.filter_by(rma_code=data.get('rma_code')).first()
    if record:
        record.status = data.get('status', record.status)
        record.repair_location = data.get(
            'repair_location', record.repair_location)
        record.admin_notes = data.get('admin_notes', record.admin_notes)
        db.session.commit()
        # DYNAMIC SYNC TO GOOGLE SHEET
        try:
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update',
                'rma_code': record.rma_code,
                'status': record.status,
                'notes': record.admin_notes
            }, timeout=5)
        except Exception as e:
            print(f"Google Update Error: {e}")
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Record not found."}), 404


# ==========================================
# TECHNICIAN (WE REPAIR BD) ROUTES
# ==========================================

@app.route('/repair-login', methods=['GET', 'POST'])
def repair_login():
    """Login specifically for the third-party technician"""
    if request.method == 'POST':
        password = request.form.get('password')
        # The password for the repair guy is 'werepair123'
        if password == 'werepair123':
            session['repair_logged_in'] = True
            return redirect(url_for('repair_dashboard'))
        else:
            return render_template('repair_login.html', error="Invalid technician password.")
    return render_template('repair_login.html')


@app.route('/repair-logout')
def repair_logout():
    session.pop('repair_logged_in', None)
    return redirect(url_for('repair_login'))


@app.route('/repair')
def repair_dashboard():
    """Serves the Technician portal ONLY if logged in"""
    if not session.get('repair_logged_in'):
        return redirect(url_for('repair_login'))
    return render_template('repair.html')


@app.route('/api/repair/all', methods=['GET'])
def get_repair_rmas():
    """Pulls ONLY the records assigned to 'We Repair BD'. Hides customer data."""
    if not session.get('repair_logged_in'):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    records = RMARecord.query.filter_by(repair_location="We Repair BD").order_by(
        RMARecord.date_received.desc()).all()
    result = []
    for r in records:
        result.append({
            "rma_code": r.rma_code,
            "product_name": r.product_name,
            "serial_number": r.serial_number,
            "issue": r.issue,
            "status": r.status,
            "date": r.date_received.strftime("%d/%m/%Y"),
            "customer_name": r.customer_name,
            "contact": r.contact,
            "address": r.address
        })
    return jsonify({"success": True, "records": result})


@app.route('/api/repair/update', methods=['POST'])
def update_repair_rma():
    data = request.json
    record = RMARecord.query.filter_by(rma_code=data.get(
        'rma_code'), repair_location="We Repair BD").first()
    if record:
        record.status = data.get('status', record.status)
        tech_note = data.get('tech_notes', '').strip()
        if tech_note:
            timestamp = datetime.now().strftime("%d/%m %H:%M")
            record.admin_notes = f"{record.admin_notes}\n[{timestamp} Tech]: {tech_note}"
        db.session.commit()
        # DYNAMIC SYNC TO GOOGLE SHEET
        try:
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update',
                'rma_code': record.rma_code,
                'status': record.status,
                'notes': record.admin_notes
            }, timeout=5)
        except Exception as e:
            print(f"Google Update Error: {e}")
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Not found"}), 404


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
