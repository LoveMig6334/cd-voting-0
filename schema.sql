-- =====================================================
-- CD Voting System - MySQL Database Schema
-- Version: 2.0 (Updated for Multi-Position Elections)
-- =====================================================

-- 1. ตารางนักเรียน (Authentication & Student Data)
CREATE TABLE students (
    id VARCHAR(10) PRIMARY KEY,              -- รหัสนักเรียน (Student ID, e.g., "6367")
    national_id VARCHAR(13) NOT NULL,        -- เลขประจำตัวประชาชน (Plain text)
    prefix VARCHAR(20),                       -- คำนำหน้าชื่อ (นาย, นางสาว, เด็กชาย, เด็กหญิง)
    name VARCHAR(100) NOT NULL,              -- ชื่อ
    surname VARCHAR(100) NOT NULL,           -- นามสกุล
    student_no INT,                           -- เลขที่ในห้อง
    class_room VARCHAR(20) NOT NULL,         -- ห้องเรียน (e.g., "3/1", "3/2")
    role ENUM('STUDENT', 'ADMIN') DEFAULT 'STUDENT',
    
    -- Voting Rights
    voting_approved BOOLEAN DEFAULT FALSE,   -- ได้รับอนุมัติสิทธิ์โหวตหรือไม่
    voting_approved_at DATETIME,             -- วันที่อนุมัติ
    voting_approved_by VARCHAR(100),         -- ผู้อนุมัติ
    
    -- Metadata
    last_active DATETIME,                    -- ใช้งานล่าสุด
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_national_id (national_id),
    INDEX idx_class_room (class_room)
);

-- 2. ตารางการเลือกตั้ง (Election Config)
CREATE TABLE elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,             -- หัวข้อการเลือกตั้ง
    description TEXT,                         -- รายละเอียด
    type VARCHAR(50),                         -- ประเภท (e.g., 'student_council', 'class_leader')
    start_date DATETIME NOT NULL,            -- วันเริ่มต้น
    end_date DATETIME NOT NULL,              -- วันสิ้นสุด
    status ENUM('PENDING', 'OPEN', 'CLOSED') DEFAULT 'PENDING',
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,       -- เก็บถาวรการเลือกตั้ง (ไม่แสดงใน dashboard)
    total_votes INT DEFAULT 0,               -- จำนวนผู้มาใช้สิทธิ์ทั้งหมด

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_is_archived (is_archived)
);

-- 3. ตารางตำแหน่ง (Positions for Multi-Position Elections)
CREATE TABLE positions (
    id VARCHAR(50) PRIMARY KEY,              -- รหัสตำแหน่ง (e.g., "president", "secretary")
    election_id INT NOT NULL,                -- สังกัดการเลือกตั้งไหน
    title VARCHAR(100) NOT NULL,             -- ชื่อตำแหน่ง (e.g., "ประธาน", "เลขาฯ")
    icon VARCHAR(50),                         -- ไอคอน (Material Symbol name)
    enabled BOOLEAN DEFAULT TRUE,            -- เปิดใช้งานหรือไม่
    is_custom BOOLEAN DEFAULT FALSE,         -- เป็นตำแหน่งที่สร้างเองหรือไม่
    sort_order INT DEFAULT 0,                -- ลำดับการแสดงผล
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_id (election_id)
);

-- 4. ตารางผู้สมัคร (Candidates)
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,                -- สังกัดการเลือกตั้งไหน
    position_id VARCHAR(50) NOT NULL,        -- ลงสมัครตำแหน่งไหน
    rank INT NOT NULL,                        -- หมายเลขผู้สมัคร (เบอร์)
    name VARCHAR(255) NOT NULL,              -- ชื่อผู้สมัคร
    slogan VARCHAR(255),                      -- คำขวัญ
    image_url VARCHAR(500),                   -- รูปภาพ
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    INDEX idx_election_position (election_id, position_id)
);

-- 5. ตารางบันทึกการใช้สิทธิ์ (Voter Turnout / History)
-- ตารางนี้รู้ว่า "ใคร" มาใช้สิทธิ์ "การเลือกตั้งไหน" แต่ไม่รู้ว่า "กาเบอร์อะไร"
CREATE TABLE vote_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    election_id INT NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),                   -- Optional: เพื่อตรวจสอบ Audit Log
    user_agent TEXT,                          -- Optional: Browser info

    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (election_id) REFERENCES elections(id),

    -- Constraint สำคัญ: นักเรียน 1 คน โหวตได้ 1 ครั้งต่อ 1 การเลือกตั้ง
    UNIQUE KEY unique_voter (student_id, election_id)
);

-- 6. ตารางผลคะแนน (Ballots)
-- ตารางนี้รู้ว่า "เบอร์ไหน" ได้คะแนน แต่ไม่รู้ว่า "ใครกา" (Anonymous)
CREATE TABLE votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    position_id VARCHAR(50) NOT NULL,        -- ตำแหน่งที่โหวต
    candidate_id INT,                         -- NULL ถ้าเลือก No Vote (งดออกเสียง)
    is_no_vote BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (position_id) REFERENCES positions(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    
    INDEX idx_election_position_candidate (election_id, position_id, candidate_id)
);

-- 7. ตาราง Sessions (สำหรับ Server-Side Authentication)
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,             -- Random Session Token
    student_id VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_expires_at (expires_at)
);

