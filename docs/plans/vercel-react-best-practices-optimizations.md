# Vercel React Best Practices Optimizations Plan

เอกสารนี้รวบรวมจุดที่ควรปรับปรุงตาม **Vercel React Best Practices** สำหรับ CD Voting 0 Project โดยอ้างอิงจาก guidelines ใน `.claude/skills/vercel-react-best-practices/`

**วันที่วิเคราะห์:** 2 กุมภาพันธ์ 2569
**จำนวนจุดที่พบ:** 5 จุด
**ความสำคัญ:** CRITICAL 3 จุด, MEDIUM 2 จุด

---

## สารบัญ

1. [Sequential Awaits in Results Page Loop](#1-sequential-awaits-in-results-page-loop)
2. [Static Import of Recharts Library](#2-static-import-of-recharts-library)
3. [Inline Object Recreation in StatusBadge](#3-inline-object-recreation-in-statusbadge)
4. [Missing React.memo for ElectionCard](#4-missing-reactmemo-for-electioncard)
5. [Waterfall Pattern in Admin Results Page](#5-waterfall-pattern-in-admin-results-page)

---

## 1. Sequential Awaits in Results Page Loop

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `app/admin/elections/[id]/results/page.tsx` |
| **บรรทัด** | 42-49 |
| **Rule** | `async-parallel` |
| **Impact** | CRITICAL (2-10× improvement) |
| **Category** | Eliminating Waterfalls |

### ปัญหา

เมื่อมีหลาย positions การ fetch ผลลัพธ์ของแต่ละ position ทำแบบ sequential (ทีละตัว) ทำให้เกิด waterfall pattern:

```
Position 1 ──────▶ 200ms
                   Position 2 ──────▶ 200ms
                                      Position 3 ──────▶ 200ms
Total: 600ms
```

### โค้ดปัจจุบัน (ไม่ดี)

```typescript
// app/admin/elections/[id]/results/page.tsx:42-49
const positionResults: PositionResult[] = [];

for (const position of enabledPositions) {
  const result = await getPositionResults(
    electionId,
    position.id,
    position.title
  );
  positionResults.push(result);
}
```

### โค้ดที่แก้ไขแล้ว (ดี)

```typescript
// ใช้ Promise.all() เพื่อ fetch พร้อมกัน
const positionResults = await Promise.all(
  enabledPositions.map((position) =>
    getPositionResults(electionId, position.id, position.title)
  )
);
```

### หลักการจาก Vercel Best Practices

> **Rule: `async-parallel`**
>
> When async operations have no interdependencies, execute them concurrently using `Promise.all()`.
>
> ```typescript
> // Incorrect (sequential execution, 3 round trips):
> const user = await fetchUser()
> const posts = await fetchPosts()
> const comments = await fetchComments()
>
> // Correct (parallel execution, 1 round trip):
> const [user, posts, comments] = await Promise.all([
>   fetchUser(),
>   fetchPosts(),
>   fetchComments()
> ])
> ```

### ผลลัพธ์หลังแก้ไข

```
Position 1 ──────▶
Position 2 ──────▶  } 200ms (parallel)
Position 3 ──────▶
Total: 200ms (3× faster)
```

---

## 2. Static Import of Recharts Library

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `app/admin/elections/[id]/results/ResultsClient.tsx` |
| **บรรทัด** | 12-22 |
| **Rule** | `bundle-dynamic-imports` |
| **Impact** | CRITICAL (directly affects TTI and LCP) |
| **Category** | Bundle Size Optimization |

### ปัญหา

Recharts library (~500KB) ถูก import แบบ static ทำให้ถูกรวมใน main bundle และโหลดทันทีแม้ยังไม่ได้ใช้งาน chart ส่งผลกระทบต่อ:
- **TTI (Time to Interactive)** - ใช้เวลานานขึ้นกว่าหน้าจะ interactive
- **LCP (Largest Contentful Paint)** - content หลักแสดงช้าลง
- **Initial Bundle Size** - เพิ่มขนาด JavaScript ที่ต้องโหลด

### โค้ดปัจจุบัน (ไม่ดี)

```typescript
// app/admin/elections/[id]/results/ResultsClient.tsx:12-22
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
```

### โค้ดที่แก้ไขแล้ว (ดี)

**ขั้นตอนที่ 1:** สร้างไฟล์ Chart Component แยก

```typescript
// app/admin/elections/[id]/results/VoterTurnoutChart.tsx
"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface VoterTurnoutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  percentage: number;
}

export default function VoterTurnoutChart({ data, percentage }: VoterTurnoutChartProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width={250} height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900">{percentage}%</span>
        <span className="text-sm text-slate-500">Turnout</span>
      </div>
    </div>
  );
}
```

**ขั้นตอนที่ 2:** ใช้ dynamic import ใน ResultsClient

```typescript
// app/admin/elections/[id]/results/ResultsClient.tsx
import dynamic from "next/dynamic";

// Dynamic import with loading skeleton
const VoterTurnoutChart = dynamic(
  () => import("./VoterTurnoutChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-64 w-64 bg-slate-200 rounded-full mx-auto" />
    ),
  }
);

const CandidateBarChart = dynamic(
  () => import("./CandidateBarChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-64 bg-slate-200 rounded-lg" />
    ),
  }
);
```

### หลักการจาก Vercel Best Practices

> **Rule: `bundle-dynamic-imports`**
>
> Use `next/dynamic` to lazy-load large components not needed on initial render.
>
> ```tsx
> // Incorrect (Monaco bundles with main chunk ~300KB):
> import { MonacoEditor } from './monaco-editor'
>
> // Correct (Monaco loads on demand):
> import dynamic from 'next/dynamic'
>
> const MonacoEditor = dynamic(
>   () => import('./monaco-editor').then(m => m.MonacoEditor),
>   { ssr: false }
> )
> ```

### ผลลัพธ์หลังแก้ไข

| Metric | Before | After |
|--------|--------|-------|
| Initial Bundle Size | ~800KB | ~300KB |
| Recharts Load | Immediate | On-demand |
| TTI | Slow | Fast |

---

## 3. Inline Object Recreation in StatusBadge

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `app/admin/elections/ElectionsClient.tsx` |
| **บรรทัด** | 43-62 |
| **Rule** | `rendering-hoist-jsx` |
| **Impact** | LOW (avoids re-creation) |
| **Category** | Rendering Performance |

### ปัญหา

Object `styles` และ `statusLabels` ถูกสร้างใหม่ทุกครั้งที่ component render ทำให้:
- สร้าง object ใหม่ในทุก render cycle
- อาจทำให้ child components re-render ถ้าใช้เป็น props
- เพิ่ม memory allocation โดยไม่จำเป็น

### โค้ดปัจจุบัน (ไม่ดี)

```typescript
// app/admin/elections/ElectionsClient.tsx:43-62
function StatusBadge({ status }: { status: ElectionStatus }) {
  // สร้างใหม่ทุก render!
  const styles = {
    OPEN: "bg-green-100 text-green-700",
    PENDING: "bg-slate-100 text-slate-600",
    CLOSED: "bg-red-100 text-red-700",
  };

  // สร้างใหม่ทุก render!
  const statusLabels: Record<ElectionStatus, string> = {
    OPEN: "เปิด",
    PENDING: "ร่าง",
    CLOSED: "ปิด",
  };

  return (
    <span
      className={`${styles[status]} px-2.5 py-1 rounded-full text-xs font-semibold uppercase`}
    >
      {statusLabels[status]}
    </span>
  );
}
```

### โค้ดที่แก้ไขแล้ว (ดี)

```typescript
// app/admin/elections/ElectionsClient.tsx

// ย้าย constants ไว้นอก component (module-level)
const STATUS_STYLES = {
  OPEN: "bg-green-100 text-green-700",
  PENDING: "bg-slate-100 text-slate-600",
  CLOSED: "bg-red-100 text-red-700",
} as const;

const STATUS_LABELS: Record<ElectionStatus, string> = {
  OPEN: "เปิด",
  PENDING: "ร่าง",
  CLOSED: "ปิด",
} as const;

function StatusBadge({ status }: { status: ElectionStatus }) {
  return (
    <span
      className={`${STATUS_STYLES[status]} px-2.5 py-1 rounded-full text-xs font-semibold uppercase`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
```

### หลักการจาก Vercel Best Practices

> **Rule: `rendering-hoist-jsx`**
>
> Extract static JSX outside components to avoid re-creation.
>
> ```tsx
> // Incorrect (recreates element every render):
> function LoadingSkeleton() {
>   return <div className="animate-pulse h-20 bg-gray-200" />
> }
>
> // Correct (reuses same element):
> const loadingSkeleton = (
>   <div className="animate-pulse h-20 bg-gray-200" />
> )
>
> function Container() {
>   return <div>{loading && loadingSkeleton}</div>
> }
> ```
>
> This is especially helpful for large and static SVG nodes, which can be expensive to recreate on every render.

### ผลลัพธ์หลังแก้ไข

- ไม่สร้าง object ใหม่ในทุก render
- Referential equality คงที่ (same object reference)
- เหมาะสำหรับการใช้กับ `React.memo()` ในอนาคต

---

## 4. Missing React.memo for ElectionCard

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `app/(student)/DashboardClient.tsx` |
| **บรรทัด** | 20-96 |
| **Rule** | `rerender-memo` |
| **Impact** | MEDIUM (enables early returns) |
| **Category** | Re-render Optimization |

### ปัญหา

`ElectionCard` component ไม่มี memoization ทำให้:
- Re-render ทุกครั้งที่ parent (`DashboardClient`) render
- `election.positions.filter()` ถูกคำนวณใหม่ทุก render
- เมื่อมีหลาย cards จะเกิด unnecessary re-renders มากขึ้น

### โค้ดปัจจุบัน (ไม่ดี)

```typescript
// app/(student)/DashboardClient.tsx:20-96
function ElectionCard({ election }: { election: ElectionWithDetails }) {
  const router = useRouter();

  // คำนวณใหม่ทุก render!
  const enabledPositions = election.positions.filter((p) => p.enabled);
  const hasCandidates = election.candidates.length > 0;

  return (
    <article className="group relative flex flex-col ...">
      {/* ... */}
    </article>
  );
}
```

### โค้ดที่แก้ไขแล้ว (ดี)

```typescript
// app/(student)/DashboardClient.tsx
import { memo, useMemo } from "react";

// ใช้ React.memo เพื่อป้องกัน re-render เมื่อ props ไม่เปลี่ยน
const ElectionCard = memo(function ElectionCard({
  election,
}: {
  election: ElectionWithDetails;
}) {
  const router = useRouter();

  // useMemo เพื่อ cache ผลลัพธ์ของ filter
  const enabledPositions = useMemo(
    () => election.positions.filter((p) => p.enabled),
    [election.positions]
  );

  // primitive value ไม่ต้องใช้ useMemo
  const hasCandidates = election.candidates.length > 0;

  return (
    <article className="group relative flex flex-col ...">
      {/* ... */}
    </article>
  );
});

// Export component ที่ถูก memoize แล้ว
export { ElectionCard };
```

### หลักการจาก Vercel Best Practices

> **Rule: `rerender-memo`**
>
> Extract expensive work into memoized components to enable early returns before computation.
>
> ```tsx
> // Incorrect (computes avatar even when loading):
> function Profile({ user, loading }: Props) {
>   const avatar = useMemo(() => {
>     const id = computeAvatarId(user)
>     return <Avatar id={id} />
>   }, [user])
>
>   if (loading) return <Skeleton />
>   return <div>{avatar}</div>
> }
>
> // Correct (skips computation when loading):
> const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
>   const id = useMemo(() => computeAvatarId(user), [user])
>   return <Avatar id={id} />
> })
>
> function Profile({ user, loading }: Props) {
>   if (loading) return <Skeleton />
>   return <div><UserAvatar user={user} /></div>
> }
> ```

### ผลลัพธ์หลังแก้ไข

- ElectionCard re-render เฉพาะเมื่อ `election` prop เปลี่ยน
- `enabledPositions` ไม่ต้องคำนวณใหม่ถ้า `election.positions` ไม่เปลี่ยน
- Performance ดีขึ้นเมื่อมี elections หลายรายการ

---

## 5. Waterfall Pattern in Admin Results Page

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `app/admin/results/page.tsx` |
| **บรรทัด** | 25-57 |
| **Rule** | `async-parallel` |
| **Impact** | CRITICAL (2-10× improvement) |
| **Category** | Eliminating Waterfalls |

### ปัญหา

มี waterfall หลายชั้น:
1. **Loop Level:** แต่ละ election ถูก process ทีละตัว
2. **Inside Loop:** `getVoterTurnout` และ `getPositionWinner` ถูกเรียกแบบ sequential

```
Election 1:
  getElectionById ──────▶
                         getVoterTurnout ──────▶
                                                getPositionWinner ──────▶
Election 2:
  getElectionById ──────▶
                         getVoterTurnout ──────▶
                                                getPositionWinner ──────▶
...
Total: N × (3 × request_time)
```

### โค้ดปัจจุบัน (ไม่ดี)

```typescript
// app/admin/results/page.tsx:25-57
for (const electionRow of elections) {
  // Sequential: ต้องรอ getElectionById เสร็จก่อน
  const election = await getElectionById(electionRow.id);
  if (!election) continue;

  const status = calculateStatus(
    new Date(election.start_date),
    new Date(election.end_date)
  );

  // Sequential: ต้องรอ getVoterTurnout เสร็จก่อน
  const turnout = await getVoterTurnout(election.id, totalEligible);

  const enabledPositions = election.positions.filter((p) => p.enabled);
  let primaryWinner = null;

  if (enabledPositions.length > 0) {
    // Sequential: ต้องรอ getPositionWinner เสร็จ
    primaryWinner = await getPositionWinner(
      election.id,
      enabledPositions[0].id,
      enabledPositions[0].title
    );
  }

  summaries.push({
    election,
    turnout,
    primaryWinner,
    status,
  });
}
```

### โค้ดที่แก้ไขแล้ว (ดี)

```typescript
// app/admin/results/page.tsx

// ขั้นตอนที่ 1: Fetch election details พร้อมกันทั้งหมด
const electionsWithDetails = await Promise.all(
  elections.map((row) => getElectionById(row.id))
);

// กรอง null ออก
const validElections = electionsWithDetails.filter(
  (e): e is NonNullable<typeof e> => e !== null
);

// ขั้นตอนที่ 2: สร้าง summaries พร้อมกัน
const summaries = await Promise.all(
  validElections.map(async (election) => {
    const status = calculateStatus(
      new Date(election.start_date),
      new Date(election.end_date)
    );

    const enabledPositions = election.positions.filter((p) => p.enabled);

    // Parallel: fetch turnout และ winner พร้อมกัน
    const [turnout, primaryWinner] = await Promise.all([
      getVoterTurnout(election.id, totalEligible),
      enabledPositions.length > 0
        ? getPositionWinner(
            election.id,
            enabledPositions[0].id,
            enabledPositions[0].title
          )
        : Promise.resolve(null),
    ]);

    return {
      election,
      turnout,
      primaryWinner,
      status,
    };
  })
);
```

### หลักการจาก Vercel Best Practices

> **Rule: `async-parallel`**
>
> When async operations have no interdependencies, execute them concurrently using `Promise.all()`.

### ผลลัพธ์หลังแก้ไข

```
All Elections (parallel):
  Election 1: getElectionById ──────▶
  Election 2: getElectionById ──────▶  } ~200ms
  Election 3: getElectionById ──────▶

All Turnouts + Winners (parallel):
  Turnout 1 + Winner 1 ──────▶
  Turnout 2 + Winner 2 ──────▶  } ~200ms
  Turnout 3 + Winner 3 ──────▶

Total: ~400ms (vs 1800ms before with 3 elections)
```

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| 3 Elections | 1800ms | 400ms | **4.5×** |
| 5 Elections | 3000ms | 400ms | **7.5×** |
| 10 Elections | 6000ms | 400ms | **15×** |

---

## สรุปผลกระทบรวม

| # | Rule | Impact | Category | Expected Improvement |
|---|------|--------|----------|---------------------|
| 1 | `async-parallel` | CRITICAL | Waterfalls | 2-10× latency reduction |
| 2 | `bundle-dynamic-imports` | CRITICAL | Bundle Size | ~500KB reduction, faster TTI |
| 3 | `rendering-hoist-jsx` | LOW | Rendering | Fewer allocations |
| 4 | `rerender-memo` | MEDIUM | Re-renders | Prevent unnecessary renders |
| 5 | `async-parallel` | CRITICAL | Waterfalls | 5-15× latency reduction |

## ลำดับความสำคัญในการแก้ไข

1. **ข้อ 5** - Admin Results Page (ผลกระทบสูงสุด, ใช้บ่อย)
2. **ข้อ 1** - Election Results Page (ผลกระทบสูง)
3. **ข้อ 2** - Dynamic Import Recharts (ลด bundle size)
4. **ข้อ 4** - Memoize ElectionCard (Student-facing)
5. **ข้อ 3** - Hoist StatusBadge styles (Quick win)

---

## อ้างอิง

- **Vercel React Best Practices Skill:** `.claude/skills/vercel-react-best-practices/`
- **Rule Files:**
  - `rules/async-parallel.md`
  - `rules/bundle-dynamic-imports.md`
  - `rules/rendering-hoist-jsx.md`
  - `rules/rerender-memo.md`
- **Next.js Documentation:** https://nextjs.org/docs/app/building-your-application/optimizing
