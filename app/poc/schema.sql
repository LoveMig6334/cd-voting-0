-- 1. ตารางนักเรียน (Authentication)
-- เก็บข้อมูลส่วนตัวแยกไว้เพื่อใช้ Login เท่านั้น
CREATE TABLE students (
    id VARCHAR(10) PRIMARY KEY, -- รหัสนักเรียน (Student ID)
    national_id_hash VARCHAR(255) NOT NULL, -- เก็บแบบ Hash เพื่อความปลอดภัย (ถ้าทำได้) หรือเก็บ Encrypted
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    class_room VARCHAR(20) NOT NULL,
    role ENUM('STUDENT', 'ADMIN') DEFAULT 'STUDENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางการเลือกตั้ง (Election Config)
CREATE TABLE elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('PENDING', 'OPEN', 'CLOSED') DEFAULT 'PENDING',
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. ตารางผู้สมัคร (Candidates)
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slogan VARCHAR(255),
    image_url VARCHAR(500),
    FOREIGN KEY (election_id) REFERENCES elections(id)
);

-- 4. ตารางบันทึกการใช้สิทธิ์ (Voter Turnout / History)
-- ตารางนี้รู้ว่า "ใคร" มาใช้สิทธิ์ "การเลือกตั้งไหน" แต่ไม่รู้ว่า "กาเบอร์อะไร"
CREATE TABLE vote_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    election_id INT NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45), -- Optional: เพื่อตรวจสอบ Audit Log

    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (election_id) REFERENCES elections(id),

    -- Constraint สำคัญ: นักเรียน 1 คน โหวตได้ 1 ครั้งต่อ 1 การเลือกตั้ง
    UNIQUE KEY unique_voter (student_id, election_id)
);

-- 5. ตารางผลคะแนน (Ballots)
-- ตารางนี้รู้ว่า "เบอร์ไหน" ได้คะแนน แต่ไม่รู้ว่า "ใครกา" (Anonymous)
CREATE TABLE votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    candidate_id INT, -- NULL ถ้าเลือก No Vote (งดออกเสียง)
    is_no_vote BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- 6. ตาราง Sessions (สำหรับ Server-Side Authentication)
-- ใช้เก็บ Session ID แทนการเก็บข้อมูล User ลง Cookie
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY, -- Random Session Token
    student_id VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- INDEXING เพื่อความรวดเร็วในการนับคะแนน
CREATE INDEX idx_election_candidate ON votes(election_id, candidate_id);
