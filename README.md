LifeLine – Voice-Driven Emergency Triage Assistant

Project Description
LifeLine is a voice-enabled emergency triage web application designed to guide bystanders during critical medical situations before professional help arrives. In real emergencies, panic and confusion often prevent people from taking immediate action. LifeLine addresses this by providing structured, step-by-step first-aid guidance through both voice and text interaction. Users can describe the emergency by speaking or typing, and the system uses rule-based keyword detection and logical decision flow to classify the situation and activate the appropriate response module. The application includes four core modules: a CPR module for cardiac arrest cases that provides proper hand placement guidance, compression instructions, and an audio-synchronized counting timer; a choking module that guides users through back blows and abdominal thrusts and automatically escalates to CPR if the person becomes unconscious; a severe bleeding module that instructs users to apply direct pressure and control blood loss safely; and a recovery position module for unconscious but breathing individuals to maintain a clear airway. The system also asks short confirmation questions to improve accuracy before delivering instructions. LifeLine supports browser-based speech recognition for hands-free use and includes a text input fallback if the microphone is unavailable.

Tech Stack
Frontend: HTML5, CSS3, JavaScript

Speech Recognition: Web Speech API

Voice Output: SpeechSynthesis API

Deployment: Firebase Hosting

Version Control: Git + GitHub

 Features

1.  Voice-driven emergency description 

2.  Intelligent keyword-based emergency classification

3. CPR module with:

Step-by-step instructions

Voice guidance

Compression counter with sound

4. Choking emergency module

Conscious & unconscious branching logic

5.  Auto-escalation:

Choking → unconscious → CPR flow

6.  Responsive mobile-friendly UI

7.  Nearby hospital redirection (Google Maps link)

8.  Works over HTTPS for microphone access

 Installation & Setup

1. Clone Repository

git clone https://github.com/keerthana123426/LIFELINE
cd lifeline-ai

2️. Run Locally

Simply open:

index.html

OR use a local server:

npx serve .

 Deployment

This project is deployed using Firebase Hosting.

Deploy Command

firebase deploy

Live Link

https://lifeline-9f13d.web.app/

 Live link works
HTTPS enabled
Microphone supported

 Architecture Overview

Flow:

1. User activates emergency mode


2. Voice or text input captured


3. Keyword classifier analyzes transcript


4. Emergency type detected:

CPR

Choking

Recovery



5. Relevant emergency module activated


6. Voice + visual instructions provided


7. Escalation logic applied if condition worsens

 Project Structure

lifeline-ai/
│
├── index.html
├── style.css
├── script.js
├── manifest.json (optional PWA support)
├── firebase.json
├── .firebaserc
└── README.md

Screenshots
### Home Screen
<img width="1911" height="873" alt="home screen" src="https://github.com/user-attachments/assets/9d1d92b0-2bf3-4f23-b38e-221d6bf4ccf0" />

### CPR Module
<img width="1869" height="837" alt="CPR counter" src="https://github.com/user-attachments/assets/e515ec9f-7a87-47a1-b879-5794e0814080" />
### Nearby hospitals information Module
<img width="1617" height="817" alt="Nearby hospitals information" src="https://github.com/user-attachments/assets/59da0c55-aeab-48e9-9b77-6f25b6f1b5d1" />
##input screen
<img width="1889" height="865" alt="Input screen" src="https://github.com/user-attachments/assets/04198472-508a-44ec-a574-50472910f37c" />
##quick check
<img width="1911" height="867" alt="Quick check" src="https://github.com/user-attachments/assets/6174f7ee-210d-4532-96ab-24bb5a29745f" />

Demo Video Link: 
https://drive.google.com/file/d/1xHc2-f5nejDQ2fhdyFST-4gnHrhE9LvC/view?usp=drivesdk



Team Members


Keerthana John
Gayathri M H




