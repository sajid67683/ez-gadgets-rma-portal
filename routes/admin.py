from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for, Response, make_response
from werkzeug.security import check_password_hash
from models import db, RMARecord, User
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
        user = User.query.filter_by(username='admin').first()
        if user and check_password_hash(user.password_hash, password):
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
    records = RMARecord.query.order_by(RMARecord.date_received.desc()).all()
    result = [{
        "rma_code": r.rma_code, "customer_name": r.customer_name,
        "contact": r.contact, "address": r.address, "product_name": r.product_name,
        "serial_number": r.serial_number, "issue": r.issue, "status": r.status,
        "location": r.location, "repair_location": r.repair_location,
        "admin_notes": r.admin_notes, "date": r.date_received.strftime("%d/%m/%Y")
    } for r in records]
    return jsonify({"success": True, "records": result})


@admin_bp.route('/api/admin/rma/update', methods=['POST'])
def update_rma():
    data = request.json
    record = RMARecord.query.filter_by(rma_code=data.get('rma_code')).first()
    if record:
        record.status = data.get('status', record.status)
        record.repair_location = data.get(
            'repair_location', record.repair_location)
        record.admin_notes = data.get('admin_notes', record.admin_notes)
        db.session.commit()
        try:
            requests.get(GOOGLE_SCRIPT_URL, params={
                'action': 'update', 'rma_code': record.rma_code,
                'status': record.status, 'notes': record.admin_notes
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
    """Exports all database records as a CSV file."""
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    records = RMARecord.query.all()
    si = io.StringIO()
    cw = csv.writer(si)

    # Header row
    cw.writerow(['RMA Code', 'Location', 'Customer', 'Contact', 'Address',
                'Product', 'S/N', 'Issue', 'Status', 'Repair Loc', 'Notes'])

    for r in records:
        cw.writerow([
            r.rma_code, r.location, r.customer_name, r.contact, r.address,
            r.product_name, r.serial_number, r.issue, r.status, r.repair_location, r.admin_notes
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=ez_rma_export.csv"
    output.headers["Content-type"] = "text/csv"
    return output


@admin_bp.route('/api/admin/rma/import', methods=['POST'])
def import_rmas():
    """Imports CSV data with strict duplicate checking (all fields must match to skip)."""
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    file = request.files.get('file')
    if not file:
        return jsonify({"success": False, "error": "No file provided"}), 400

    stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
    csv_input = csv.DictReader(stream)
    imported_count = 0

    for row in csv_input:
        # Strict Duplicate Check: Skip ONLY if every piece of info is exactly identical[cite: 1]
        is_duplicate = RMARecord.query.filter_by(
            rma_code=row['RMA Code'],
            location=row['Location'],
            customer_name=row['Customer'],
            contact=row['Contact'],
            address=row['Address'],
            product_name=row['Product'],
            serial_number=row['S/N'],
            issue=row['Issue'],
            status=row['Status'],
            repair_location=row['Repair Loc'],
            admin_notes=row['Notes']
        ).first()

        if not is_duplicate:
            new_record = RMARecord(
                rma_code=row['RMA Code'],
                location=row['Location'],
                customer_name=row['Customer'],
                contact=row['Contact'],
                address=row['Address'],
                product_name=row['Product'],
                serial_number=row['S/N'],
                issue=row['Issue'],
                status=row['Status'],
                repair_location=row['Repair Loc'],
                admin_notes=row['Notes']
            )
            db.session.add(new_record)
            imported_count += 1

    db.session.commit()
    return jsonify({"success": True, "count": imported_count})


@admin_bp.route('/api/admin/rma/delete/<code>', methods=['DELETE'])
def delete_rma(code):
    """Permanently deletes a specific RMA record."""
    if not session.get('admin_logged_in'):
        return jsonify({"success": False}), 401

    record = RMARecord.query.filter_by(rma_code=code).first()
    if record:
        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Record not found."}), 404
