-- Database Schema for Online Examination System

-- 1. Users Table
CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100) NOT NULL,
    FirstName NVARCHAR(100) NULL,
    MiddleName NVARCHAR(100) NULL,
    LastName NVARCHAR(100) NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    Password NVARCHAR(MAX) NOT NULL,
    Role NVARCHAR(20) CHECK (Role IN ('Admin', 'Teacher', 'Student')) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 2. Classes Table (Grades 1-12)
CREATE TABLE Classes (
    ClassId INT PRIMARY KEY IDENTITY(1,1),
    GradeName NVARCHAR(50) NOT NULL, -- e.g., 'Grade 10'
    Section NVARCHAR(10) NOT NULL -- e.g., 'A', 'B'
);

-- 3. Courses Table
CREATE TABLE Courses (
    CourseId INT PRIMARY KEY IDENTITY(1,1),
    CourseName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX)
);

-- 4. User Enrollments / Assignments
CREATE TABLE StudentClasses (
    StudentClassId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT FOREIGN KEY REFERENCES Users(UserId),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId)
);

CREATE TABLE TeacherAssignments (
    AssignmentId INT PRIMARY KEY IDENTITY(1,1),
    TeacherId INT FOREIGN KEY REFERENCES Users(UserId),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId)
);

-- 5. Announcements
CREATE TABLE Announcements (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    TargetRole NVARCHAR(20), -- 'All', 'Student', 'Teacher'
    CreatedBy INT FOREIGN KEY REFERENCES Users(UserId),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 6. Exams
CREATE TABLE Exams (
    ExamId INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    ClassId INT FOREIGN KEY REFERENCES Classes(ClassId),
    CourseId INT FOREIGN KEY REFERENCES Courses(CourseId),
    TeacherId INT FOREIGN KEY REFERENCES Users(UserId),
    DurationMinutes INT NOT NULL,
    StartTime DATETIME,
    EndTime DATETIME,
    IsPublished BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 7. Questions
CREATE TABLE Questions (
    QuestionId INT PRIMARY KEY IDENTITY(1,1),
    ExamId INT FOREIGN KEY REFERENCES Exams(ExamId) ON DELETE CASCADE,
    Text NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(20) CHECK (Type IN ('MCQ', 'TF', 'Matching')) NOT NULL,
    Points INT DEFAULT 1
);

-- 8. Question Options (for MCQ and TF)
CREATE TABLE Options (
    OptionId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId) ON DELETE CASCADE,
    Text NVARCHAR(MAX) NOT NULL,
    IsCorrect BIT DEFAULT 0
);

-- 9. Matching Pairs (for Matching Type)
CREATE TABLE MatchingPairs (
    PairId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId) ON DELETE CASCADE,
    LeftText NVARCHAR(MAX) NOT NULL,
    RightText NVARCHAR(MAX) NOT NULL
);

-- 10. Student Exam Results
CREATE TABLE StudentExams (
    AttemptId INT PRIMARY KEY IDENTITY(1,1),
    StudentId INT FOREIGN KEY REFERENCES Users(UserId),
    ExamId INT FOREIGN KEY REFERENCES Exams(ExamId),
    StartTime DATETIME DEFAULT GETDATE(),
    EndTime DATETIME,
    Score DECIMAL(5,2),
    Status NVARCHAR(20) DEFAULT 'Started' -- 'Started', 'Submitted', 'Graded'
);

-- 11. Student Answers
CREATE TABLE StudentAnswers (
    AnswerId INT PRIMARY KEY IDENTITY(1,1),
    AttemptId INT FOREIGN KEY REFERENCES StudentExams(AttemptId) ON DELETE CASCADE,
    QuestionId INT FOREIGN KEY REFERENCES Questions(QuestionId),
    SelectedOptionId INT FOREIGN KEY REFERENCES Options(OptionId),
    MatchingAnswer NVARCHAR(MAX), -- For matching type
    IsCorrect BIT
);
