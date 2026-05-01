from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import check_password_hash
from models import db, RMARecord, User
from datetime import datetime
import requests

repair_bp = Blueprint('repair', __name__)
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJ-m39N1lQ82y76-KnTGj5dxL4mWbsHULFcAvHRv-rBKctYKlverRDLzVRPhSTuqCi4g/exec"

@repair_bp.route('/repair-login', methods=['GET', 'POST'])
def repair_login():
    if request.method == 'POST':
        password = request.form.get('password')
        user = User.query.filter_by(username='tech').first()
        if user and check_password_hash(user.password_hash, password):
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
    records = RMARecord.query.filter_by(repair_location="We Repair BD").order_by(RMARecord.date_received.desc()).all()
    result = [{
        "rma_code": r.rma_code, "product_name": r.product_name,
        "serial_number": r.serial_number, "issue": r.issue,
        "status": r.status, "date": r.date_received.strftime("%d/%m/%Y"),
        "customer_name": r.customer_name, "contact": r.contact, "address": r.address
    } for r in records]
    return jsonify({"success": True, "records": result})

@repair_bp.route('/api/repair/update', methods=['POST'])
def update_repair_rma():
    data = request.json
    record = RMARecord.query.filter_by(rma_code=data.get('rma_code'), repair_location="We Repair BD").first()
    if record:
        record.status = data.get('status', record.status)
        tech_note = data.get('tech_notes', '').strip()
        if tech_note:
            timestamp = datetime.now().strftime("%d/%m %H:%M")
            record.admin_notes = f"{record.admin_notes}\n[{timestamp} Tech]: {tech_note}"
        db.session.commit()
        try:
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update', 'rma_code': record.rma_code,
                'status': record.status, 'notes': record.admin_notes
            }, timeout=5)
        except Exception as e:
            print(f"Google Update Error: {e}")
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Not found"}), 404