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

**Talk2Text** enables:
- 🧑‍⚕️ **Speech Therapists** to assign custom exercises, define scoring rubrics per patient, and deliver direct feedback.
- 🧒 **Patients** to practice assigned sentences, get instant analysis, track progress, and improve over time.

---

## 👥 Team Details

**Team Name**: `talk2text`

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

## 🔐 Firebase Setup (Minimal)
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable:
   - **Firestore Database**
   - **Authentication (Email/Password)**
3. Copy your Firebase config keys and add them to `src/config.js`:
   ```javascript
   // src/config.js
   export const FIREBASE_CONFIG = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```
4. Add this file to `.gitignore`:
   ```
   # Ignore Firebase config with API keys
   src/config.js
   ```

5. For detailed Firebase role-based rules, see `firebase.rules` in the repo.

---

## ▶️ Running Locally
1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   ```
2. Install Dependencies (Optional: For local ASR testing)
    ```bash
    pip install -r requirements.txt
    ```
3. Add Firebase config in `src/config.js`.
4. Run locally:
   - Option 1: Open `index.html` in your browser for local UI testing.
   - Option 2: Use a simple local server:
     ```bash
     python -m http.server 8000
     ```
     Then open `http://localhost:8000`

---

## 🔥 Deploy (Firebase Hosting)

For hosting, ensure Firebase CLI is installed:
```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy

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
