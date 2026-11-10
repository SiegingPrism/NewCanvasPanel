# Privacy Policy for Slate — Smart Board & Interactive Whiteboard

**Last Updated:** November 10, 2026  
**Effective Date:** November 10, 2026  
**Application:** Slate: Smart Board & Interactive Whiteboard for Schools (`com.slate.whiteboard`)  
**Developer / Data Fiduciary:** SNANS TECH  
**Contact / Grievance Officer:** `privacy@snanstech.com`  

---

## 1. Introduction & Overview

Slate ("we", "our", or "the App") is an offline-first smart whiteboard and interactive teaching platform developed specifically for classrooms, teachers, students, and educational institutions. 

We believe that classroom technology must respect the privacy and safety of children above all else. Slate is designed from the ground up on the principle of **data minimization**:
- **Zero Third-Party Advertising:** Slate does not display ads, does not integrate advertising SDKs, and never sells or monetizes user data.
- **Zero Behavioral Tracking:** We do not track, profile, or monitor student behavior.
- **Local-First Processing:** Whiteboard drawings, math sketches, and notes are stored locally on your device by default. Cloud synchronization is entirely optional and restricted to registered teachers and institutions.

This Privacy Policy explains how information is handled in full compliance with:
1. **India’s Digital Personal Data Protection Act, 2023 (DPDP Act 2023)**;
2. **Google Play Families Policy & Designed for Families Standards**;
3. **Children’s Online Privacy Protection Rule (COPPA)** standards.

---

## 2. Compliance with India’s DPDP Act, 2023 (Children's Data Protection)

In compliance with **Section 9 of the Digital Personal Data Protection Act, 2023 (Processing of personal data of children)**:
1. **No Detrimental Processing:** Slate does not engage in any processing of personal data that is likely to cause any detrimental effect on the well-being of a child.
2. **No Tracking or Profiling:** Slate strictly prohibits and excludes any tracking, behavioral monitoring, or profiling of children.
3. **No Targeted Ads:** There is zero targeted or behavioral advertising directed at children or any other users.
4. **Institutional & Parental Authorization:** Slate is deployed primarily in educational institutions (schools, colleges, learning centers). Where students participate in interactive classroom sessions (such as polls or live quizzes), participation is mediated by the school and educator acting in *loco parentis* with institutional authorization.
5. **Data Principal Rights:** Under Chapter III of the DPDP Act (Sections 11–14), users, educators, and lawful guardians have the right to:
   - Access a summary of personal data processed;
   - Request correction, completion, or erasure of personal data;
   - Register a grievance with our Grievance Redressal Officer;
   - Nominate an individual to exercise rights in the event of incapacity.

---

## 3. Compliance with Google Play Families Policy

Slate strictly complies with Google Play's Families Policy:
- **Target Audience:** Everyone, including children (K-12 students) and educators.
- **Advertising Identifiers:** Slate **does not** collect, transmit, or access the Android Advertising ID (AAID) or persistent device identifiers for advertising or profiling.
- **Third-Party SDKs:** Slate does not bundle any third-party analytics, attribution, or advertising SDKs that harvest user data.
- **Transparent Permissions:** Permissions are requested only at the moment a user initiates a specific feature, with clear contextual prompts.

---

## 4. Hardware Permissions & Sensitive Data Use

Slate requests minimal Android hardware permissions, each strictly tied to explicit, user-initiated classroom activities:

### A. Camera (`android.permission.CAMERA`)
- **How It Is Used:**
  1. *Document & Diagram Insertion:* Teachers can snap a physical book page, diagram, or worksheet to display it directly on the canvas.
  2. *Optical Handwriting & Formula Capture:* Users can photograph handwritten math formulas or sketches to convert them into digital LaTeX or vector ink.
  3. *QR Code Scanning:* Scanning room codes to pair secondary teacher remotes or join an existing session.
- **What We Do NOT Do:**
  - **No Background Recording:** The camera is strictly inactive unless the on-screen camera viewfinder is actively open.
  - **No Facial Recognition or Biometrics:** We do not scan faces, identify people, extract biometric markers, or analyze emotional states.
  - **No Silent Streaming:** Raw video frames are never streamed to third parties or saved to external databases without explicit user action.

### B. Microphone (`android.permission.RECORD_AUDIO`)
- **How It Is Used:**
  1. *Real-Time Classroom Captions:* Provides live speech-to-text captions on the smartboard display for hearing-impaired students or multilingual classroom support.
  2. *Voice Controls:* Optional voice commands for teacher navigation (e.g., "next page", "clear board").
- **What We Do NOT Do:**
  - **No Persistent Audio Recording:** Raw audio is processed ephemerally in real time on the device (or via standard secure platform speech APIs). Raw audio files are **never saved to disk**, never stored on servers, and never archived.
  - **No Ambient Listening:** Slate never listens in the background. The microphone is active only while the live captions or voice input indicator is visibly displayed on the whiteboard.

