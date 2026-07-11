from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for, Response, make_response
from werkzeug.security import check_password_hash
from models import db  # Import our new MongoDB db object
from datetime import datetime
import requests
import csv
import io

admin_bp = Blueprint('admin', __name__)
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJ-m39N1lQ82y76-KnTGj5dxL4mWbsHULFcAvHRv-rBKctYKlverRDLzVRPhSTuqCi4g/exec"

# ==========================================
# AUTHENTICATION & DASHBOARD
# ==========================================


@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        # 1. MongoDB user lookup
        user = db.users.find_one({"username": "admin"})

        # Access password_hash using dictionary keys
        if user and check_password_hash(user["password_hash"], password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin.admin_dashboard'))
        else:
            return render_template('login.html', error="Invalid password.")
    return render_template('login.html')


@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('customer.customer_portal'))


@admin_bp.route('/admin')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin.login'))
    return render_template('admin.html')

# ==========================================
# DATA RETRIEVAL & UPDATES
# ==========================================


@admin_bp.route('/api/admin/rma/all', methods=['GET'])
def get_all_rmas():
    # 2. MongoDB find() and sort()
    records = list(db.records.find().sort("date_received", -1))

    # Use .get() to safely grab dictionary values just in case a field is missing
    result = [{
        "rma_code": r["rma_code"], "customer_name": r["customer_name"],
        "contact": r["contact"], "address": r.get("address", ""), "product_name": r["product_name"],
        "serial_number": r.get("serial_number", ""), "issue": r["issue"], "status": r["status"],
        "location": r["location"], "repair_location": r.get("repair_location", ""),
        "admin_notes": r.get("admin_notes", ""), "date": r["date_received"].strftime("%d/%m/%Y")
    } for r in records]

    return jsonify({"success": True, "records": result})


@admin_bp.route('/api/admin/rma/update', methods=['POST'])
def update_rma():
    data = request.json

    # 3. Find record in MongoDB
    record = db.records.find_one({"rma_code": data.get('rma_code')})

    if record:
        new_status = data.get('status', record.get('status'))
        new_repair_loc = data.get(
            'repair_location', record.get('repair_location'))
        new_notes = data.get('admin_notes', record.get('admin_notes'))

        # 4. Use update_one instead of db.session.commit()
        db.records.update_one(
            {"rma_code": record["rma_code"]},
            {"$set": {
                "status": new_status,
                "repair_location": new_repair_loc,
                "admin_notes": new_notes
            }}
        )

        try:
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update', 'rma_code': record["rma_code"],
                'status': new_status, 'notes': new_notes
            }, timeout=5)
        except Exception as e:
            print(f"Google Update Error: {e}")

        return jsonify({"success": True})

    return jsonify({"success": False, "error": "Record not found."}), 404

# ==========================================
# DATA MANAGEMENT (EXPORT, IMPORT, DELETE)
# ==========================================


@admin_bp.route('/api/admin/rma/export', methods=['GET'])
def export_rmas():
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    records = db.records.find()
    si = io.StringIO()
    cw = csv.writer(si)

    cw.writerow(['RMA Code', 'Location', 'Customer', 'Contact', 'Address',
                'Product', 'S/N', 'Issue', 'Status', 'Repair Loc', 'Notes'])

    for r in records:
        cw.writerow([
            r.get("rma_code"), r.get("location"), r.get(
                "customer_name"), r.get("contact"), r.get("address"),
            r.get("product_name"), r.get("serial_number"), r.get("issue"), r.get(
                "status"), r.get("repair_location"), r.get("admin_notes")
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=ez_rma_export.csv"
    output.headers["Content-type"] = "text/csv"
    return output


@admin_bp.route('/api/admin/rma/import', methods=['POST'])
def import_rmas():
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    file = request.files.get('file')
    if not file:
        return jsonify({"success": False, "error": "No file provided"}), 400

    stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
    csv_input = csv.DictReader(stream)
    imported_count = 0

    for row in csv_input:
        # Map CSV columns directly to your database fields
        rma_code = row.get('RMA Code')
        if not rma_code:
            continue

        # Prevent duplicates
        if not db.records.find_one({"rma_code": rma_code}):
            db.records.insert_one({
                "rma_code": rma_code,
                "location": row.get('Branch', ''),
                "customer_name": row.get('Name', ''),
                "contact": row.get('Number', ''),
                # Note: CSV uses 'Adress' (typo in source)
                "address": row.get('Adress', ''),
                "product_name": row.get('Product Name', ''),
                "serial_number": row.get('Code', ''),
                "issue": row.get('Issue', ''),
                "status": row.get('Status', 'Pending Drop-off'),
                "repair_location": "In-House",  # Default as it's missing in CSV
                "admin_notes": row.get('Notes', ''),
                "date_received": datetime.utcnow()
            })
            imported_count += 1

    return jsonify({"success": True, "count": imported_count})


@admin_bp.route('/api/admin/rma/delete/<code>', methods=['DELETE'])
def delete_rma(code):
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    # 6. MongoDB delete_one() instead of db.session.delete()
    result = db.records.delete_one({"rma_code": code})

    # Check if a document was actually deleted
    if result.deleted_count > 0:
        return jsonify({"success": True})

    return jsonify({"success": False, "error": "Record not found."}), 404
