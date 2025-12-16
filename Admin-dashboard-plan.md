### 🎨 Concept: Admin Dashboard Design System

- **Platform:** Desktop Web Application (1920x1080 optimized).
- **Theme:** "Clean Corporate Tech" – ใช้สีขาวเป็นพื้นหลัก ตัดด้วยเส้นขอบบางๆ (Border) สีเทาอ่อน เพื่อให้อ่าน Data Table ง่าย
- **Colors:** ยังคงใช้ **Royal Blue** เป็น Primary (Header/Buttons) และ **Yellow** เป็น Accent (Status/Highlights) ตาม CI เดิม
- **Navigation:** Top Navbar (ตามที่คุณระบุ) เพื่อให้มีพื้นที่ด้านล่างสำหรับตารางข้อมูลกว้างๆ

---

### 1. 🏠 Prompt: Admin Layout & Dashboard Overview (หน้าแรกแอดมิน)

หน้านี้เป็นศูนย์กลางรวบรวมสถานะระบบแบบ Real-time ตามที่ระบุใน README (ดูผลคะแนน Real-time)

**AI Prompt:**

> **Context:** Create a Desktop Admin Dashboard interface for "CD Voting 0", a school election system.
> **Style:** Clean, professional, data-heavy but readable. Similar to Vercel dashboard or Stripe dashboard.
> **Layout:**
>
> - **Top Navigation Bar:** Full width. Deep Royal Blue background.
>   - **Left:** Logo "CD VOTING 0" (White text, Yellow "CD").
>   - **Center:** Navigation links: "Dashboard", "Manage Elections", "Students", "Settings".
>   - **Right:** Admin Profile dropdown & Logout.
> - **Main Content:** A generous padding container on a light gray background (`bg-slate-50`).
>   **Content - Dashboard Home:**
>
> 1.  **Welcome Section:** "Welcome back, Admin".
> 2.  **Stats Cards (Grid of 4):**
>     - Total Students (Icon: Users).
>     - Active Elections (Icon: Vote Box, Highlight number in Green).
>     - Total Votes Cast (Today) (Icon: BarChart).
>     - System Status (Text: "Online", Green dot).
> 3.  **Active Elections Overview:** A section showing currently open elections with a "Live Results" button and a "Close Election" button (Red outline).
> 4.  **Recent Activity Log:** A small list showing recent actions (e.g., "Student ID 6312 registered", "Vote cast in Student Council").

---

### 2. 🗳️ Prompt: Election Management & Creation (หน้าจัดการเลือกตั้ง)

หน้านี้สำคัญที่สุด ใช้สำหรับสร้าง/แก้ไข และกำหนดสถานะ Open/Closed

**AI Prompt:**

> **Context:** The "Manage Elections" page for the CD Voting Admin panel.
> **UI Component:** A complex Data Table with actions.
> **Layout:**
>
> - **Header:** Title "Election Management" with a large primary Blue button "+ Create New Election" on the right.
> - **Filter Bar:** Search input, Status filter (All, Draft, Open, Closed).
> - **The Table:** Columns should include:
>   - **Title:** (e.g., "Student Council 2024").
>   - **Status:** Badge (Green for Open, Gray for Draft, Red for Closed).
>   - **Candidates:** Number of candidates (e.g., "4 Candidates").
>   - **Date Range:** Start Date - End Date.
>   - **Actions:** "Edit" (Pencil icon), "Results" (Chart icon), "Delete" (Trash icon).
> - **Create/Edit Modal (Popup):**
>   - Input for Title & Description.
>   - Date Pickers for Start/End time.
>   - **Candidate Management Section (Inside Modal):** A dynamic list where Admin can add candidates (Upload Photo, Name, Number, Policy).

---

### 3. 📊 Prompt: Real-time Results & Analytics (หน้าดูผลคะแนน)

หน้านี้เน้นกราฟและตารางคะแนน เพื่อใช้แสดงผลและ Export ข้อมูล

**AI Prompt:**

> **Context:** The "Election Results" detail page for a specific election (e.g., Student Council 2024).
> **Style:** Analytical dashboard.
> **Layout:**
>
> - **Header:** Election Title, a "Live" pulsing badge, and an "Export CSV" button (Outline style).
> - **Top Section (Visualization):**
>   - **Left:** A large Doughnut Chart showing "Voter Turnout" (Voted vs. Not Voted).
>   - **Right:** A Horizontal Bar Chart showing votes per candidate. Highlight the leader in Gold/Yellow.
> - **Bottom Section (Candidate Detail Table):**
>   - Table showing: Rank, Candidate Photo & Name, Total Votes, Percentage (%).
> - **Voting Log (Security):** A collapsed section showing recent anonymized votes with timestamps and Token IDs (e.g., `VOTE-9SG2...`) for verification.

---

### 4. 👥 Prompt: Student Management (หน้าจัดการนักเรียน)

ใช้สำหรับดูรายชื่อ, ตรวจสอบสถานะการโหวต และดูประวัติ

**AI Prompt:**

> **Context:** The "Student Management" page.
> **Layout:**
>
> - **Header:** "Student Database" with "Import from CSV" and "Add Student" buttons.
> - **Table:** A clean list of students.
>   - **Columns:** Student ID (Monospace font), Full Name, Class/Room, Registration Status (Registered via OCR / Not Registered), Last Active.
>   - **Action:** "View History" button.
> - **Student Detail View (Drawer/Modal):**
>   - When clicking a student, show their profile and a timeline list of "Voting History" (e.g., "Voted in Student Council at 10:00 AM").

---

### 💡 คำแนะนำทางเทคนิคสำหรับการ Implement (Next.js)

1.  **Layout Component:** เนื่องจากคุณต้องการ **Top Navbar** ให้สร้าง `AdminLayout.tsx` แยกต่างหากจาก User Layout เพื่อไม่ให้สับสน
    - _User:_ Bottom Navigation (Mobile first).
    - _Admin:_ Top Navigation (Desktop first).
2.  **Table Library:** แนะนำให้ใช้ **TanStack Table** (React Table) ร่วมกับ **Shadcn UI (Data Table)** เพราะจัดการเรื่อง Sorting, Filtering และ Pagination ของรายชื่อนักเรียนจำนวนมากได้ดีครับ
3.  **Charts:** สำหรับกราฟในหน้า Dashboard แนะนำ **Recharts** เพราะเข้ากับ React ได้ดีและปรับแต่งสีให้ตรงกับ Theme (น้ำเงิน/เหลือง) ได้ง่าย

คุณสามารถ Copy Prompts เหล่านี้ไปวางทีละข้อเพื่อ Gen UI ออกมาได้เลยครับ! หากต้องการ Code ส่วนไหนเจาะจงบอกผมได้ครับ
