-- Migration: Add missing columns to Exams and Users tables

-- Add ExamType column to Exams (safe: only if not exists)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'ExamType'
)
BEGIN
    ALTER TABLE Exams ADD ExamType NVARCHAR(50) DEFAULT 'Quiz';
    PRINT 'Added ExamType column to Exams';
END

-- Add TotalMarks column to Exams (safe: only if not exists)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'TotalMarks'
)
BEGIN
    ALTER TABLE Exams ADD TotalMarks INT NULL;
    PRINT 'Added TotalMarks column to Exams';
END

-- Make DurationMinutes nullable (was NOT NULL)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Exams' AND COLUMN_NAME = 'DurationMinutes'
)
BEGIN
    ALTER TABLE Exams ALTER COLUMN DurationMinutes INT NULL;
    PRINT 'Made DurationMinutes nullable';
END

-- Add Status column to Users (safe: only if not exists)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Status'
)
BEGIN
    ALTER TABLE Users ADD Status NVARCHAR(20) DEFAULT 'Active';
    PRINT 'Added Status column to Users';
END

-- Add Deadline column to Announcements (safe: only if not exists)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Announcements' AND COLUMN_NAME = 'Deadline'
)
BEGIN
    ALTER TABLE Announcements ADD Deadline DATETIME NULL;
    PRINT 'Added Deadline column to Announcements';
END
