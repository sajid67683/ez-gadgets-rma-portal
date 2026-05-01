from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    # 1. Create the new User table in your database
    db.create_all()
    
    # 2. Check if admin exists, if not, create them
    if not User.query.filter_by(username='admin').first():
        admin_user = User(
            username='admin', 
            password_hash=generate_password_hash('ezadmin123'), 
            role='admin'
        )
        db.session.add(admin_user)
        
    # 3. Check if tech exists, if not, create them
    if not User.query.filter_by(username='tech').first():
        tech_user = User(
            username='tech', 
            password_hash=generate_password_hash('werepair123'), 
            role='tech'
        )
        db.session.add(tech_user)
        
    db.session.commit()
    print("✅ Secure users created successfully!")