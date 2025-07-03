import streamlit as st
import requests
import time


st.set_page_config(page_title="Talk2Text", layout="centered")


st.markdown("""
    <style>
    body {
        background-color: #fceef5;
    }
    .block-container {
        background-color: #fff0f6;
        padding: 2rem;
        border-radius: 12px;
    }
    h1 {
        color: #b57edc;
        text-align: center;
    }
    p, label {
        color: #4b4b4b;
    }
    .stButton button {
        background-color: #dcb0f2;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1.2rem;
    }
    .stButton button:hover {
        background-color: #c792e5;
    }
    textarea {
        background-color: #fff9fc !important;
    }
    .footer {
        font-size: 0.8rem;
        color: gray;
        margin-top: 2rem;
        text-align: center;
    }
    </style>
""", unsafe_allow_html=True)


nav = st.sidebar.radio("Navigate", ["🏠 Home", "📂 History", "ℹ️ About"])

st.sidebar.markdown("---")
st.sidebar.markdown("Made with ❤️ using Streamlit")


if "text" not in st.session_state:
    st.session_state.text = ""

if "history" not in st.session_state:
    st.session_state.history = []

if nav == "🏠 Home":
    st.markdown("<h1>Talk2Text</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; font-size:18px;'>Convert your audio file into text effortlessly.</p>", unsafe_allow_html=True)
    st.markdown("---")

    uploaded_file = st.file_uploader("Upload your audio file", type=["wav", "mp3", "m4a"])

    if uploaded_file:
        st.audio(uploaded_file, format='audio/wav')

    API_URL = "http://localhost:8000/transcribe/"

    if uploaded_file:
        if st.button("Transcribe"):
            with st.spinner("Transcribing, please wait..."):
                try:
                    start_time = time.time()
                    files = {"file": (uploaded_file.name, uploaded_file, uploaded_file.type)}
                    response = requests.post(API_URL, files=files)
                    end_time = time.time()

                    if response.status_code == 200:
                        text = response.json().get("text", "")
                        st.session_state.text = text
                        st.success("✅ Transcription complete.")
                        st.text_area("📝 Transcribed Text", text, height=300)
                        st.code(text, language='markdown')

                        st.markdown(f"**⏱ Time Taken:** {round(end_time - start_time, 2)} seconds")
                        st.markdown(f"**📝 Word Count:** {len(text.split())}")
                        st.markdown(f"**🔤 Character Count:** {len(text)}")

                        st.download_button(
                            label="📥 Download Transcript",
                            data=text,
                            file_name=uploaded_file.name.replace(".", "_") + ".txt",
                            mime="text/plain"
                        )
                    else:
                        st.error(f"Failed with status code: {response.status_code}")
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    else:
        st.markdown("Please upload an audio file to begin transcription.")

    if uploaded_file and st.button("💾 Save This Transcript"):
        if st.session_state.text:
            st.session_state.history.append((uploaded_file.name, st.session_state.text))
            st.success("Transcript saved.")

elif nav == "📂 History":
    st.markdown("<h1>📂 Transcript History</h1>", unsafe_allow_html=True)

    if st.session_state.history:
        for i, (name, txt) in enumerate(st.session_state.history[::-1]):
            with st.expander(f"📄 {name}"):
                st.write(txt)

        if st.button("🗑️ Clear All History"):
            st.session_state.history = []
            st.success("History cleared.")
    else:
        st.info("No saved transcripts yet.")

elif nav == "ℹ️ About":
    st.markdown("<h1>ℹ️ About Talk2Text</h1>", unsafe_allow_html=True)
    st.markdown("""
        **Talk2Text** is a simple voice transcription tool powered by:
        - 🧠 OpenAI Whisper (via FastAPI backend)
        - ⚡ Streamlit for frontend UI
        - 🗂️ Support for WAV, MP3, and M4A files

        Use the **Home** tab to transcribe, and **History** to view saved texts.
    """)
    st.markdown("Created with for developers, educators, and content creators.")

# ------------------- FOOTER -------------------
st.markdown("<hr class='footer'><div class='footer'>© 2025 Talk2Text · Built with Streamlit, FastAPI, and Whisper</div>", unsafe_allow_html=True)
