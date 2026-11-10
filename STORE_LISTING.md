# Google Play Store Listing & Release Preparation Guide

**Application:** Slate: Smart Board & Interactive Whiteboard  
**Package Name:** `com.slate.whiteboard`  
**Developer:** SNANS TECH  
**Category:** Education  
**Content Rating:** Everyone (Google Play Families Policy Compliant)  

---

## 1. Store Listing Metadata

### App Title (Limit: 30 characters)
```text
Slate: Smart Board Whiteboard
```
*(Character count: 29 / 30)*

---

### Short Description (Limit: 80 characters)
```text
Interactive whiteboard for classrooms: offline-first, smart tools, zero ads.
```
*(Character count: 77 / 80)*

---

### Full Description (Limit: 4,000 characters)

```text
Transform your classroom into an engaging, interactive learning environment with Slate — the smart digital whiteboard purpose-built for schools, educators, and interactive flat panels (IFPs).

Designed from the ground up for teaching, Slate combines fluid, lag-free inking with dedicated STEM tools, Indian curriculum integrations, and real-time student engagement features. Slate works completely offline, ensuring your lesson never stops even without internet access.

★ ZERO ADS & STUDENT PRIVACY FIRST
• 100% Ad-Free: Zero advertisements, zero third-party tracking, and zero commercial profiling.
• India DPDP Act 2023 Compliant: Fully adheres to Section 9 for children's data protection.
• Ephemeral Participation: Students join quizzes, polls, and blackboard showcases without creating accounts or sharing personal data.

★ NATURAL, LAG-FREE TEACHING CANVAS
• Dual Teacher & Student Toolbars: Ergonomically positioned for simultaneous two-person collaboration on 55", 65", 75", and 86" interactive panels.
• Pressure-Sensitive Handwriting: Ultra-smooth vector ink with palm rejection, highlighter, smart shapes, and handwriting beautification.
• Document & Slide Import: Seamlessly import PDF worksheets, textbook chapters, and images directly onto the canvas.

★ COMPREHENSIVE MATHS & STEM SUITE
• Virtual Classroom Instruments: Interactive ruler, protractor, compass, set-square, and customizable grid paper (Cartesian, isometric, millimeter).
• Equation Solver & LaTeX Math: Write math expressions naturally; Slate converts them into clean digital formulas and provides step-by-step visual working.
• Chemistry & Science: Complete interactive 118-element Periodic Table, 3D geometric shapes, and physics circuit exploration.

★ REAL-TIME CLASSROOM ENGAGEMENT
• Live QR Quizzes & Polls: Present questions on the smartboard; students answer instantly from their phones or tablets via a transient QR code.
• Team Buzzers: Gamified fastest-finger team quizzes with instant team point tracking and victory celebrations.
• Student Work Wall: Allow students to snap photos of their notebook assignments and project them directly onto the board for peer review.
• Name Picker & Teams: Spin the wheel to pick random students or automatically generate balanced cooperative learning teams.
• Sound & Signal Meters: Visual classroom noise monitors, traffic lights, and countdown timers to maintain focused learning rhythms.

★ BUILT FOR SCHOOLS & TEACHERS
• Offline-First Reliability: Draw, teach, and export whiteboards without needing Wi-Fi or mobile data.
• Secure Cloud Sync: Sign in securely with Google or email to automatically sync lesson plans and notes across your tablet, PC, and smartboard.
• Multi-Room Broadcast: Broadcast lessons live from one master board to other classroom displays across the campus.
• School Fleet Management: Centralized administrative controls with automated End-of-Day (EOD) cleanup to protect teacher privacy on shared classroom displays.

Empower your classroom with the smart whiteboard made for educators. Download Slate today!
```

---

## 2. Store Asset Specifications

