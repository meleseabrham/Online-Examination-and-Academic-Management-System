-- Seed Data for Online Examination System

-- 1. Create Admins
-- Password is 'admin123' hashed (approx)
INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('System Admin', 'admin@example.com', '$2a$10$X7oB0.q4W5l5N8.XhG8Ohu6pYkC1.YJ9h2kP3Q0z7dGj1q6kP3Q0z', 'Admin');

-- 2. Create Teachers
INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('John Doe', 'john@example.com', '$2a$10$X7oB0.q4W5l5N8.XhG8Ohu6pYkC1.YJ9h2kP3Q0z7dGj1q6kP3Q0z', 'Teacher');

-- 3. Create Students
INSERT INTO Users (FullName, Email, Password, Role) 
VALUES ('Jane Smith', 'jane@example.com', '$2a$10$X7oB0.q4W5l5N8.XhG8Ohu6pYkC1.YJ9h2kP3Q0z7dGj1q6kP3Q0z', 'Student');

-- 4. Create Classes
INSERT INTO Classes (GradeName, Section) VALUES ('Grade 10', 'A');
INSERT INTO Classes (GradeName, Section) VALUES ('Grade 11', 'B');

-- 5. Create Courses
INSERT INTO Courses (CourseName, Description) VALUES ('Mathematics', 'Advanced Algebra and Calculus');
INSERT INTO Courses (CourseName, Description) VALUES ('Physics', 'Mechanics and Thermodynamics');

-- 6. Assignments
INSERT INTO TeacherAssignments (TeacherId, ClassId, CourseId) VALUES (2, 1, 1);
INSERT INTO StudentClasses (StudentId, ClassId) VALUES (3, 1);

-- 7. Announcements
INSERT INTO Announcements (Title, Content, TargetRole, CreatedBy) 
VALUES ('Welcome to the Exam System', 'Global system launch.', 'All', 1);
