import streamlit as st
import requests
import speech_recognition as sr
from gtts import gTTS
import os
from io import BytesIO
import base64
import uuid

# Define a folder in your project for temporary audio files
TEMP_AUDIO_DIR = "temp_audio"

# Ensure the directory exists
if not os.path.exists(TEMP_AUDIO_DIR):
    os.makedirs(TEMP_AUDIO_DIR)

def text_to_speech(text):
    try:
        unique_filename = f"{uuid.uuid4()}.mp3"
        audio_file_path = os.path.join(TEMP_AUDIO_DIR, unique_filename)

        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(audio_file_path)
        print(f"Audio file saved to {audio_file_path}")
        
        if os.path.isfile(audio_file_path):  # Ensure the file exists before reading
            with open(audio_file_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
            print(f"Audio file read from {audio_file_path}")

            for file in os.listdir(TEMP_AUDIO_DIR):
                file_path = os.path.join(TEMP_AUDIO_DIR, file)
                if file_path != audio_file_path:
                    try:
                        print(f"Deleting file {file_path}")
                        os.unlink(file_path)
                    except Exception as e:
                        print(f"Error deleting file {file_path}: {e}")
            
            return base64.b64encode(audio_bytes).decode()
        else:
            raise FileNotFoundError(f"Audio file {audio_file_path} not found")
    except Exception as e:
        print(f"Error in text-to-speech conversion: {e}")
        return None


st.set_page_config(
    page_title="Student Loan Counselor",
    page_icon="🎓",
    layout="wide"
)

st.markdown("""
    <style>
    .main { padding: 2rem; }
    .stButton button {
        width: 100%;
        border-radius: 5px;
        height: 3em;
        background-color: #4CAF50;
        color: white;
    }
    .stTextInput > div > div > input { border-radius: 5px; }
    .response-box {
        border: 2px solid #4CAF50;
        border-radius: 10px;
        padding: 15px;
        background-color: #f4f4f4;
        font-size: 16px;
        color: #333;
        overflow-y: auto;
        height: 200px;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🎓 Student Loan Counselor AI")
st.markdown("Your AI-powered assistant for navigating international student loans.")

col1, col2 = st.columns([1, 2])

with col1:
    st.markdown("## 👤 User Information")
    user_id = st.text_input("User ID", placeholder="Enter your unique ID")

    st.markdown("## 📝 Student Details")
    student_details = {
        "name": st.text_input("Full Name", placeholder="Enter your full name"),
        "origin_country": st.text_input("Origin Country", placeholder="Your home country"),
        "destination_country": st.text_input("Destination Country", placeholder="Where you plan to study"),
        "loan_amount_needed": st.number_input("Loan Amount Needed ($)", min_value=0, format="%d"),
        "course_of_study": st.text_input("Course of Study", placeholder="Your intended program")
    }

with col2:
    st.markdown("## 💬 Chat Interface")
    
    if st.button("🎤 Record Voice Message"):
        recognizer = sr.Recognizer()
        audio_base64 = None  # Explicit reset at the start of recording
        try:
            with sr.Microphone() as source:
                st.info("Recording...")
                audio_data = recognizer.listen(source)
                st.info("Processing...")
                try:
                    message = recognizer.recognize_google(audio_data)
                    st.success(f"Recognized Message: {message}")
                    
                    try:
                        response = requests.post(
                            "http://localhost:8000/chat",
                            json={
                                "userId": user_id,
                                "message": message,
                                "student_details": student_details
                            }
                        ).json()
                        
                        if 'response' in response:
                            st.markdown("### 🤖 AI Response:")
                            st.markdown(
                                f"<div class='response-box'>{response['response']['response']}</div>",
                                unsafe_allow_html=True
                            )
                            
                            # Generate new audio
                            audio_base64 = text_to_speech(response['response']['response'])
                            
                            if audio_base64:
                                st.markdown(
                                    f'<audio controls><source src="data:audio/mp3;base64,{audio_base64}" type="audio/mp3"></audio>',
                                    unsafe_allow_html=True
                                )
                    except requests.RequestException as e:
                        st.error(f"Connection error: {str(e)}")

                except sr.UnknownValueError:
                    st.error("Could not understand the audio")
                except sr.RequestError:
                    st.error("Could not request results")
        except AttributeError:
            st.error("PyAudio is not installed")
    else:
        message = st.text_area("Your Message", placeholder="Type your message here...", height=150)
        audio_base64 = None  # Reset before sending a new message

    if st.button("📤 Send Message"):
        if user_id and message:
            with st.spinner('Processing...'):
                try:
                    response = requests.post(
                        "http://localhost:8000/chat",
                        json={
                            "userId": user_id,
                            "message": message,
                            "student_details": student_details
                        }
                    ).json()
                    
                    if 'response' in response:
                        st.markdown("### 🤖 AI Response:")
                        st.markdown(
                            f"<div class='response-box'>{response['response']['response']}</div>",
                            unsafe_allow_html=True
                        )
                        
                        # Generate new audio
                        audio_base64 = text_to_speech(response['response']['response'])
                        
                        if audio_base64:
                            st.markdown(
                                f'<audio controls><source src="data:audio/mp3;base64,{audio_base64}" type="audio/mp3"></audio>',
                                unsafe_allow_html=True
                            )
                except requests.RequestException as e:
                    st.error(f"Connection error: {str(e)}")
        else:
            st.warning("Please provide User ID and Message")

    col_reset, col_report = st.columns(2)

    with col_reset:
        if st.button("🔄 Reset"):
            if user_id:
                try:
                    response = requests.post(
                        "http://localhost:8000/reset",
                        json={"userId": user_id}
                    ).json()
                    if 'message' in response:
                        st.success(response['message'])
                except requests.RequestException as e:
                    st.error(f"Connection error: {str(e)}")
            else:
                st.warning("Please provide User ID")

    with col_report:
        if st.button("📊 Report"):
            if user_id:
                try:
                    report = requests.post(
                        "http://localhost:8000/user-report",
                        json={"userId": user_id}
                    ).json()
                    
                    if 'error' not in report:
                        st.markdown("### 📈 Analysis")
                        st.metric("Messages", report['conversation_length'])
                        st.write(report['sentiment_analysis'])
                        st.markdown("#### 📝 Summary")
                        st.info(report['user_summary'])
                except requests.RequestException as e:
                    st.error(f"Connection error: {str(e)}")
            else:
                st.warning("Please provide User ID")