| Asset | Format | Dimensions | Status / Location |
| :--- | :--- | :--- | :--- |
| **App Icon** | PNG (32-bit color, no alpha/transparent background recommended for Play Store) | 512 × 512 px | [`slate-web/public/app-icon.png`](file:///Users/ishanibassin/AndroidStudioProjects/canvas%20copy/slate-web/public/app-icon.png) |
| **Feature Graphic** | PNG / JPEG (24-bit, no alpha) | 1024 × 500 px | [`play_store_assets/feature_graphic.png`](file:///Users/ishanibassin/AndroidStudioProjects/canvas%20copy/play_store_assets/feature_graphic.png) |
| **Tablet Screenshots (10-inch)** | PNG / JPEG (16:10 or 16:9 ratio, min 1080px) | 2560 × 1600 px | [`play_store_assets/screenshots/`](file:///Users/ishanibassin/AndroidStudioProjects/canvas%20copy/play_store_assets/screenshots/) |

### Screenshots Included in Release Package:
1. `01_home_dashboard.png`: Dashboard showing recent lessons, quick actions, lesson templates.
2. `02_smartboard_canvas.png`: 55" smartboard interface with dual toolbars and interactive physics notes.
3. `03_classroom_tools.png`: Classroom engagement tools (Live Quiz, Polls, Team Buzzers, Work Wall, Signals).
4. `04_stem_math_instruments.png`: STEM toolkit (Grapher, Protractor, Geometry Kit, Periodic Table).
5. `05_privacy_security.png`: Privacy Policy dialog demonstrating DPDP Act 2023 & Google Play Families compliance.

---

## 3. Privacy Policy URL for Play Console
- **Public URL:** `https://<your-domain>/privacy.html` (or link to repository raw/pages)
- **Local / Bundled:** [`PRIVACY_POLICY.md`](file:///Users/ishanibassin/AndroidStudioProjects/canvas%20copy/PRIVACY_POLICY.md) & [`slate-web/public/privacy.html`](file:///Users/ishanibassin/AndroidStudioProjects/canvas%20copy/slate-web/public/privacy.html)

---

## 4. Google Play Console Form Declarations

### A. Target Audience & Content
- **Target Age Groups:** Ages 6–8, 9–12, 13–15, 16–17, and 18+ (All ages / K-12).
- **Appeal to Children:** Yes (Classroom educational whiteboard).
- **Google Play Families Policy:** Compliant. Zero ads, no sensitive PII tracking.

### B. Data Safety Form Responses
- **Data Collected:**
  - **Account Info (Optional):** Email address and Name collected **only** if a teacher chooses to create an account for cloud backup. (Not collected from students).
  - **User Content (Optional):** Whiteboard drawings/notes saved by registered teachers.
  - **Data Shared with 3rd Parties:** **NO.** No data is shared with third parties or data brokers.
  - **Data Encryption in Transit:** Yes (TLS 1.3 / HTTPS).
  - **Account Deletion:** Users can delete their account and cloud data directly inside the app.

### C. App Permissions Declaration
- `android.permission.CAMERA`: Document scanning, formula OCR, QR pairing. User-initiated only; no background recording or biometric data.
- `android.permission.RECORD_AUDIO`: Live classroom speech-to-text captions. Real-time ephemeral processing only; no audio saved or stored.
- `android.permission.READ_EXTERNAL_STORAGE` / `READ_MEDIA_*`: Importing worksheets and local board files.

---

## 5. Release Build & Signing Instructions

### Step 1: Generate Release Keystore (One-time setup)
Run the following command in terminal to create your official release keystore:
```bash
keytool -genkeypair -v \
  -keystore slate-release.jks \
  -alias slate \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```
*(Store `slate-release.jks` in a secure location outside public version control).*

### Step 2: Configure Gradle Release Signing
Add your keystore credentials to your local `~/.gradle/gradle.properties` (or project root `slate-web/android/gradle.properties`):
```properties
RELEASE_STORE_FILE=/path/to/slate-release.jks
RELEASE_STORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=slate
RELEASE_KEY_PASSWORD=your_key_password
```

### Step 3: Build the Android App Bundle (AAB) for Google Play
Google Play requires an `.aab` (Android App Bundle) for new store submissions:
```bash
# 1. Build optimized web assets and sync to Capacitor
npm --prefix slate-web run build:android

# 2. Build signed release bundle
cd slate-web/android
./gradlew bundleRelease
```
The output file will be generated at:
`slate-web/android/app/build/outputs/bundle/release/app-release.aab`

### Step 4: Build Release APK (For Direct Distribution / Sideloading)
```bash
cd slate-web/android
./gradlew assembleRelease
```
The output file will be generated at:
`slate-web/android/app/build/outputs/apk/release/app-release.apk`
