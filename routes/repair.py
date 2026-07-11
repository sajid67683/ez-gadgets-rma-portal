from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import check_password_hash
# Import the MongoDB db object. Removed RMARecord and User.
from models import db
from datetime import datetime
import requests

repair_bp = Blueprint('repair', __name__)
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJ-m39N1lQ82y76-KnTGj5dxL4mWbsHULFcAvHRv-rBKctYKlverRDLzVRPhSTuqCi4g/exec"


@repair_bp.route('/repair-login', methods=['GET', 'POST'])
def repair_login():
    if request.method == 'POST':
        password = request.form.get('password')
        # 1. Use MongoDB to find the tech user
        user = db.users.find_one({"username": "tech"})

        # Note: Access dictionary keys with user["password_hash"] instead of user.password_hash
        if user and check_password_hash(user["password_hash"], password):
            session['repair_logged_in'] = True
            return redirect(url_for('repair.repair_dashboard'))
        else:
            return render_template('repair_login.html', error="Invalid technician password.")
    return render_template('repair_login.html')


@repair_bp.route('/repair-logout')
def repair_logout():
    session.pop('repair_logged_in', None)
    return redirect(url_for('repair.repair_login'))


@repair_bp.route('/repair')
def repair_dashboard():
    if not session.get('repair_logged_in'):
        return redirect(url_for('repair.repair_login'))
    return render_template('repair.html')


@repair_bp.route('/api/repair/all', methods=['GET'])
def get_repair_rmas():
    if not session.get('repair_logged_in'):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    # 2. Use MongoDB find() and sort() instead of SQLAlchemy
    records = list(db.records.find(
        {"repair_location": "We Repair BD"}).sort("date_received", -1))

    # Using .get() for fields that might be empty or missing (like address or serial_number) prevents errors
    result = [{
        "rma_code": r["rma_code"],
        "product_name": r["product_name"],
        "serial_number": r.get("serial_number", ""),
        "issue": r["issue"],
        "status": r["status"],
        "date": r["date_received"].strftime("%d/%m/%Y"),
        "customer_name": r["customer_name"],
        "contact": r["contact"],
        "address": r.get("address", "")
    } for r in records]

    return jsonify({"success": True, "records": result})


@repair_bp.route('/api/repair/update', methods=['POST'])
def update_repair_rma():
    data = request.json

    # 3. Find the specific record in MongoDB
    record = db.records.find_one({"rma_code": data.get(
        'rma_code'), "repair_location": "We Repair BD"})

    if record:
        new_status = data.get('status', record.get('status'))
        tech_note = data.get('tech_notes', '').strip()
        new_notes = record.get('admin_notes', '')

        if tech_note:
            timestamp = datetime.now().strftime("%d/%m %H:%M")
            new_notes = f"{new_notes}\n[{timestamp} Tech]: {tech_note}"

        # 4. Use update_one to save changes instead of db.session.commit()
        db.records.update_one(
            {"rma_code": record["rma_code"]},
            {"$set": {
                "status": new_status,
                "admin_notes": new_notes
            }}
        )

        try:
            # Sync to Google Sheets
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update', 'rma_code': record["rma_code"],
                'status': new_status, 'notes': new_notes
            }, timeout=5)
        except Exception as e:
            print(f"Google Update Error: {e}")

        return jsonify({"success": True})

    return jsonify({"success": False, "error": "Not found"}), 404
