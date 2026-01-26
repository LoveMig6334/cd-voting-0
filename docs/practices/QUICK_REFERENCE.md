# Quick Reference Guide

> อ้างอิงอย่างรวดเร็วสำหรับ patterns และ snippets ที่ใช้บ่อยในโปรเจค

## 🎬 Animations (Tailwind CSS v4)

### Creating Custom Animation

**In `globals.css`:**

```css
@theme {
  --animate-{name}: {keyframe} {duration} {timing};

  @keyframes {keyframe} {
    0% { /* start state */ }
    100% { /* end state */ }
  }
}
```

**In Component:**

```tsx
<div className="animate-{name}">
```

### Common Animations

```css
/* Fade In */
--animate-fade-in: fadeIn 0.3s ease-out;
@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

/* Slide Up */
--animate-slide-up: slideUp 0.3s ease-out;
@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
--animate-scale-in: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
@keyframes scaleIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Animation Timing Functions

```css
ease-out              /* ช้า → เร็ว (ดีสำหรับ entrances) */
ease-in               /* เร็ว → ช้า (ดีสำหรับ exits) */
ease-in-out           /* ช้า → เร็ว → ช้า */
cubic-bezier(0.16, 1, 0.3, 1)  /* Spring-like */
```

---

## 🎭 Modal Component Pattern

### Basic Structure

```tsx
"use client";

import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Modal({ isOpen, onClose }: ModalProps) {
  // Prevent scrollbar jump
  useEffect(() => {
    if (isOpen) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative glass-card rounded-2xl animate-modal-content">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

### Escape Key Handler

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      onClose();
    }
  };

  if (isOpen) {
    document.addEventListener("keydown", handleEscape);
  }

  return () => {
    document.removeEventListener("keydown", handleEscape);
  };
}, [isOpen, onClose]);
```

---

## 🎨 Glassmorphism Classes

### Available Classes

```tsx
/* Card with glass effect */
<div className="glass-card">

/* Navbar with glass effect */
<div className="glass-navbar">

/* Panel with glass effect */
<div className="glass-panel">
```

### Custom Glass Effect

```css
.custom-glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 24px -1px rgba(26, 86, 219, 0.06);
}
```

---

## 🎯 Common Patterns

### Loading State Button

```tsx
<button
  disabled={loading}
  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? "กำลังโหลด..." : "บันทึก"}
</button>
```

### Conditional Rendering

```tsx
{
  isOpen && <Modal />;
}
{
  data ? <Content data={data} /> : <Skeleton />;
}
{
  error && <ErrorMessage error={error} />;
}
```

### Form Input with Thai Labels

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">ชื่อ-นามสกุล</label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="กรอกชื่อ-นามสกุล"
  />
</div>
```

---

## 🔧 Utility Functions

### Calculate Scrollbar Width

```typescript
const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
```

### Format Date (Thai)

```typescript
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};
```

### Debounce Function

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

---

## 📱 Responsive Design

### Breakpoints

```tsx
/* Mobile first approach */
<div className="
  w-full              /* Mobile */
  md:w-1/2            /* Tablet (768px+) */
  lg:w-1/3            /* Desktop (1024px+) */
  xl:w-1/4            /* Large desktop (1280px+) */
">
```

### Hide/Show on Mobile

```tsx
<div className="hidden md:block">  /* Desktop only */
<div className="block md:hidden">  /* Mobile only */
```

---

## 🎨 Color Palette

```css
--color-primary: #137fec;
--color-royal-blue: #1a56db;
--color-vivid-yellow: #fbbf24;
--color-dark-slate: #1e3a5f;
--color-cool-gray: #64748b;
```

**Usage:**

```tsx
<div className="bg-primary">     /* Primary */
<div className="bg-royal-blue">     /* Royal Blue */
<div className="bg-vivid-yellow">     /* Vivid Yellow */
```

---

## 🚀 Performance Tips

### Do's ✅

- Animate `opacity` and `transform` only
- Use `will-change: transform` for elements that will animate
- Lazy load components with `React.lazy()`
- Memoize expensive calculations with `useMemo`
- Memoize callbacks with `useCallback`

### Don'ts ❌

- Don't animate `width`, `height`, or layout properties
- Don't animate `backdrop-filter` in keyframes
- Don't create new functions in render
- Don't use inline styles for animations
- Don't forget to cleanup `useEffect`

---

## 📚 Related Documentation

- [ANIMATION_AND_MODAL_BEST_PRACTICES.md](ANIMATION_AND_MODAL_BEST_PRACTICES.md) - Complete guide
- [CLAUDE.md](../../CLAUDE.md) - Project guidelines
- [README.md](../../README.md) - Project overview

---

**Last Updated:** 2026-01-26
