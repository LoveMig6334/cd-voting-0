"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import {
  approveVotingRight,
  bulkApproveVotingRights,
  bulkRevokeVotingRights,
  createStudent,
  deleteStudent,
  importStudents,
  revokeVotingRight,
  StudentStats,
} from "@/lib/actions/students";
import { StudentRow } from "@/lib/db";
import { canApproveVotingRights, canManageStudents } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useRequireAdmin } from "../AdminLayoutClient";

// ============================================
// Types
// ============================================

export interface StudentWithHistory extends StudentRow {
  votedIn: number[];
}

interface StudentsClientProps {
  students: StudentWithHistory[];
  stats: StudentStats;
  classrooms: string[];
}

// ============================================
// Status Badge Component
// ============================================

interface VotingStatusBadgeProps {
  approved: boolean;
  onClick?: () => void;
  canManage: boolean;
}

function VotingStatusBadge({
  approved,
  onClick,
  canManage,
}: VotingStatusBadgeProps) {
  const commonClasses =
    "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 transition-transform active:scale-95 select-none";

  if (approved) {
    return (
      <span
        onClick={canManage ? onClick : undefined}
        className={`${commonClasses} bg-green-100 text-green-700 ${canManage ? "cursor-pointer hover:bg-green-200" : "cursor-default"}`}
      >
        <span className="material-symbols-outlined text-sm">verified</span>
        อนุมัติสิทธิ์แล้ว
      </span>
    );
  }
  return (
    <span
      onClick={canManage ? onClick : undefined}
      className={`${commonClasses} bg-amber-100 text-amber-700 ${canManage ? "cursor-pointer hover:bg-amber-200" : "cursor-default"}`}
    >
      <span className="material-symbols-outlined text-sm">touch_app</span>
      กดอนุมัติ
    </span>
  );
}

