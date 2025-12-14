# 🗳️ CD Voting 0 | School Election System — Next.js Web Application

# 📌 สารบัญ

1. [ภาพรวมโปรเจกต์](#-1-ภาพรวมโปรเจกต์)
2. [เทคโนโลยีที่ใช้](#-2-เทคโนโลยีที่ใช้)
3. [บทบาทผู้ใช้งาน](#-3-บทบาทผู้ใช้งาน)
4. [ฟีเจอร์หลักของระบบ](#-4-ฟีเจอร์หลักของระบบ)
5. [โครงสร้างข้อมูล (Data Models)](#-5-โครงสร้างข้อมูล-data-models)
6. [API Design](#-6-api-design)
7. [ระบบ OCR ถ่ายบัตรนักเรียน](#-7-ระบบ-ocr-ถ่ายบัตรนักเรียน)
8. [ระบบโหวต + Token ยืนยัน ผ่านอีเมล](#-8-ระบบโหวต--token-ยืนยัน-ผ่านอีเมล)
9. [Security Design](#-9-security-design)
10. [UI/UX Guideline](#-10-uiux-guideline)
11. [Project Structure](#-11-project-structure-แนะนำ)
12. [TODO List สำหรับพัฒนาต่อ](#-12-todo-list-สำหรับพัฒนาต่อ)

---

# 🎯 1. ภาพรวมโปรเจกต์

เว็บแอปเลือกตั้งออนไลน์ ใช้ในการจัดการผู้สมัคร โหวต ตรวจสอบผล และสร้างประสบการณ์โหวตที่โปร่งใส โดยใช้:

- Next.js (React Framework 16.0.10)
- หน้าระบบแยก Student / Admin
- ระบบ OCR เพื่อให้ลงทะเบียนง่ายด้วยการถ่ายรูปบัตรนักเรียน
- ระบบส่งอีเมลยืนยัน Token หลังโหวตทุกครั้ง
- ระบบตรวจสอบประวัติการโหวตย้อนหลัง

---

# 🧱 2. เทคโนโลยีที่ใช้

- **Frontend Framework:** Next.js + React version 16.0.10
- **UI:** Tailwind CSS
- **State:** Context API / Zustand
- **Database:** Firebase
- **Authentication:** Custom Auth (Student ID + Password / OCR Register)
- **OCR:** Cloud Vision หรือ OCR Engine เช่น Google Vision, Tesseract
- **Email:** SMTP / SendGrid / Resend API

---

# 👥 3. บทบาทผู้ใช้งาน

## 👨‍🎓 Student (นักเรียน)

- Login
- ลงทะเบียนด้วยบัตรนักเรียน (OCR)
- ดูรายการเลือกตั้ง
- ดูรายละเอียดและนโยบายผู้สมัคร
- ลงคะแนนแบบ 1 ครั้งต่อการเลือกตั้ง 1 ตำแหน่ง
- รับ Token ยืนยันผลโหวตทางอีเมล
- ดูประวัติการโหวตของตัวเอง
- ดูผลการเลือกตั้งหลังจบการโหวต

## 🧑‍🏫 Admin (คุณครู/ผู้ดูแลระบบ)

- Login เข้าระบบหลังบ้าน
- สร้าง/แก้ไข/ปิดการเลือกตั้ง
- จัดการผู้สมัคร
- จัดการรายชื่อนักเรียน
- ดูผลคะแนนแบบ Real-time
- ดูประวัติการโหวตของนักเรียน
- Export ข้อมูลผลคะแนน และประวัติการโหวต

---

# ⭐ 4. ฟีเจอร์หลักของระบบ

### 1) ระบบลงทะเบียนอัจฉริยะ (Smart Register)

นักเรียนสามารถ:

- ถ่ายรูปบัตรนักเรียน
- ระบบ AI OCR อ่าน Student ID, ชื่อ, ห้อง
- Autofill ฟอร์มให้ทันที
- ยืนยันและสร้างบัญชี

### 2) ระบบเลือกตั้งสำหรับนักเรียน

- ดูข้อมูลผู้สมัคร
- เลือกผู้สมัคร
- ป้องกันการโหวตซ้ำ

### 3) ระบบยืนยันผลโหวตด้วย Token ทางอีเมล

หลังโหวตสำเร็จ:

- ระบบสร้าง Vote Token ID
- ส่งอีเมลยืนยันให้ผู้ใช้
- ใช้ตรวจสอบประวัติการโหวตย้อนหลังได้

### 4) ระบบ Admin Dashboard

- จัดการทุกอย่างผ่าน UI
- ดูผลโหวตแบบ Real-time
- มีระบบรายงานผลแยกตามผู้สมัคร

---

# 🗄️ 5. โครงสร้างข้อมูล (Data Models)

## Student

```ts
Student {
  id: string;
  name: string;
  classRoom: string;
  role: "STUDENT" | "ADMIN";
  hasVoted: { [electionId: string]: boolean };
  email: string;
}
```

## Election

```ts
Election {
  id: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  status: "DRAFT" | "OPEN" | "CLOSED";
  maxVote: number;
}
```

## Candidate

```ts
Candidate {
  id: string;
  electionId: string;
  name: string;
  number: number;
  policy: string;
  avatarUrl?: string;
  classRoom?: string;
}
```

## Vote (อัปเดตเพิ่ม Token ID)

```ts
Vote {
  id: string;
  electionId: string;
  studentId: string;
  candidateId: string;
  tokenId: string;
  createdAt: Date;
}
```

---

# 🌐 6. API Design

### Public API (Student)

```
POST   /api/ocr/student-card    # OCR ถ่ายบัตรนักเรียน
POST   /api/auth/register       # ลงทะเบียน
POST   /api/auth/login          # ล็อกอิน
GET    /api/elections           # รายการเลือกตั้ง
GET    /api/elections/:id       # รายละเอียดเลือกตั้ง
POST   /api/vote                # ส่งคะแนนโหวต
GET    /api/me/votes            # ประวัติการโหวต
```

### Admin API

```
POST   /api/admin/elections
PATCH  /api/admin/elections/:id
POST   /api/admin/candidates
PATCH  /api/admin/candidates/:id
DELETE /api/admin/candidates/:id
GET    /api/admin/results/:id
```

---

# 🤖 7. ระบบ OCR ถ่ายบัตรนักเรียน

### Flow

1. ผู้ใช้เลือก “ลงทะเบียนด้วยบัตรนักเรียน”
2. อัปโหลด/ถ่ายรูปบัตรนักเรียน
3. ส่งรูปไป API `/api/ocr/student-card`
4. OCR อ่านข้อมูล
5. Autofill ฟอร์มลงทะเบียน

### ตัวอย่าง Response

```json
{
  "studentId": "6312",
  "name": "นายสมชาย ใจดี",
  "classRoom": "ม.5/3",
  "rawText": "6312 สมชาย ใจดี ม.5/3"
}
```

### ความปลอดภัยของ OCR

- รูปจะถูกประมวลผลเฉพาะบนเซิร์ฟเวอร์
- ไม่เก็บรูปถาวร
- เก็บเฉพาะ log เช่น OCR success/fail

---

# 📩 8. ระบบโหวต + Token ยืนยัน ผ่านอีเมล

### Flow หลังโหวตสำเร็จ

1. นักเรียนส่งคะแนนผ่าน `/api/vote`
2. Backend สร้าง tokenId เช่น: `VOTE-9SG2-XQ11`
3. ส่งอีเมลใบยืนยันไปให้นักเรียน
4. UI แสดงหน้า Vote Success พร้อม Token ID
5. นักเรียนดูประวัติได้ใน `/me/votes`

### ตัวอย่าง Payload ในประวัติ

```ts
{
  electionTitle: "เลือกตั้งประธานนักเรียน",
  tokenId: "VOTE-9SG2-XQ11",
  createdAt: "2025-03-15T10:22:00.000Z"
}
```

---

# 🛡 9. Security Design

- Student ไม่สามารถลงคะแนนซ้ำ
- ตรวจสอบสิทธิ์ทุก request ด้วย JWT หรือ Session
- Admin สามารถเข้าหน้า `/admin/*` เท่านั้น
- ไม่เก็บรูปบัตรนักเรียนถาวร
- Token โหวตไม่ใช้เป็นวิธี login
- ป้องกันข้อมูลเลือกตั้งลับจนกว่าจะถึงเวลาแสดงผล

---

# 🎨 10. UI/UX Guideline

- Mobile-first
- ปุ่มเลือกผู้สมัครชัดเจน
- หน้าผลโหวตใช้กราฟ bar/pie
- หน้าประวัติการโหวตจัดลำดับตามเวลา
- หน้า OCR upload ต้องใช้ง่าย + Preview รูป

---

# 📁 11. Project Structure (แนะนำ)

```
project/
│── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   ├── (student)/
│   │   ├── elections/
│   │   │   ├── [id]/
│   │   ├── me/
│   │   │   ├── votes/
│   │   ├── vote-success/
│   ├── (admin)/
│   │   ├── elections/
│   │   │   ├── [id]/
│   │   ├── candidates/
│   │   │   ├── [id]/
│   │   ├── results/
│   │   │   ├── [id]/
│   │   ├── users/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   ├── ocr/
│   │   │   ├── student-card/
│   │   ├── elections/
│   │   │   ├── [id]/
│   │   ├── vote/
│   │   ├── me/
│   │   │   ├── votes/
│   │   ├── admin/
│   │   │   ├── elections/
│   │   │   │   ├── [id]/
│   │   │   ├── candidates/
│   │   │   │   ├── [id]/
│   │   │   ├── results/
│   │   │   │   ├── [id]/
│   ├── layout.tsx
│   ├── page.tsx
│
│── components/
│   ├── auth/
│   ├── common/
│   ├── elections/
│   ├── ocr/
│   ├── admin/
│
│── lib/
│   ├── auth/
│   ├── api/
│   ├── utils/
│   ├── hooks/
│   ├── types/
│
│── public/
│   ├── images/
│   ├── icons/
│
│── styles/
│   ├── globals.css
│
│── README.md
│── next.config.js
│── tsconfig.json
│── tailwind.config.ts
```

---

# 🚀 12. TODO List สำหรับพัฒนาต่อ

- [ ] UI Wireframe
- [ ] ระบบ Auth + แบ่ง role
- [ ] ระบบ OCR + ทดสอบหลายสภาพแสง
- [ ] ระบบ Vote + Token + Email
- [ ] หน้า `/me/votes`
- [ ] Admin Dashboard
- [ ] ระบบรายงานผลเลือกตั้ง
- [ ] ระบบป้องกันโหวตซ้ำ
- [ ] ระบบ Privacy Policy
- [ ] Unit Test / Integration Test
