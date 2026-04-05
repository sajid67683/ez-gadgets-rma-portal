# EZ GADGETS | Warranty & Repair Management Portal

A professional, three-tier management system built with **Python (Flask)** and **SQLAlchemy**. This portal streamlines the RMA (Return Merchandise Authorization) process, connecting customers, administrators, and third-party technicians in real-time with automated **Google Sheets synchronization**.

---

## 🚀 Core Features

### 1. Customer Portal
* **Digital RMA Generation:** Customers can submit warranty claims with device details and images.
* **Instant Tracking:** Search by RMA code to see real-time status updates.
* **Modern UI:** Responsive design with Light/Dark mode support.

### 2. Admin Dashboard
* **Ticket Management:** View, search, and manage all incoming repair requests.
* **Assignment Logic:** Route specific repairs to the "We Repair BD" partner portal.
* **Printable Receipts:** Generate professional PDF receipts with watermarks for customers.

### 3. Technician Portal (We Repair BD)
* **Secure Access:** Dedicated login for third-party repair partners.
* **Privacy Focused:** Technicians see device and issue details but **not** sensitive customer contact info.
* **Status Updates:** Real-time updates (Fixed/Replaced/Cannot Fix) that sync back to the main database.

---

## 📊 Technical Stack

* **Backend:** Python 3.x / Flask
* **Database:** SQLite (SQLAlchemy ORM)
* **Cloud Sync:** Google Apps Script API (Google Sheets)
* **Frontend:** Vanilla JS, CSS3 (Custom Variables), HTML5
* **PDF Engine:** jsPDF

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/ez-gadgets-portal.git](https://github.com/your-username/ez-gadgets-portal.git)
cd ez-gadgets-portal


2. Install Dependencies

pip install -r requirements.txt

3. Configure Google Sheets Sync
Open a Google Sheet and go to Extensions > Apps Script.
Paste the provided code.gs (Apps Script) and deploy as a Web App.
Set access to "Anyone".
Copy the Web App URL and paste it into app.py:
GOOGLE_SCRIPT_URL = "[https://script.google.com/macros/s/.../exec](https://script.google.com/macros/s/.../exec)"

4. Run the Application
python app.py

The portal will be live at http://127.0.0.1:5001.

📂 Project Structure

Plaintext
├── app.py              # Main Flask Application
├── repair_portal.db    # SQLite Database (Auto-generated)
├── requirements.txt    # Project Dependencies
├── static/
│   ├── css/            # Custom UI Styling
│   ├── js/             # Portal Logic (Customer, Admin, Repair)
│   └── images/         # Logos and Favicon
└── templates/          # HTML Portals




