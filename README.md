<div align="center">
  <img src="frontend/public/vite.svg" alt="Logo" width="120" height="120">

  <h1 align="center">Academic & Exam Management System</h1>
  <p align="center">
    <strong>Academic & Exam Management System</strong>
    <br />
    <br />
    <a href="#-about-the-project">About</a>
    ·
    <a href="#-key-features">Features</a>
    ·
    <a href="#%EF%B8%8F-technology-stack">Tech Stack</a>
    ·
    <a href="#-installation--setup">Installation</a>
  </p>
</div>

<div align="center">
  
  [![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Backend-Node.js%20(Express)-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
  [![Microsoft SQL Server](https://img.shields.io/badge/Database-MSSQL-CC2927?style=for-the-badge&logo=microsoft-sql-server)](https://www.microsoft.com/sql-server)
  [![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## � About The Project

**NexExam** is a comprehensive, full-stack educational platform designed to bridge the gap between heavy administrative data management and high-stakes pedagogical real-time events. 

Built entirely with **TypeScript** for robust end-to-end type safety, this platform scales effortlessly from managing simple course resources to executing secure, live-proctored online examinations for thousands of students. It natively handles complex school architectures, supporting nested layers of Academic Years, Semesters, Grades, Sections, and distinct user roles with strict RBAC (Role-Based Access Control).

### 🔥 Unique Selling Propositions
* **Tab-Switch Proctoring Engine:** Tracks `visibilitychange` events natively. If a student attempts to open an AI tool or search for an answer during a live exam, the system temporarily locks their screen and flags the teacher.
* **Weighted Academic Processing:** Automates complex point scaling, semester rank calculations, and GPA generation entirely via complex SQL Server aggregation pipelines.
* **Premium Glassmorphic UI:** Features vibrant, animated, and responsive user interfaces crafted carefully with Tailwind CSS and Framer Motion.

---

## ✨ Key Features

### 🛠️ Administrator (System Architecture)
- **Role-Based Access Control (RBAC):** Manage the entire user lifecycle, defining granular permissions for Teachers, Students, and Directors to ensure data integrity and security.
- **System Personalization & Branding:** Configure institution-wide settings including school logo, contact information, and primary colors to tailor the platform's visual identity.
- **Infrastructure Health & Database Management:** Perform critical maintenance tasks such as direct MS SQL Server backups (Full, Differential, or Log) and database restores directly from the web interface.
- **Global Announcements:** Orchestrate system-wide communications to all users through a dedicated notification engine.

### 🏛️ Director (Academic Operations)
- **Academic Lifecycle Logistics:** Effortlessly manage mass enrollments, student class transfers, and automated end-of-year promotions across different academic years and semesters.
- **Executive Live Monitor:** Gain real-time observability into all active exam sessions across the institution, monitoring server load and proctoring interventions as they happen.
- **Institutional Analytics & Insights:** Instantly generate high-level performance percentiles, class rankings, and statistical trends with exportable PDF/Excel reporting suites.
- **Curriculum & Staff Oversight:** Monitor course modules, manage teacher-class assignments, and review institutional assessment results to maintain high academic standards.

### 👩‍🏫 Teacher (Instruction & Assessment)
- **Intelligent Exam Builder:** Construct dynamic quizzes, mid-terms, and finals featuring multiple choice, true/false, matching, and essay question types. Configure tight time limits and scheduling.
- **Proctoring Command Center:** Watch students as they take your test in real-time. Uncover suspicious behavior and unlock temporarily locked attempts remotely.
- **Guided Grading Engine:** Automatically assess objective questions while utilizing a dedicated manual-grading interface to evaluate essays and leave constructive, personalized feedback.
- **Resource Repository:** Build course modules and upload learning materials, assignments, and guidelines for targeted student sections.

### 👩‍🎓 Student (Exam Experience & Records)
- **Action-Oriented Dashboard:** Immediately see active ongoing exams, upcoming assignments, recently published grades, and personal academic rankings.
- **Distraction-Free Test Environment:** Secure taking interface featuring auto-saving intervals, dynamic countdown timers, and strict anti-cheat event listeners.
- **Offline Transcripts & Reviews:** Access deeply detailed question-by-question post-exam reviews, and generate fully formatted PDF transcripts of your entire semester's performance.

---

## 🛠️ Technology Stack & Languages

NexExam is built using modern, industry-standard web technologies to ensure speed, security, and maintainability.

### Frontend
- **Language:** TypeScript (`.tsx`)
- **Framework:** React 18 (Bootstrapped with Vite for extreme HMR speed)
- **State & Routing:** Hooks, Context API, React Router DOM v6
- **Styling:** Tailwind CSS v3 (Utility-first), Framer Motion (Delightful UI animations)
- **Icons & Tooling:** Lucide React, Zod (Schema validation), React Hook Form 
- **Document Generation:** html2canvas, jsPDF, XLSX

### Backend
- **Language:** Node.js powered by TypeScript for strict typing of API payloads.
- **Framework:** Express.js (v5)
- **Authentication:** JSON Web Tokens (JWT) working alongside Bcrypt for secure, stateless password encryption.
- **File System:** Multer (For assignment uploads, profile pictures, and PDF generations).
- **Task Scheduling:** `node-cron` for executing automated maintenance jobs.

### Database
- **Engine:** Microsoft SQL Server (MSSQL)
- **Driver:** `mssql` node library.
- **Why MSSQL?:** Chosen specifically for its supreme transaction integrity, stored procedure capabilities, and advanced relational aggregate functions required to calculate weighted student grades in milliseconds.

---

## 📊 Database Schema (Data Dictionary)

The system is powered by a robust Microsoft SQL Server database. Below is the detailed schema categorized by functional modules.

### 🏛️ 1. Core & Institutional Structure
<details>
<summary>View Core Tables Details</summary>

#### `Schools`
Central institutional metadata and branding.
- `Id`: (PK, int, Identity)
- `Name`: (nvarchar 200, NOT NULL)
- `Code`: (nvarchar 50, UNIQUE) - Internal institutional code.
- `Address`, `Phone`, `Email`: Contact details.
- `LogoPath`: (nvarchar MAX) - Server path for institution logo.
- `Status`: (Active/Inactive) - Controls institutional access.

#### `Users`
Unified account storage for all roles with strict RBAC categorization.
- `UserId`: (PK, int, Identity)
- `FullName`, `FirstName`, `MiddleName`, `LastName`: Comprehensive naming data.
- `Email`: (nvarchar 100, UNIQUE) - Login credential.
- `Password`: (nvarchar MAX) - BCrypt hashed credentials.
- `Role`: (Student, Teacher, Admin, Director) - Controls interface access.
- `RegistrationNumber`: (nvarchar 50, UNIQUE) - Institutional ID.
- `SchoolId`: (FK -> Schools.Id) - Multi-tenant linkage.

#### `AcademicYears` & `Semesters`
Time-based organizational units for historical tracking.
- `AcademicYears`: `Id` (PK), `Year` (e.g., 2024), `IsActive` (bit)
- `Semesters`: `Id` (PK), `SemesterName` (e.g., Semester I), `AcademicYearId` (FK)

</details>

### 🎓 2. Academic Logistics & Enrollment
<details>
<summary>View Academic Tables Details</summary>

#### `Grades` & `Sections`
Hierarchical student grouping.
- `Grades`: `Id` (PK), `GradeNumber` (int)
- `Sections`: `Id` (PK), `GradeId` (FK), `Name` (e.g., Section A), `SchoolId` (FK)

#### `StudentEnrollments`
Lifecycle tracking of students across years.
- `Id`: (PK)
- `StudentId`: (FK -> Users.UserId)
- `GradeId`, `SectionId`, `AcademicYearId`: (FKs) - Defines where the student sits this year.
- `Status`: (Active, Transferred, Promoted)

#### `Courses` & `GradeCourses`
Curriculum definitions.
- `Courses`: `CourseId` (PK), `CourseName`, `CourseCode`
- `GradeCourses`: Junction table mapping specific courses to grades per semester.

</details>

### 📝 3. Examination & Assessment Engine
<details>
<summary>View Assessment Tables Details</summary>

#### `Assessments`
Grading containers that define weightage in the final GPA.
- `Id`: (PK)
- `CourseId`, `GradeId`, `SemesterId`: (FKs)
- `Type`: (Participation, Assignment, Mid, Final, Quiz)
- `WeightPercentage`: (decimal) - Critical for weighted grade calculation.

#### `Exams`
Specific testing instances with proctoring controls.
- `ExamId`: (PK)
- `Title`, `ExamType`, `DurationMinutes`
- `StartTime`, `EndTime`: Precise scheduling windows.
- `IsPublished`: (bit) - Controls visibility to students.
- `IsMakeup`: (bit) - Flags remedial exams.
- `AssessmentId`: (FK -> Assessments.Id) - Ties exam to a grading category.

#### `Questions` & `Options`
Atomic test items.
- `Questions`: `QuestionId` (PK), `ExamId` (FK), `Text` (MAX), `Type` (MCQ, TF, Matching, Essay), `Points`
- `Options`: `OptionId` (PK), `QuestionId` (FK), `Text`, `IsCorrect` (bit)
- `MatchingPairs`: `PairId`, `QuestionId`, `LeftText`, `RightText`.

</details>

### 📊 4. Results & Proctored Attempts
<details>
<summary>View Results Tables Details</summary>

#### `StudentExams` (Attempts)
Live exam session tracking and anti-cheat logging.
- `AttemptId`: (PK)
- `StudentId`, `ExamId`: (FKs)
- `Score`: (decimal) - Auto-calculated total.
- `TabSwitchCount`: (int) - Tracks how many times the user left the browser tab.
- `Status`: (Started, Completed, Locked) - Managed by real-time proctoring.

#### `StudentAnswers`
Granular response storage for auditing.
- `AttemptId`, `QuestionId`: (FKs)
- `SelectedOptionId`: (FK -> Options.OptionId)
- `AnswerText`: (nvarchar MAX) - Student's written content for essays.
- `Score`: (decimal) - Points awarded for this specific answer.

#### `SemesterResults` & `FinalYearResult`
High-performance aggregated caches for transcripts.
- `Average`: (decimal) - Weighted GPA calculation.
- `ClassRank`, `GradeRank`, `SchoolRank`: (int) - Competitive positioning metrics.

</details>

### 🛠️ 5. System & Administrative
<details>
<summary>View System Tables Details</summary>

#### `Announcements`
Institutional communication logs.
- `AnnouncementId`: (PK)
- `Title`, `Content`, `TargetRole`
- `CreatedBy`: (FK -> Users.UserId)

#### `AuditLog`
Security and activity tracking.
- `id`: (PK)
- `user_id`: (FK -> Users.UserId)
- `action`, `entity`, `timestamp`, `ip_address`.

#### `TransferHistory`
Tracking student/teacher movement between schools.
- `FromSchoolId`, `ToSchoolId`: (FKs)
- `Reason`, `TransferDate`.

#### `SystemSettings` & `BackupLogs`
- `SystemSettings`: Global config (Key/Value).
- `BackupLogs`: Records of manual/automated database backups.

</details>

---

## 🔗 Relationship Architecture

The database follows a **Multi-tenant Architecture** where the `Schools` table acts as the root for all institutional data.

1.  **User Mapping:** Users are linked to Schools via `SchoolId`. Their specific roles determine their interactions with the academic and exam modules.
2.  **Academic Hierarchy:** `AcademicYears` -> `Semesters` -> `Grades` -> `Sections`. This chain ensures that student enrollments (`StudentEnrollments`) and teacher assignments (`TeacherAssignments`) are time-bound and logically isolated.
3.  **Assessment Flow:** `Courses` are assigned to grades via `GradeCourses`. `Assessments` define the grading rules for those courses, which are then implemented by `Exams`.
4.  **Result Pipeline:** `StudentExams` capture live data, which is persisted into `StudentAnswers`. Background processes aggregate these into `SemesterResults` and eventually `FinalYearResult` for permanent record keeping.

---

## 📐 Entity Relationship Diagram

The diagram below illustrates the core relational pathways from institutional setup to student performance output.

```mermaid
erDiagram
    SCHOOLS ||--o{ USERS : "manages"
    SCHOOLS ||--o{ SECTIONS : "contains"
    
    ACADEMIC_YEARS ||--o{ SEMESTERS : "divided_into"
    ACADEMIC_YEARS ||--o{ SECTIONS : "active_during"
    
    GRADES ||--o{ SECTIONS : "subdivided_into"
    GRADES ||--o{ GRADE_COURSES : "takes"
    
    COURSES ||--o{ GRADE_COURSES : "included_in"
    COURSES ||--o{ EXAMS : "tested_via"
    
    USERS ||--o{ STUDENT_ENROLLMENTS : "is_enrolled_as"
    USERS ||--o{ TEACHER_ASSIGNMENTS : "is_assigned_to"
    
    SECTIONS ||--o{ STUDENT_ENROLLMENTS : "groups"
    
    ASSESSMENTS ||--o{ EXAMS : "defines_weight_for"
    EXAMS ||--o{ QUESTIONS : "has_questions"
    EXAMS ||--o{ STUDENT_EXAMS : "taken_by"
    
    QUESTIONS ||--o{ OPTIONS : "provides_choices"
    STUDENT_EXAMS ||--o{ STUDENT_ANSWERS : "captures"
    
    USERS ||--o{ SEMESTER_RESULTS : "achieves_average"
    USERS ||--o{ FINAL_YEAR_RESULT : "receives_final_rank"
```

---

## 🚥 Installation & Setup

Want to run NexExam locally? Follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Express edition is perfectly fine)
- [Git](https://git-scm.com/)

### 1. Database Configuration
Ensure MS SQL Server is running and accessible. Create a blank database:
```sql
CREATE DATABASE OnlineExamDB;
```
*(The backend is built with initialization scripts that will automatically seed your tables upon the first connection.)*

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/Online-Examination-and-Academic-Management-System.git
cd Online-Examination-and-Academic-Management-System
```

### 3. Backend Setup
```bash
cd backend

# Install all NodeJS dependencies
npm install

# Create environment configuration
touch .env
```
Populate your `/backend/.env` file:
```env
PORT=5000
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_SERVER=localhost
DB_NAME=OnlineExamDB
JWT_SECRET=super_secret_cryptographic_key
```
Start the local server:
```bash
npm run dev
```

### 4. Frontend Setup
Open a completely separate terminal window and navigate to the frontend directory:
```bash
cd frontend

# Install all NodeJS dependencies
npm install

# Start the Vite development server
npm run dev
```

The application client should now be locally hosted at `http://localhost:5173`. 
*(Note: Be sure your database is running before attempting to login!)*

---

## 📸 Platform Previews

| Director Analytics Dashboard | Live Teacher Proctoring |
| :---: | :---: |
| ![Dashboard](assets/director_dashboard.png) | ![Live Proctoring](assets/live_proctoring.png) |

| Secure Student Exam Room | PDF Transcript Generation |
| :---: | :---: |
| ![Exam Room](assets/student_exam.png) | ![PDF Transcript](assets/transcript.png) |

---

## 🤝 Contributing

We welcome contributions! If you have an idea to improve the system or fix a bug:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingImplementation`)
3. Commit your Changes (`git commit -m 'Add an amazing new feature'`)
4. Push to the Branch (`git push origin feature/AmazingImplementation`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Developed with ❤️ for educational institutions worldwide.*
