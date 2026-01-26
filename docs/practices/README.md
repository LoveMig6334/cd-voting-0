# Documentation

เอกสารประกอบสำหรับ AI Agents และ Developers ในโปรเจค CD Voting 0

## 📚 Available Documents

### [QUICK_REFERENCE.md](QUICK_REFERENCE.md) ⚡

Quick reference guide สำหรับ patterns, snippets และ utilities ที่ใช้บ่อย

**เนื้อหาภายใน:**
- Animation snippets
- Modal patterns
- Glassmorphism classes
- Common component patterns
- Utility functions
- Performance tips

**เมื่อไหร่ควรอ่าน:**
- ต้องการหา code snippets อย่างรวดเร็ว
- ลืมชื่อ class หรือ pattern ที่ใช้บ่อย
- ต้องการ copy-paste ready code

---

### [ANIMATION_AND_MODAL_BEST_PRACTICES.md](ANIMATION_AND_MODAL_BEST_PRACTICES.md) 📖

คู่มือฉบับสมบูรณ์สำหรับการพัฒนา animations และ modal components ด้วย Tailwind CSS v4

**หัวข้อที่ครอบคลุม:**
- ข้อผิดพลาดที่พบบ่อยและวิธีแก้ไข
- Tailwind CSS v4 animation implementation
- การป้องกัน scrollbar jump ใน modal
- ตัวอย่าง code ที่ถูกต้องและพร้อมใช้งาน
- Performance optimization tips
- Browser compatibility

**เมื่อไหร่ควรอ่าน:**
- กำลังสร้าง modal, dialog, หรือ overlay components
- พบปัญหา animation ไม่ทำงาน
- เจอ layout shift หรือ scrollbar jump
- ต้องการ implement smooth transitions
- ต้องการเข้าใจ deep dive ของ animations

---

## 📖 How to Use This Documentation

### สำหรับ AI Agents

เอกสารเหล่านี้ถูกเขียนเพื่อให้ AI agents สามารถ:
1. เรียนรู้จากข้อผิดพลาดที่เกิดขึ้นในอดีต
2. ใช้เป็น reference เมื่อพัฒนา features ที่คล้ายกัน
3. ปฏิบัติตาม best practices ของโปรเจค
4. หลีกเลี่ยงการทำผิดพลาดซ้ำ

**แนะนำ:** อ่านเอกสารที่เกี่ยวข้องก่อนเริ่มงานใหม่

### สำหรับ Developers

เอกสารเหล่านี้สามารถใช้เป็น:
- Quick reference guide
- Learning resource
- Troubleshooting guide
- Code examples repository

---

## 🤝 Contributing to Documentation

เมื่อพบข้อผิดพลาดหรือเรียนรู้สิ่งใหม่:

1. สร้างเอกสารใหม่ใน `doc/` folder
2. ตั้งชื่อไฟล์แบบ `TOPIC_NAME.md` (uppercase, underscore-separated)
3. เพิ่ม entry ใน `doc/README.md` นี้
4. อัปเดต `CLAUDE.md` หากจำเป็น

**Template structure:**
```markdown
# Topic Title

> Brief description

## Table of Contents
## Common Mistakes
## Correct Approach
## Examples
## References
```

---

## 📝 Document History

| Date | Document | Description |
|------|----------|-------------|
| 2026-01-26 | ANIMATION_AND_MODAL_BEST_PRACTICES.md | Initial documentation for animations and modals |
| 2026-01-26 | QUICK_REFERENCE.md | Quick reference guide for common patterns |

---

**Last Updated:** 2026-01-26
