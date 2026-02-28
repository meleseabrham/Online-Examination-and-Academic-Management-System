# Full School Academic & Examination Management System — Implementation Plan

## Current State Analysis
- **Database**: SQL Server with Users, StudentEnrollments, TeacherAssignments, AcademicYears, Semesters, Grades, Sections, Classes, Courses, Exams, SemesterResults, FinalYearResult
- **Missing**: Schools table, Assessment types, weighted grading, transfer system, PDF generation, multi-school architecture
- **Existing**: JWT auth with RBAC (Admin/Teacher/Student), ranking system with DENSE_RANK(), promotion logic, semester calculation

## Phase 1: Database Migration — Multi-School + Assessment Architecture
### New Tables:
1. **Schools** (Id, Name, Address, Code)
2. **Assessment** (Id, CourseId, SemesterId, GradeId, AcademicYearId, Type, TotalMarks, WeightPercentage)
3. **StudentAssessmentScore** (Id, StudentId, AssessmentId, MarksObtained, GradedBy, GradedAt)

### Altered Tables:
1. **Users** → Add SchoolId (nullable FK to Schools)
2. **StudentEnrollments** → Add SchoolId, TransferDate, TransferNotes
3. **TeacherAssignments** → Add SchoolId, Status (Active/Replaced/Transferred), ReplacedBy, ReplacedAt

## Phase 2: Backend — Transfer Controllers
1. **transferController.ts**: transferStudent, transferTeacher, getTransferHistory
2. Update academicController: school-aware enrollment, assessment-based semester calculation

## Phase 3: Backend — Assessment & Weighted Grading
1. **assessmentController.ts**: CRUD for assessments, score entry, weighted calculation
2. Update calculateSemesterResults to use weighted assessment scores

## Phase 4: Backend — PDF Transcript Generation
1. Install pdfkit
2. **transcriptController.ts**: generateTranscript (semester + full year)

## Phase 5: Frontend — Admin Transfer & Assessment Pages
1. TransferManagement.tsx
2. AssessmentManagement.tsx (Teacher)
3. TranscriptDownload (Student)

## Phase 6: Frontend — Polish & Integration
1. Update Sidebar links
2. Update App.tsx routes
3. Wire all API endpoints
