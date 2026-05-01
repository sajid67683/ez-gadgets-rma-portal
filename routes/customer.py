from flask import Blueprint, request, jsonify, render_template
from models import db, RMARecord
from datetime import datetime
import random
import string
import requests
import os

customer_bp = Blueprint('customer', __name__)
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJ-m39N1lQ82y76-KnTGj5dxL4mWbsHULFcAvHRv-rBKctYKlverRDLzVRPhSTuqCi4g/exec"

def generate_rma_code(location):
    if "Badda" in location: prefix = "EZ-BDA"
    elif "Multiplan" in location: prefix = "EZ-MLT"
    else: prefix = "EZ-CTG"
    date_str = datetime.now().strftime("%y%m%d")
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{date_str}-{random_chars}"

@customer_bp.route('/')
def customer_portal():
    return render_template('customer.html')

@customer_bp.route('/api/rma/create', methods=['POST'])
def create_rma():
    data = request.json
    branch_location = data.get('location', 'CTG Branch')
    new_code = generate_rma_code(branch_location)
    
    new_rma = RMARecord(
        rma_code=new_code, location=branch_location,
        customer_name=data.get('customerName'), contact=data.get('contact'),
        address=data.get('address'), product_name=data.get('productName'),
        serial_number=data.get('serialNumber'), issue=data.get('issue')
    )
    try:
        db.session.add(new_rma)
        db.session.commit()
        requests.get(GOOGLE_SCRIPT_URL, params={
            'action': 'add', 'rma_code': new_code, 'date': datetime.now().strftime("%d/%m/%Y"),
            'location': new_rma.location, 'customerName': new_rma.customer_name,
            'contact': new_rma.contact, 'productName': new_rma.product_name,
            'serialNumber': new_rma.serial_number, 'issue': new_rma.issue,
            'address': new_rma.address
        }, timeout=5)
        return jsonify({"success": True, "rma_code": new_code})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": "Database or Sync failed."}), 500

@customer_bp.route('/api/rma/status/<code>', methods=['GET'])
def check_status(code):
    record = RMARecord.query.filter_by(rma_code=code).first()
    if record:
        return jsonify({
            "success": True, "rma_code": record.rma_code,
            "product_name": record.product_name, "status": record.status,
            "date_received": record.date_received.strftime("%d %b %Y")
        })
    return jsonify({"success": False, "error": "RMA not found."}), 404