### C. Storage & Files (`READ_EXTERNAL_STORAGE` / Media Permissions)
- **How It Is Used:**
  - Allows educators to save whiteboards (`.slate`, `.png`, `.pdf`) and import teaching resources (PDF worksheets, images, slides) chosen through the system file picker.

---

## 5. Classroom Interactive Features & Student Data

### A. Student Work Wall (Classroom Blackboard Showcase)
- Students can submit a photo of their notebook assignment to the teacher's whiteboard by scanning a session-specific QR code.
- **Privacy Protections:**
  - Submissions are linked solely to a transient 4-character classroom room code.
  - Images are uploaded to an access-controlled, time-limited storage bucket accessible only to that active classroom board.
  - Uploaded work photos are automatically cleared at the end of the lesson or when the School Fleet "End of Day" cleanup runs.
  - Images are never made publicly searchable or indexed by search engines.

### B. Live Polls, Quizzes, and Team Buzzers
- Students participate using their mobile phones or tablets via a temporary web link (`/poll`).
- **Privacy Protections:**
  - **No Student Accounts:** Students do not create accounts, enter passwords, or provide personal credentials.
  - **No PII Collected:** We do not collect student email addresses, phone numbers, home addresses, or school roll numbers.
  - **Ephemeral Participation:** Student nicknames chosen for the quiz are temporary and purged once the quiz ends.
  - Results are presented in aggregate to the teacher (e.g., "Option B: 75%") and are not used for permanent academic profiling.

### C. Artificial Intelligence & Educational Assistants (Gemini / AI Tools)
- Features such as AI Lesson Builder, Math Solver, and Handwriting Recognition utilize state-of-the-art language and vision models.
- **Privacy Protections:**
  - Requests are transmitted via encrypted HTTPS directly to secured endpoints.
  - Client APK builds contain zero hardcoded AI API keys.
  - Prompts are processed strictly to generate the requested pedagogical content (e.g., lesson plans, step-by-step math explanations).
  - No student personal data is used to train AI models.

---

## 6. Data Storage, Security & Retention

- **Offline-First:** All board contents exist locally on the smartboard device. If the board is disconnected from the internet, 100% of core whiteboard functionality continues to work.
- **Teacher Cloud Sync:** If an educator signs in via their verified school or personal account, boards are encrypted in transit (TLS 1.3) and stored securely in Supabase PostgreSQL with strict Row Level Security (RLS) policies. Only the authenticated educator can read or modify their boards.
- **School Fleet Auto-Wipe:** Schools can configure an automatic End-of-Day (EOD) cleanup policy that signs out the active teacher and wipes local temporary boards at closing time to protect confidentiality across shared classroom hardware.
- **Account & Data Deletion:** Educators can permanently delete their account and all synced cloud whiteboards at any time directly in the app under **Profile & Account → Delete Account & Cloud Data**. Deletion is instant, irreversible, and purges all associated records.

---

## 7. Third-Party Services

Slate limits third-party integrations exclusively to core infrastructure providers required for cloud synchronization:
- **Supabase (Cloud Database & Authentication):** Houses encrypted board data and teacher authentication under SOC2-compliant standards with strict Row-Level Security.
- **Google Generative AI (Gemini):** Used only when the educator activates an AI-assisted feature (e.g., formula resolution or lesson outlines).

Slate **does not** integrate third-party ad networks, tracking pixels, Facebook SDKs, or data brokers.

---

## 8. Children’s Privacy Commitment

Slate is committed to safeguarding children's privacy:
- We do not knowingly solicit or collect personally identifiable information from children under 18 years of age.
- If an educator or parent becomes aware that any personal information of a child has been unintentionally submitted without appropriate authorization, they may contact our Grievance Officer at `privacy@snanstech.com`, and we will immediately take steps to permanently delete such information from our records.

---

## 9. Contact & Grievance Redressal Officer

In accordance with the Digital Personal Data Protection Act, 2023, and Information Technology Rules, if you have any questions, concerns, or grievances regarding this Privacy Policy or our data handling practices, please contact our designated Grievance Officer:

**Grievance Officer:**  
Privacy & Compliance Team  
SNANS TECH  
**Email:** `privacy@snanstech.com`  
**Physical Address:** SNANS TECH Educational Software Division, India  
**Website:** `https://snanstech.com`  

*We will respond to and resolve all privacy inquiries and grievances within thirty (30) days of receipt.*

---

## 10. Changes to This Privacy Policy

We may periodically update this Privacy Policy to reflect improvements in our platform or changes in regulatory guidelines. The revised policy will be posted within the application and at this URL with an updated "Last Updated" date. Continued use of Slate following updates constitutes acceptance of the revised terms.
