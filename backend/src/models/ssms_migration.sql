USE master;
GO

-- 1. Create Database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'OnlineExamDB')
BEGIN
    CREATE DATABASE OnlineExamDB;
END
GO

USE OnlineExamDB;
GO

-- 2. Drop existing tables if they exist (to allow re-running script)
IF OBJECT_ID('AssignmentSubmissions', 'U') IS NOT NULL DROP TABLE AssignmentSubmissions;
IF OBJECT_ID('Assignments', 'U') IS NOT NULL DROP TABLE Assignments;
IF OBJECT_ID('StudentAnswers', 'U') IS NOT NULL DROP TABLE StudentAnswers;
IF OBJECT_ID('StudentExams', 'U') IS NOT NULL DROP TABLE StudentExams;
IF OBJECT_ID('MatchingPairs', 'U') IS NOT NULL DROP TABLE MatchingPairs;
IF OBJECT_ID('Options', 'U') IS NOT NULL DROP TABLE Options;
IF OBJECT_ID('Questions', 'U') IS NOT NULL DROP TABLE Questions;
IF OBJECT_ID('Exams', 'U') IS NOT NULL DROP TABLE Exams;
IF OBJECT_ID('Announcements', 'U') IS NOT NULL DROP TABLE Announcements;
IF OBJECT_ID('TeacherAssignments', 'U') IS NOT NULL DROP TABLE TeacherAssignments;
IF OBJECT_ID('StudentClasses', 'U') IS NOT NULL DROP TABLE StudentClasses;
IF OBJECT_ID('Courses', 'U') IS NOT NULL DROP TABLE Courses;
IF OBJECT_ID('Classes', 'U') IS NOT NULL DROP TABLE Classes;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- 3. Create Tables

-- Users Table
CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    Role NVARCHAR(20) CHECK (Role IN ('Admin', 'Teacher', 'Student')) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Classes Table (Grades 1-12)
CREATE TABLE Classes (
    ClassId INT PRIMARY KEY IDENTITY(1,1),
    GradeName NVARCHAR(50) NOT NULL,
    Section NVARCHAR(10) NOT NULL
);

-- Courses Table
CREATE TABLE Courses (
    CourseId INT PRIMARY KEY IDENTITY(1,1),
    CourseName NVARCHAR(100) NOT NULL,
    CourseCode NVARCHAR(20),
    Description NVARCHAR(MAX)
);

-- Student Classes Enrollment
CREATE TABLE StudentClasses (
    StudentClassId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT FOREIGN KEY REFERENCES Users(UserId),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId)
);

-- Teacher Assignments
CREATE TABLE TeacherAssignments (
    AssignmentId INT PRIMARY KEY IDENTITY(1,1),
    TeacherId INT FOREIGN KEY REFERENCES Users(UserId),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId)
);

-- Announcements
CREATE TABLE Announcements (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    TargetRole NVARCHAR(20), -- 'All', 'Student', 'Teacher'
    Deadline DATETIME,
    CreatedBy INT FOREIGN KEY REFERENCES Users(UserId),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Exams
CREATE TABLE Exams (
    ExamId INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    ExamType NVARCHAR(20) CHECK (ExamType IN ('Quiz', 'Midterm', 'Final')) NOT NULL,
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId),
    TeacherId INT FOREIGN KEY REFERENCES Users(UserId),
    DurationMinutes INT NOT NULL,
    StartTime DATETIME,
    EndTime DATETIME,
    IsPublished BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Assignments
CREATE TABLE Assignments (
    AssignmentId INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId),
    TeacherId INT FOREIGN KEY REFERENCES Users(UserId),
    FilePath NVARCHAR(MAX), -- For uploaded question file
    Deadline DATETIME,
    Points INT DEFAULT 100,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Assignment Submissions
CREATE TABLE AssignmentSubmissions (
    SubmissionId INT PRIMARY KEY IDENTITY(1,1),
    AssignmentId INT FOREIGN KEY REFERENCES Assignments(AssignmentId),
    StudentId INT FOREIGN KEY REFERENCES Users(UserId),
    SubmissionFilePath NVARCHAR(MAX),
    SubmissionDate DATETIME DEFAULT GETDATE(),
    Score DECIMAL(5,2),
    Feedback NVARCHAR(MAX),
    Status NVARCHAR(20) DEFAULT 'Submitted' -- 'Submitted', 'Graded'
);

-- Questions
CREATE TABLE Questions (
    QuestionId INT PRIMARY KEY IDENTITY(1,1),
    ExamId INT FOREIGN KEY REFERENCES Exams(ExamId) ON DELETE CASCADE,
    Text NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(20) CHECK (Type IN ('MCQ', 'TF', 'Matching')) NOT NULL,
    Points INT DEFAULT 1
);

-- Question Options (MCQ/TF)
CREATE TABLE Options (
    OptionId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId) ON DELETE CASCADE,
    Text NVARCHAR(MAX) NOT NULL,
    IsCorrect BIT DEFAULT 0
);

-- Matching Pairs
CREATE TABLE MatchingPairs (
    PairId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId) ON DELETE CASCADE,
    LeftText NVARCHAR(MAX) NOT NULL,
    RightText NVARCHAR(MAX) NOT NULL
);

-- Student Results
CREATE TABLE StudentExams (
    AttemptId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT FOREIGN KEY REFERENCES Users(UserId),
    ExamId INT FOREIGN KEY REFERENCES Exams(ExamId),
    StartTime DATETIME DEFAULT GETDATE(),
    EndTime DATETIME,
    Score DECIMAL(5,2),
    Status NVARCHAR(20) DEFAULT 'Started'
);

-- Student Answers
CREATE TABLE StudentAnswers (
    AnswerId INT PRIMARY KEY IDENTITY(1,1),
    AttemptId INT FOREIGN KEY REFERENCES StudentExams(AttemptId) ON DELETE CASCADE,
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId),
    SelectedOptionId INT FOREIGN KEY REFERENCES Options(OptionId),
    MatchingAnswer NVARCHAR(MAX),
    IsCorrect BIT
);
GO

-- 4. Seed Initial Data
INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('System Admin', 'admin@example.com', '$2b$10$vswF9IjHcoiSOQZ5/kR2AugszjI7wRshmQ42X4ZNFr5RchbhRmIci', 'Admin');

INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('John Doe', 'john@example.com', '$2b$10$vswF9IjHcoiSOQZ5/kR2AugszjI7wRshmQ42X4ZNFr5RchbhRmIci', 'Teacher');

INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('Jane Smith', 'jane@example.com', '$2b$10$vswF9IjHcoiSOQZ5/kR2AugszjI7wRshmQ42X4ZNFr5RchbhRmIci', 'Student');

INSERT INTO Classes (GradeName, Section) VALUES ('Grade 10', 'A'), ('Grade 11', 'B'), ('Grade 12', 'C');
INSERT INTO Courses (CourseName, CourseCode, Description) VALUES 
('Mathematics', 'MATH-101', 'High School Math'), 
('Physics', 'PHYS-201', 'Quantum Mechanics Basics'), 
('English', 'ENGL-105', 'Literature and Grammar');

INSERT INTO StudentClasses (StudentId, ClassId) VALUES (3, 1);
INSERT INTO TeacherAssignments (TeacherId, ClassId, CourseId) VALUES (2, 1, 1);

PRINT 'Database Migration and Seeding Completed Successfully!';
GO