-- 8. ตาราง Admins (Admin Authentication)
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    display_name VARCHAR(100),
    access_level TINYINT DEFAULT 1,       -- 0=Root, 1=System, 2=Teacher, 3=Observer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ตาราง Admin Sessions
CREATE TABLE admin_sessions (
    id VARCHAR(255) PRIMARY KEY,
    admin_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_expires_at (expires_at)
);

-- 10. ตารางบันทึกกิจกรรม (Activity Log)
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('vote_cast', 'system_check', 'admin_action', 'election_change') NOT NULL,
    title VARCHAR(255) NOT NULL,           -- หัวข้อกิจกรรม
    description TEXT NOT NULL,              -- รายละเอียด
    metadata JSON,                          -- ข้อมูลเพิ่มเติม (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);

-- 11. ตารางการตั้งค่าแสดงผลสาธารณะ (Public Display Settings)
CREATE TABLE public_display_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,           -- เผยแพร่ผลหรือยัง
    published_at DATETIME,                         -- วันเวลาที่เผยแพร่
    global_show_raw_score BOOLEAN DEFAULT TRUE,   -- แสดงคะแนนดิบทุกตำแหน่ง
    global_show_winner_only BOOLEAN DEFAULT FALSE, -- แสดงเฉพาะผู้ชนะทุกตำแหน่ง
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    UNIQUE KEY unique_election (election_id)
);

-- 12. ตารางการตั้งค่าแสดงผลแต่ละตำแหน่ง (Position Display Config)
CREATE TABLE position_display_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    position_id VARCHAR(50) NOT NULL,
    show_raw_score BOOLEAN DEFAULT TRUE,          -- แสดงคะแนนดิบ
    show_winner_only BOOLEAN DEFAULT FALSE,        -- แสดงเฉพาะผู้ชนะ
    skip BOOLEAN DEFAULT FALSE,                    -- ข้ามการแสดงผล
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_election_position (election_id, position_id),
    INDEX idx_election_id (election_id)
);

-- 13. ตารางเก็บ Token ยืนยันการโหวต (Vote Tokens)
-- Token ใช้ยืนยันว่านักเรียนโหวตเรียบร้อย และใช้ดูผลการเลือกตั้ง
CREATE TABLE vote_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    election_id INT NOT NULL,
    token VARCHAR(20) UNIQUE NOT NULL,           -- Format: VOTE-XXXX-XXXX
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    
    -- นักเรียน 1 คน มี Token ได้ 1 อันต่อ 1 การเลือกตั้ง
    UNIQUE KEY unique_student_election (student_id, election_id),
    INDEX idx_token (token)
);


-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- ตัวอย่างคำนำหน้าที่ใช้:
-- 'นาย', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'นาง'

-- Default Admin (password: admin123, access_level: 0=Root)
-- INSERT INTO admins (username, password_hash, display_name, access_level) VALUES
-- ('admin', '$2a$10$rqKvPYZvTZx8t8YGqPvnHOqVPZQ5mGWkDVLFM8KMQvRJrXbZ.lR6W', 'Administrator', 0);

-- =====================================================
-- Useful Queries
-- =====================================================

-- นับคะแนนแต่ละผู้สมัครตามตำแหน่ง:
-- SELECT c.name, c.rank, p.title as position, COUNT(v.id) as vote_count
-- FROM candidates c
-- JOIN positions p ON c.position_id = p.id
-- LEFT JOIN votes v ON v.candidate_id = c.id
-- WHERE c.election_id = ?
-- GROUP BY c.id, p.id
-- ORDER BY p.sort_order, vote_count DESC;

-- ตรวจสอบว่านักเรียนโหวตแล้วหรือยัง:
-- SELECT * FROM vote_history WHERE student_id = ? AND election_id = ?;

-- =====================================================
-- Migration Scripts
-- =====================================================

-- v2.1: Add Admin Access Levels
-- ALTER TABLE admins ADD COLUMN access_level TINYINT DEFAULT 1 AFTER display_name;
-- UPDATE admins SET access_level = 0 WHERE id = 1;

-- v2.2: Add Activities Table for Activity Logging
-- CREATE TABLE activities (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     type ENUM('vote_cast', 'system_check', 'admin_action', 'election_change') NOT NULL,
--     title VARCHAR(255) NOT NULL,
--     description TEXT NOT NULL,
--     metadata JSON,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     INDEX idx_type (type),
--     INDEX idx_created_at (created_at)
-- );

-- v2.3: Add Public Display Settings Tables (for Post-Election Results Display)
-- CREATE TABLE public_display_settings (...);
-- CREATE TABLE position_display_configs (...);

-- =====================================================
-- Migration Scripts
-- =====================================================

-- v2.4: Add Vote Tokens Table (for Vote Verification)
-- CREATE TABLE vote_tokens (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     student_id VARCHAR(10) NOT NULL,
--     election_id INT NOT NULL,
--     token VARCHAR(20) UNIQUE NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
--     FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
--     UNIQUE KEY unique_student_election (student_id, election_id),
--     INDEX idx_token (token)
-- );

-- v2.5: Add is_archived column for Election Archiving
-- ALTER TABLE elections ADD COLUMN is_archived BOOLEAN DEFAULT FALSE AFTER is_active;
-- CREATE INDEX idx_is_archived ON elections(is_archived);