// ============================================
// Add Student Modal
// ============================================

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddStudentModal({ isOpen, onClose }: AddStudentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    id: "",
    no: "",
    prefix: "เด็กชาย",
    name: "",
    surname: "",
    classroom: "",
    nationalId: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (
      !formData.id ||
      !formData.name ||
      !formData.surname ||
      !formData.classroom ||
      !formData.nationalId
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (!/^\d{4}$/.test(formData.id)) {
      setError("รหัสนักเรียนต้องเป็นตัวเลข 4 หลักเท่านั้น");
      return;
    }

    if (!/^\d+\/\d+$/.test(formData.classroom)) {
      setError("ห้องเรียนต้องอยู่ในรูปแบบ ตัวเลข/ตัวเลข (เช่น 3/1)");
      return;
    }

    if (formData.nationalId.length !== 13) {
      setError("เลขประจำตัวประชาชนต้องมี 13 หลัก");
      return;
    }

    startTransition(async () => {
      const result = await createStudent({
        id: formData.id,
        nationalId: formData.nationalId,
        prefix: formData.prefix,
        name: formData.name,
        surname: formData.surname,
        studentNo: parseInt(formData.no) || undefined,
        classRoom: formData.classroom,
      });

      if (result.success) {
        setFormData({
          id: "",
          no: "",
          prefix: "เด็กชาย",
          name: "",
          surname: "",
          classroom: "",
          nationalId: "",
        });
        onClose();
        router.refresh();
      } else {
        setError(result.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            เพิ่มนักเรียนใหม่
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รหัสนักเรียน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.id}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData(prev => ({ ...prev, id: value }));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                placeholder="เช่น 6367"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เลขที่
              </label>
              <input
                type="number"
                min="1"
                value={formData.no}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || parseInt(value) >= 1) {
                    setFormData(prev => ({ ...prev, no: value }));
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="เช่น 1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              คำนำหน้า <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.prefix}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, prefix: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="เด็กชาย">เด็กชาย</option>
              <option value="เด็กหญิง">เด็กหญิง</option>
              <option value="นาย">นาย</option>
              <option value="นางสาว">นางสาว</option>
              <option value="นาง">นาง</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="ชื่อ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, surname: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="นามสกุล"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ห้อง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.classroom}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, classroom: e.target.value }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="เช่น 3/1 หรือ 6/2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              เลขประจำตัวประชาชน <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={13}
              value={formData.nationalId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nationalId: e.target.value.replace(/\D/g, ""),
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              placeholder="1234567890123"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? "กำลังบันทึก..." : "เพิ่มนักเรียน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Import JSON Modal
// ============================================

interface RawStudentData {
  id: string | number;
  no?: number;
  prefix?: string;
  name: string;
  surname: string;
  classroom: string;
  nationalId: string;
}

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ImportJsonModal({ isOpen, onClose }: ImportJsonModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [jsonText, setJsonText] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    count: number;
    valid: boolean;
  } | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleTextChange = (text: string) => {
    setJsonText(text);
    setError("");
    setResult(null);

    if (!text.trim()) {
      setPreview(null);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setPreview({ count: parsed.length, valid: true });
      } else {
        setError("ข้อมูลต้องเป็น Array");
        setPreview(null);
      }
    } catch {
      setError("รูปแบบ JSON ไม่ถูกต้อง");
      setPreview(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      handleTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!preview?.valid) return;

    startTransition(async () => {
      try {
        const rawData: RawStudentData[] = JSON.parse(jsonText);
        const formattedData = rawData.map((d) => ({
          id: String(d.id),
          nationalId: d.nationalId,
          prefix: d.prefix,
          name: d.name,
          surname: d.surname,
          studentNo: d.no,
          classRoom: d.classroom,
        }));

        const importResult = await importStudents(formattedData, { overwrite });
        setResult(importResult);

        if (importResult.imported > 0 && importResult.errors.length === 0) {
          setTimeout(() => {
            setJsonText("");
            setPreview(null);
            setResult(null);
            onClose();
            router.refresh();
          }, 2000);
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }
    });
  };

  const handleClose = () => {
    setJsonText("");
    setPreview(null);
    setError("");
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full animate-slide-up max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            นำเข้าข้อมูล JSON
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium mb-1">รูปแบบ JSON ที่รองรับ:</p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded block overflow-x-auto">
              {`[{ "classroom": "3/1", "no": 1, "id": 6308, "prefix": "เด็กชาย", "name": "ชื่อ", "surname": "นามสกุล", "nationalId": "1234567890123" }]`}
            </code>
            <p className="mt-2 text-xs text-blue-600">
              คำนำหน้า (prefix) รองรับ: เด็กชาย, เด็กหญิง, นาย, นางสาว, นาง
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              อัปโหลดไฟล์ JSON
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {/* JSON Text Area */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              หรือ Paste JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full h-40 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder='[{ "classroom": "3/1", ... }]'
            />
          </div>

          {/* Overwrite Option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
            />
            <span className="text-sm text-slate-600">
              เขียนทับข้อมูลนักเรียนที่มีรหัสซ้ำ
            </span>
          </label>

          {/* Preview */}
          {preview && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              พบข้อมูลนักเรียน {preview.count} คน พร้อมนำเข้า
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${result.errors.length > 0 ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-green-50 border border-green-200 text-green-700"}`}
            >
              <p className="font-medium">ผลการนำเข้า:</p>
              <ul className="list-disc list-inside mt-1">
                <li>นำเข้าสำเร็จ: {result.imported} คน</li>
                <li>ข้าม: {result.skipped} คน</li>
                {result.errors.length > 0 && (
                  <li>ข้อผิดพลาด: {result.errors.join(", ")}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            ปิด
          </button>
          <button
            onClick={handleImport}
            disabled={!preview?.valid || isPending}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Student Detail Modal
// ============================================

interface StudentDetailModalProps {
  student: StudentWithHistory | null;
  onClose: () => void;
}

function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  const router = useRouter();
  const admin = useRequireAdmin();
  const [isPending, startTransition] = useTransition();

  if (!student) return null;

  const handleApprove = () => {
    startTransition(async () => {
      await approveVotingRight(student.id, admin.displayName || admin.username);
      router.refresh();
      onClose();
    });
  };

  const handleRevoke = () => {
    startTransition(async () => {
      await revokeVotingRight(student.id);
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">โปรไฟล์นักเรียน</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">
                person
              </span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">
                {student.name} {student.surname}
              </h4>
              <p className="text-slate-500 font-mono">รหัส: {student.id}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                ห้อง
              </p>
              <p className="text-sm font-medium text-slate-900">
                ม.{student.class_room}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                เลขที่
              </p>
              <p className="text-sm font-medium text-slate-900">
                {student.student_no || "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                สิทธิ์การโหวต
              </p>
              <VotingStatusBadge
                approved={student.voting_approved}
                canManage={false}
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                ลงคะแนนแล้ว
              </p>
              <p className="text-sm font-medium text-slate-900">
                {student.votedIn.length} ครั้ง
              </p>
            </div>
          </div>

          {/* Voting Approval Info */}
          {student.voting_approved && student.voting_approved_at && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-green-600 uppercase font-semibold mb-1">
                อนุมัติสิทธิ์เมื่อ
              </p>
              <p className="text-sm text-green-700">
                {new Date(student.voting_approved_at).toLocaleDateString(
                  "th-TH",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
                {student.voting_approved_by &&
                  ` โดย ${student.voting_approved_by}`}
              </p>
            </div>
          )}

          {/* Voting History */}
          <div>
            <h5 className="text-sm font-semibold text-slate-700 mb-3">
              ประวัติการลงคะแนน
            </h5>
            {student.votedIn.length > 0 ? (
              <ul className="space-y-3">
                {student.votedIn.map((electionId, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-slate-600">
                      ลงคะแนนใน Election ID: {electionId}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">
                ยังไม่มีประวัติการลงคะแนน
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          {student.voting_approved ? (
            <button
              onClick={handleRevoke}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">block</span>
              เพิกถอนสิทธิ์
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">
                verified
              </span>
              อนุมัติสิทธิ์
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function StudentsClient({
  students,
  stats,
  classrooms,
}: StudentsClientProps) {
  const router = useRouter();
  const admin = useRequireAdmin();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithHistory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterClassroom, setFilterClassroom] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending"
  >("all");
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    student: StudentWithHistory | null;
  }>({ isOpen: false, student: null });
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    student: StudentWithHistory | null;
  }>({ isOpen: false, student: null });

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          student.name.toLowerCase().includes(searchLower) ||
          student.surname.toLowerCase().includes(searchLower) ||
          String(student.id).includes(searchQuery) ||
          student.class_room.toLowerCase().includes(searchLower);

        // Classroom filter
        const matchesClassroom =
          !filterClassroom || student.class_room === filterClassroom;

        // Status filter
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "approved" && student.voting_approved) ||
          (filterStatus === "pending" && !student.voting_approved);

        return matchesSearch && matchesClassroom && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by classroom, then by no
        if (a.class_room !== b.class_room) {
          return a.class_room.localeCompare(b.class_room);
        }
        return (a.student_no || 0) - (b.student_no || 0);
      });
  }, [students, searchQuery, filterClassroom, filterStatus]);

  const handleApprove = (studentId: string) => {
    startTransition(async () => {
      await approveVotingRight(studentId, admin.displayName || admin.username);
      router.refresh();
    });
  };

  const handleRevoke = (studentId: string) => {
    startTransition(async () => {
      await revokeVotingRight(studentId);
      router.refresh();
    });
  };

  const handleBulkApprove = () => {
    if (!filterClassroom) return;
    startTransition(async () => {
      await bulkApproveVotingRights(
        filterClassroom,
        admin.displayName || admin.username,
      );
      router.refresh();
    });
  };

  const handleBulkRevoke = () => {
    if (!filterClassroom) return;
    startTransition(async () => {
      await bulkRevokeVotingRights(filterClassroom);
      router.refresh();
    });
  };

  const handleDeleteStudent = () => {
    const studentToDelete = deleteConfirmModal.student;
    if (!studentToDelete) return;
    startTransition(async () => {
      await deleteStudent(studentToDelete.id);
      setDeleteConfirmModal({ isOpen: false, student: null });
      router.refresh();
    });
  };

  const handleStatusClick = (student: StudentWithHistory) => {
    setStatusConfirmModal({
      isOpen: true,
      student,
    });
  };

  const handleConfirmStatusChange = () => {
    const student = statusConfirmModal.student;
    if (!student) return;

    if (student.voting_approved) {
      handleRevoke(student.id);
    } else {
      handleApprove(student.id);
    }
    setStatusConfirmModal({ isOpen: false, student: null });
  };

  // Check if current admin can manage students (only levels 0 and 1)
  const userCanManageStudents = canManageStudents(admin.accessLevel);
  // Check if current admin can approve/revoke voting rights (levels 0, 1, and 2)
  const userCanApproveVotingRights = canApproveVotingRights(admin.accessLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            ฐานข้อมูลนักเรียน
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            จัดการนักเรียนและยืนยันสิทธิ์การลงคะแนน • ทั้งหมด {stats.total} คน
          </p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          {userCanManageStudents && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">
                  upload_file
                </span>
                นำเข้า JSON
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">
                  person_add
                </span>
                เพิ่มนักเรียน
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">
                groups
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">นักเรียนทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">
                verified
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.approved}
              </p>
              <p className="text-xs text-slate-500">อนุมัติสิทธิ์แล้ว</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600">
                pending
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats.pending}
              </p>
              <p className="text-xs text-slate-500">รอการอนุมัติ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600">
                school
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {classrooms.length}
              </p>
              <p className="text-xs text-slate-500">ห้องเรียน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {filterClassroom && userCanApproveVotingRights && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-slate-600">
            ดำเนินการกับห้อง <strong>ม.{filterClassroom}</strong> ทั้งหมด:
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            อนุมัติทั้งห้อง
          </button>
          <button
            onClick={handleBulkRevoke}
            disabled={isPending}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">block</span>
            เพิกถอนทั้งห้อง
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ, รหัส, หรือห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Classroom Filter */}
          <select
            value={filterClassroom}
            onChange={(e) => setFilterClassroom(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">ทุกห้อง</option>
            {classrooms.map((classroom) => (
              <option key={classroom} value={classroom}>
                ม.{classroom}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "all" | "approved" | "pending")
            }
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="approved">อนุมัติสิทธิ์แล้ว</option>
            <option value="pending">รอการอนุมัติ</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  เลขที่
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  รหัสนักเรียน
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ชื่อ-นามสกุล
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ห้อง
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  สิทธิ์โหวต
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {student.student_no || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-900">
                      {student.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
                      {student.name} {student.surname}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    ม.{student.class_room}
                  </td>
                  <td className="px-6 py-4">
                    <VotingStatusBadge
                      approved={student.voting_approved}
                      onClick={() => handleStatusClick(student)}
                      canManage={userCanApproveVotingRights}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                      >
                        ดูประวัติ
                      </button>
                      {userCanManageStudents && (
                        <button
                          onClick={() =>
                            setDeleteConfirmModal({ isOpen: true, student })
                          }
                          disabled={isPending}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="ลบนักเรียน"
                        >
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
              person_search
            </span>
            <p className="text-slate-500">ไม่พบนักเรียน</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ImportJsonModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, student: null })}
        onConfirm={handleDeleteStudent}
        title="ยืนยันการลบนักเรียน"
        message={
          deleteConfirmModal.student
            ? `คุณต้องการลบนักเรียน ${deleteConfirmModal.student.name} ${deleteConfirmModal.student.surname} (รหัส: ${deleteConfirmModal.student.id}) ออกจากระบบหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
            : ""
        }
        confirmText="ลบนักเรียน"
        cancelText="ยกเลิก"
        variant="danger"
      />

      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        onClose={() => setStatusConfirmModal({ isOpen: false, student: null })}
        onConfirm={handleConfirmStatusChange}
        title={
          statusConfirmModal.student?.voting_approved
            ? "ยืนยันการเพิกถอนสิทธิ์"
            : "ยืนยันการอนุมัติสิทธิ์"
        }
        message={
          statusConfirmModal.student
            ? statusConfirmModal.student.voting_approved
              ? `คุณต้องการเพิกถอนสิทธิ์การลงคะแนนของ ${statusConfirmModal.student.name} ${statusConfirmModal.student.surname} หรือไม่?`
              : `คุณต้องการอนุมัติสิทธิ์การลงคะแนนให้ ${statusConfirmModal.student.name} ${statusConfirmModal.student.surname} หรือไม่?`
            : ""
        }
        confirmText={
          statusConfirmModal.student?.voting_approved
            ? "เพิกถอนสิทธิ์"
            : "อนุมัติสิทธิ์"
        }
        cancelText="ยกเลิก"
        variant={
          statusConfirmModal.student?.voting_approved ? "danger" : "success"
        }
      />
    </div>
  );
}
