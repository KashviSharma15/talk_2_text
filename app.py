from flask import Flask, render_template, redirect, url_for, request, session, flash
from controller.database import db
from controller.config import Config
from controller.auto_doctor import create_doctor
from controller.models import Patient

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()
    create_doctor()

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        full_name = request.form['full_name']
        email = request.form['email']
        password = request.form['password']

        if Patient.query.filter_by(email=email).first():
            flash("Email already exists!")
            return redirect(url_for('register'))

        patient = Patient(email=email, username=full_name, password=password, is_doctor=False)
        db.session.add(patient)
        db.session.commit()

        flash("Registration successful! Please log in.")
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        patient = Patient.query.filter_by(email=email).first()

        if patient and patient.password == password:
            session['user_id'] = patient.id
            session['is_doctor'] = patient.is_doctor
            flash("Login successful!", "success")

            if patient.is_doctor:
                return redirect(url_for('doctor_dashboard'))
            else:
                return redirect(url_for('patient_dashboard'))
        else:
            flash("Invalid credentials. Please try again.", "error")
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/doctor_dashboard')
def doctor_dashboard():
    if not session.get('user_id') or not session.get('is_doctor'):
        flash("Unauthorized", "danger")
        return redirect(url_for('login'))
    return render_template('doctor_dashboard.html')

@app.route('/view_profiles')
def view_profiles():
    return render_template('view_profiles.html')

@app.route('/review_results')
def review_results():
    return render_template('review_results.html')

@app.route('/progress_analysis')
def progress_analysis():
    return render_template('progress_analysis.html')

@app.route('/patient_dashboard')
def patient_dashboard():
    if not session.get('user_id') or session.get('is_doctor'):
        flash("Unauthorized", "danger")
        return redirect(url_for('login'))
    return render_template('patient_dashboard.html')

@app.route('/start_game')
def start_game():
    return render_template('start_game.html')

@app.route('/view_progress')
def view_progress():
    return render_template('view_progress.html')

@app.route('/achievements')
def achievements():
    return render_template('achievements.html')


@app.route('/logout')
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
