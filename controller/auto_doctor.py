from controller.models import Patient
from controller.database import db

def create_doctor():
    if not Patient.query.filter_by(is_doctor=True).first():
        doctor = Patient(
            email='doctor@gmail.com',
            username='Doctor',
            password='doctor',
            is_doctor=True
        )
        db.session.add(doctor)
        db.session.commit()
        print("Auto doctor created.")
    else:
        print("Doctor already exists.")
