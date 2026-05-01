import sqlite3
import os
from datetime import datetime
from app import app, db, RMARecord

# 1. Connect to the old SQLite database
sqlite_db_path = os.path.join('instance', 'ezgadgets_rma.db')

if not os.path.exists(sqlite_db_path):
    print("❌ Could not find the old SQLite database at:", sqlite_db_path)
    exit()

print("📦 Found old database. Packing up records...")
conn = sqlite3.connect(sqlite_db_path)
cursor = conn.cursor()

try:
    # Grab everything from the old table
    cursor.execute("SELECT rma_code, date_received, location, customer_name, contact, address, product_name, serial_number, issue, status, repair_location, admin_notes FROM rma_record")
    old_records = cursor.fetchall()
    print(f"🚚 Loaded {len(old_records)} records into the moving truck.")

    # 2. Unpack them into the new PostgreSQL database
    with app.app_context():
        migrated_count = 0
        for row in old_records:
            # Check if it already exists so we don't make duplicates
            existing = RMARecord.query.filter_by(rma_code=row[0]).first()
            if not existing:
                new_record = RMARecord(
                    rma_code=row[0],
                    location=row[2],
                    customer_name=row[3],
                    contact=row[4],
                    address=row[5],
                    product_name=row[6],
                    serial_number=row[7],
                    issue=row[8],
                    status=row[9],
                    repair_location=row[10],
                    admin_notes=row[11]
                )

                # Handle the date formatting from SQLite to Postgres
                if isinstance(row[1], str):
                    # Strip off the milliseconds if they exist
                    clean_date = row[1].split('.')[0]
                    new_record.date_received = datetime.strptime(
                        clean_date, '%Y-%m-%d %H:%M:%S')

                db.session.add(new_record)
                migrated_count += 1

        db.session.commit()
        print(
            f"✅ Successfully unpacked {migrated_count} records into PostgreSQL!")

except Exception as e:
    print(f"❌ Something went wrong: {e}")
finally:
    conn.close()
