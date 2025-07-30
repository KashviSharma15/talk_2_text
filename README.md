<p align="center">
  <img src="https://github.com/user-attachments/assets/9697997e-72e9-48ec-8ccc-c3c564356464" alt="TalkToText Logo" height="150" width="150"/>
</p>

# 🗣️ TalkToText — Empowering Better Speech Through Technology

A comprehensive web platform enabling accessible speech therapy using AI-driven pronunciation analysis, real-time feedback, and therapist-patient collaboration. Built for the **AI Summer od Code 2025**, the app is designed to support individuals with speech impairments by providing structured practice and progress tracking.

---

## 💡 Problem Statement

Children and individuals with speech disorders often lack consistent access to personalized speech therapy. Existing solutions rarely provide real-time performance feedback, therapist-driven customization, or structured assignment-tracking—especially in low-resource environments.

---

## 🎯 Our Solution

**Text2Talk** enables:
- 🧑‍⚕️ **Speech Therapists** to assign custom exercises, define scoring rubrics per patient, and deliver direct feedback.
- 🧒 **Patients** to practice assigned sentences, get instant analysis, track progress, and improve over time.

---

## 👥 Team Details

**Team Name**: `text2talk`

| Name               | Email                              |
|--------------------|------------------------------------|
| Niharika           | niharika10092005@gmail.com         |
| Avantika Pandey    | er.avantikapandey@gmail.com        |
| Gayatri Mehta      | gayatri.mehta.au@gmail.com         |
| Kashvi Sharma      | kashvi.sharma5944@gmail.com        |
| Komalpreet Kaur    | komalindus987@gmail.com            |

---

## 🚀 Key Features

### 🩺 Therapist Portal
- Assign exercises to patients
- Customize scoring rubric (per patient!)
- View pronunciation history and feedback
- Provide direct written feedback to patients

### 🧒 Patient Portal
- Practice assigned speech exercises
- Get real-time pronunciation scoring using ASR + Levenshtein logic
- Track daily goals and practice streaks
- View feedback and listen to corrected words

### 📊 Pronunciation Analysis Engine
- Mispronunciation, omission, insertion detection
- Custom rubric-based scoring
- Real-time transcription using browser-based ASR

---

## 🛠️ Built With

- **Frontend**: Vanilla JS, HTML, CSS
- **Speech Analysis**: Web Audio API + custom word comparison engine
- **Database**: Firebase Firestore (structured per doctor/patient)
- **Auth**: Firebase Authentication
- **Realtime Feedback & History**: Firestore listeners
- **Hosting**: Firebase Hosting
- **Charts**: Chart.js

---

## 📁 Project Structure

```
project/
├── index.html
├── app.html
├── src/
│   ├── main.js
│   ├── constants.js
│   ├── firebaseService.js
│   ├── uiManager.js
│   ├── audioRecorder.js
│   ├── asrService.js        
│   ├── analysisService.js    
│   ├── doctorManager.js
│   └── patientManager.js
```

---

## 🔐 Firebase Firestore Rules (Per Role Access)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    match /artifacts/{appId}/doctors/{doctorId}/patients/{patientId}/rubricSettings/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }

    match /artifacts/{appId}/users/{userId}/{subCollection}/{docId} {
      allow read, create, update: if request.auth != null && request.auth.uid == userId;

      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "doctor";

      allow create: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "doctor" &&
        (subCollection == "patientFeedback" || subCollection == "assignedExercises");

      allow create, update: if request.auth != null &&
        request.auth.uid == userId &&
        subCollection == "rubricSettings";
    }
  }
}
```

---

## 🚀 Deployment Guide (Firebase Hosting)

### ✅ Prerequisites

- [Node.js](https://nodejs.org/)
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project (e.g., `speechtherapyapp-f524f`)

### 🔌 Firebase Initialization

```bash
firebase login
firebase init
```

Choose:
- ✅ Hosting: Configure files for Firebase Hosting
- Set `public` directory as: `.`
- Choose `index.html` as default
- Decline SPA rewrite unless needed

### 🔁 Set Firebase Project

```bash
firebase use --add
# Select your Firebase project (e.g., speechtherapyapp-f524f)
```

### 🚀 Deploy

```bash
firebase deploy
```

---

## 🔧 Example `firebase.json`

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 🧪 Example Testing Flow

1. Login as a doctor and assign an exercise to a patient
2. Customize the rubric for that specific patient
3. Login as that patient, practice the exercise
4. See the feedback and score computed using the rubric
5. Doctor can review the history and give feedback

---

## 📌 Future Scope

- 🎯 ML-based auto feedback and suggestions
- 📱 Mobile-friendly progressive web app
- 🥇 Gamified rewards for streaks and goals
- 🔄 Exportable session reports for therapist records

---

## 🤝 Contributing

Feel free to fork this repository, open issues, and submit PRs. For major contributions, reach out via email.

---

> _“When you change the way you speak, you can change how the world hears you.”_
