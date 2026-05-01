from app import app, db

with app.app_context():
    # This deletes all existing tables and their data
    db.drop_all()
    print("🗑️ All old data completely wiped!")
    
    # This rebuilds fresh, empty tables
    db.create_all()
    print("✨ Fresh tables created. You are ready to go!")