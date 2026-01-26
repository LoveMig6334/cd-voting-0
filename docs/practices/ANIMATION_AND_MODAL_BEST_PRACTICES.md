# Animation และ Modal UI Best Practices

> **สำหรับ AI Agents:** เอกสารนี้สรุปข้อผิดพลาดและความรู้จากการพัฒนา Modal Component ด้วย Tailwind CSS v4 เพื่อป้องกันไม่ให้เกิดข้อผิดพลาดซ้ำในอนาคต

---

## สารบัญ

1. [ข้อผิดพลาดที่เกิดขึ้น](#ข้อผิดพลาดที่เกิดขึ้น)
2. [การแก้ไขที่ถูกต้อง](#การแก้ไขที่ถูกต้อง)
3. [Tailwind CSS v4 Animation Implementation](#tailwind-css-v4-animation-implementation)
4. [การป้องกัน Scrollbar Jump](#การป้องกัน-scrollbar-jump)
5. [ตัวอย่าง Code ที่ถูกต้อง](#ตัวอย่าง-code-ที่ถูกต้อง)

---

## ข้อผิดพลาดที่เกิดขึ้น

### 1. ❌ ใช้ Inline Style สำหรับ Animation

**ผิด:**
```tsx
<div
  className="modal-backdrop"
  style={{ animation: "modalBackdrop 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
>
```

**ปัญหา:**
- Tailwind CSS v4 ไม่ recognize inline style animations
- Animation จะไม่ทำงานเพราะ keyframes ไม่ถูก link กับ inline styles
- Performance ไม่ดีเท่ากับการใช้ utility classes

---

### 2. ❌ พยายาม Animate `backdrop-filter` ใน Keyframes

**ผิด:**
```css
@keyframes modalBackdrop {
  0% {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  100% {
    opacity: 1;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}
```

**ปัญหา:**
- `backdrop-filter` มี performance overhead สูงมาก
- การ animate `backdrop-filter` ใช้ GPU มากเกินไป
- เบราว์เซอร์บางตัวอาจไม่รองรับการ animate property นี้
- ทำให้ animation สะดุดหรือไม่เรียบ

**แก้ไข:**
- ใช้ `backdrop-blur-sm` ใน class แทน (static)
- Animate เฉพาะ `opacity` เท่านั้น

---

### 3. ❌ ไม่จัดการ Scrollbar Jump

**ปัญหา:**
- เมื่อตั้ง `overflow: hidden` บน `body`, scrollbar จะหายไป
- เนื้อหาจะเลื่อนไปทางขวา ~15-17px (ความกว้างของ scrollbar)
- UI layout จะ "กระโดด" อย่างเห็นได้ชัด
- ประสบการณ์ผู้ใช้แย่

**ที่มา:**
```
Window width - Document width = Scrollbar width
```

---

## การแก้ไขที่ถูกต้อง

### 1. ✅ ใช้ Tailwind Utility Classes

**ถูกต้อง:**
```tsx
<div className="modal-backdrop animate-modal-backdrop">
```

**การตั้งค่าใน `globals.css`:**
```css
@theme {
  --animate-modal-backdrop: modalBackdrop 0.3s ease-out;

  @keyframes modalBackdrop {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
}
```

**เหตุผล:**
- Tailwind v4 สร้าง utility class `animate-modal-backdrop` อัตโนมัติ
- Keyframes ถูก inject เข้า CSS bundle
- Type-safe และ maintainable
- Better performance

---

### 2. ✅ Animate Properties ที่มี Performance ดี

**Properties ที่ควร Animate (GPU-accelerated):**
- ✅ `opacity`
- ✅ `transform` (translate, scale, rotate)

**Properties ที่ควรห้าม Animate:**
- ❌ `backdrop-filter`
- ❌ `filter`
- ❌ `width`, `height`
- ❌ `top`, `left`, `right`, `bottom`
- ❌ `margin`, `padding`

**ตัวอย่างที่ดี:**
```css
@keyframes modalContent {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

### 3. ✅ จัดการ Scrollbar Jump ด้วย JavaScript

**วิธีการที่ถูกต้อง:**

```tsx
useEffect(() => {
  if (isOpen) {
    // คำนวณความกว้างของ scrollbar
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    // ป้องกัน scroll และเพิ่ม padding ชดเชย
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    // Reset เมื่อปิด modal
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  };
}, [isOpen]);
```

**อธิบาย:**
1. คำนวณ scrollbar width: `window.innerWidth - document.documentElement.clientWidth`
2. ตั้ง `overflow: hidden` เพื่อป้องกันการ scroll
3. เพิ่ม `padding-right` เท่ากับความกว้างของ scrollbar
4. Reset ค่าเมื่อ modal ปิด

**Alternative: CSS-only (Modern browsers):**
```css
body.modal-open {
  overflow: hidden;
  scrollbar-gutter: stable;
}
```

> ⚠️ **หมายเหตุ:** `scrollbar-gutter` รองรับใน Chrome, Firefox, Safari 17+ เท่านั้น

---

## Tailwind CSS v4 Animation Implementation

### Step-by-Step Guide

#### 1. กำหนด Animation ใน `@theme`

ไฟล์: `app/globals.css`

```css
@theme {
  /* Define animation variables */
  --animate-modal-backdrop: modalBackdrop 0.3s ease-out;
  --animate-modal-content: modalContent 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  /* Define keyframes */
  @keyframes modalBackdrop {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes modalContent {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
}
```

#### 2. ใช้งานใน Component

```tsx
<div className="fixed inset-0 z-50">
  {/* Backdrop with static blur + fade animation */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop" />

  {/* Modal with scale + slide animation */}
  <div className="glass-card rounded-2xl animate-modal-content">
    {/* Modal content */}
  </div>
</div>
```

#### 3. Animation Naming Convention

**Pattern:**
```
--animate-{name}: {keyframe-name} {duration} {timing-function};
```

**ตัวอย่าง:**
- `--animate-fade-in: fadeIn 0.3s ease-out;`
- `--animate-slide-up: slideUp 0.3s ease-out;`
- `--animate-bounce-in: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);`

**ใช้งาน:**
- Class: `animate-fade-in`, `animate-slide-up`, `animate-bounce-in`

---

## การป้องกัน Scrollbar Jump

### ปัญหา

เมื่อเปิด modal และตั้ง `overflow: hidden` บน `<body>`:

```
Before modal open:
[========= Content ========]|░| ← Scrollbar (15-17px)

After modal open (wrong way):
  [========= Content ========]   ← Content shifts right!
```

### Solution 1: JavaScript Calculation (แนะนำ)

**ใช้ได้กับทุก browser:**

```tsx
useEffect(() => {
  if (isOpen) {
    // คำนวณความกว้าง scrollbar
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  };
}, [isOpen]);
```

### Solution 2: CSS `scrollbar-gutter` (Modern)

**สำหรับ browser ใหม่:**

```css
body {
  scrollbar-gutter: stable;
}

body.modal-open {
  overflow: hidden;
}
```

**Browser Support:**
- ✅ Chrome 94+
- ✅ Firefox 97+
- ✅ Safari 17+
- ❌ Safari 16 และก่อนหน้า

### Solution 3: Hybrid Approach

```tsx
useEffect(() => {
  if (isOpen) {
    // ตรวจสอบว่า browser รองรับ scrollbar-gutter หรือไม่
    const supportsScrollbarGutter =
      CSS.supports('scrollbar-gutter', 'stable');

    document.body.style.overflow = "hidden";

    if (!supportsScrollbarGutter) {
      // Fallback สำหรับ browser เก่า
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  return () => {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  };
}, [isOpen]);
```

---

## ตัวอย่าง Code ที่ถูกต้อง

### Complete Modal Component

```tsx
"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "success";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "ยืนยันการดำเนินการ",
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  variant = "default",
}: ConfirmModalProps) {
  // Handle Escape key และป้องกัน scrollbar jump
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);

      // คำนวณและป้องกัน scrollbar jump
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-red-500 hover:bg-red-600 focus:ring-red-400";
      case "success":
        return "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400";
      default:
        return "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - fade in ค่อยๆ + static blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal - scale + slide + fade */}
      <div className="relative w-full max-w-md glass-card p-6 shadow-2xl rounded-2xl animate-modal-content">
        <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
          {title}
        </h3>

        <p className="text-gray-600 mb-7 leading-relaxed text-base">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 hover:shadow-md"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 hover:shadow-lg hover:scale-105 ${getVariantStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### globals.css Configuration

```css
@import "tailwindcss";

@theme {
  /* Modal Animations */
  --animate-modal-backdrop: modalBackdrop 0.3s ease-out;
  --animate-modal-content: modalContent 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  /* Backdrop: fade in เท่านั้น */
  @keyframes modalBackdrop {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  /* Content: fade + scale + slide */
  @keyframes modalContent {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
}
```

---

## Checklist สำหรับ Modal Component

### ✅ Animation
- [ ] ใช้ `animate-*` utility classes (ไม่ใช่ inline style)
- [ ] Animate เฉพาะ `opacity` และ `transform`
- [ ] หลีกเลี่ยงการ animate `backdrop-filter`
- [ ] ใช้ timing function ที่เหมาะสม (ease-out, cubic-bezier)
- [ ] Duration ไม่เกิน 0.3-0.4s เพื่อความรวดเร็ว

### ✅ Scrollbar Management
- [ ] คำนวณ scrollbar width เมื่อ modal เปิด
- [ ] ตั้ง `overflow: hidden` บน body
- [ ] เพิ่ม `padding-right` ชดเชย scrollbar
- [ ] Reset ค่าเมื่อ modal ปิด

### ✅ User Experience
- [ ] รองรับ Escape key สำหรับปิด modal
- [ ] คลิกนอก modal เพื่อปิด
- [ ] ป้องกัน body scroll เมื่อ modal เปิด
- [ ] มี focus management (accessibility)

### ✅ Performance
- [ ] ใช้ GPU-accelerated properties
- [ ] หลีกเลี่ยง expensive operations ใน animations
- [ ] ทดสอบบนอุปกรณ์ที่มี performance ต่ำ

---

## References

### Official Documentation
- [Tailwind CSS v4 Animations](https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/animation.mdx)
- [Tailwind CSS Theme Configuration](https://github.com/tailwindlabs/tailwindcss.com/blob/main/src/docs/theme.mdx)

### Articles
- [Preventing the Layout Shift Caused by Scrollbars](https://dev.to/rashidshamloo/preventing-the-layout-shift-caused-by-scrollbars-2flp)
- [Preventing Layout Shifts When Opening a Modal](https://dulan.me/blog/preventing-layout-shifts-when-opening-a-modal/)
- [CSS Fix for Scrollbar Layout Shifts](https://benmarshall.me/css-fix-scrollbar-shifts/)
- [React: Preventing Layout Shifts When Body Becomes Scrollable](https://maxschmitt.me/posts/react-prevent-layout-shift-body-scrollable)

### Browser Support
- [scrollbar-gutter on Can I Use](https://caniuse.com/mdn-css_properties_scrollbar-gutter)

---

## สรุป

### ข้อควรจำ

1. **ใช้ Tailwind utility classes เสมอ** - อย่าใช้ inline style สำหรับ animations
2. **Animate properties ที่ performance ดี** - เฉพาะ `opacity` และ `transform`
3. **จัดการ scrollbar jump** - คำนวณและเพิ่ม padding ชดเชย
4. **ทดสอบบนหลาย browser** - โดยเฉพาะ Safari และ Firefox
5. **ให้ความสำคัญกับ UX** - animations ต้องรวดเร็วและเรียบ (< 0.4s)

### Common Pitfalls

- ❌ ลืมจัดการ scrollbar jump
- ❌ Animate properties ที่ expensive
- ❌ ใช้ inline style แทน utility classes
- ❌ Animation ช้าเกินไป (> 0.5s)
- ❌ ไม่ cleanup effects ใน useEffect

---

**เอกสารนี้ถูกสร้างขึ้นจากประสบการณ์จริงในการพัฒนา ConfirmModal component**
**วันที่:** 2026-01-26
**โปรเจค:** CD Voting 0 - Next.js Election System
