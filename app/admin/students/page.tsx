"use client";

import {
  useStudents,
  type RawStudentData,
  type StudentRecord,
} from "@/components/StudentContext";
import { useMemo, useState } from "react";

// ============================================
// Status Badge Component
// ============================================

function VotingStatusBadge({ approved }: { approved: boolean }) {
  if (approved) {
    return (
      <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">verified</span>
        อนุมัติสิทธิ์แล้ว
      </span>
    );
  }
  return (
    <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
      <span className="material-symbols-outlined text-sm">pending</span>
      รอการอนุมัติ
    </span>
  );
}

// ============================================
// Add Student Modal
// ============================================

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    id: number;
    no: number;
    name: string;
    surname: string;
    classroom: string;
    nationalId: string;
  }) => { success: boolean; error?: string };
}

function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    no: "",
    name: "",
    surname: "",
    classroom: "3/1",
    nationalId: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validation
    if (
      !formData.id ||
      !formData.name ||
      !formData.surname ||
      !formData.nationalId
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      setIsSubmitting(false);
      return;
    }

    if (formData.nationalId.length !== 13) {
      setError("เลขประจำตัวประชาชนต้องมี 13 หลัก");
      setIsSubmitting(false);
      return;
    }

    const result = onAdd({
      id: parseInt(formData.id),
      no: parseInt(formData.no) || 0,
      name: formData.name,
      surname: formData.surname,
      classroom: formData.classroom,
      nationalId: formData.nationalId,
    });

    if (result.success) {
      // Reset form
      setFormData({
        id: "",
        no: "",
        name: "",
        surname: "",
        classroom: "3/1",
        nationalId: "",
      });
      onClose();
    } else {
      setError(result.error || "เกิดข้อผิดพลาด");
    }
    setIsSubmitting(false);
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
                type="number"
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="เช่น 6367"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                เลขที่
              </label>
              <input
                type="number"
                value={formData.no}
                onChange={(e) =>
                  setFormData({ ...formData, no: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="เช่น 1"
              />
            </div>
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
                  setFormData({ ...formData, name: e.target.value })
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
                  setFormData({ ...formData, surname: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="นามสกุล"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ห้อง
            </label>
            <select
              value={formData.classroom}
              onChange={(e) =>
                setFormData({ ...formData, classroom: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="3/1">ม.3/1</option>
              <option value="3/2">ม.3/2</option>
              <option value="3/3">ม.3/3</option>
            </select>
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "กำลังบันทึก..." : "เพิ่มนักเรียน"}
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

interface ImportJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    data: RawStudentData[],
    options?: { overwrite?: boolean },
  ) => {
    imported: number;
    skipped: number;
    errors: string[];
  };
}

function ImportJsonModal({ isOpen, onClose, onImport }: ImportJsonModalProps) {
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

    try {
      const data = JSON.parse(jsonText);
      const importResult = onImport(data, { overwrite });
      setResult(importResult);

      if (importResult.imported > 0 && importResult.errors.length === 0) {
        setTimeout(() => {
          setJsonText("");
          setPreview(null);
          setResult(null);
          onClose();
        }, 2000);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    }
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
              {`[{ "classroom": "3/1", "no": 1, "id": 6308, "name": "ชื่อ", "surname": "นามสกุล", "nationalId": "1234567890123" }]`}
            </code>
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
            disabled={!preview?.valid}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            นำเข้าข้อมูล
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
  student: StudentRecord | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onRevoke: (id: number) => void;
}

function StudentDetailModal({
  student,
  onClose,
  onApprove,
  onRevoke,
}: StudentDetailModalProps) {
  if (!student) return null;

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
                ม.{student.classroom}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                เลขที่
              </p>
              <p className="text-sm font-medium text-slate-900">
                {student.no || "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                สิทธิ์การโหวต
              </p>
              <VotingStatusBadge approved={student.votingApproved} />
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
          {student.votingApproved && student.votingApprovedAt && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-green-600 uppercase font-semibold mb-1">
                อนุมัติสิทธิ์เมื่อ
              </p>
              <p className="text-sm text-green-700">
                {new Date(student.votingApprovedAt).toLocaleDateString(
                  "th-TH",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
                {student.votingApprovedBy && ` โดย ${student.votingApprovedBy}`}
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
          {student.votingApproved ? (
            <button
              onClick={() => {
                onRevoke(student.id);
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">block</span>
              เพิกถอนสิทธิ์
            </button>
          ) : (
            <button
              onClick={() => {
                onApprove(student.id);
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

export default function StudentManagement() {
  const {
    students,
    loading,
    addStudent,
    approveVotingRight,
    revokeVotingRight,
    bulkApproveVotingRights,
    bulkRevokeVotingRights,
    importStudents,
    classrooms,
    stats,
  } = useStudents();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterClassroom, setFilterClassroom] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending"
  >("all");

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
          student.classroom.toLowerCase().includes(searchLower);

        // Classroom filter
        const matchesClassroom =
          !filterClassroom || student.classroom === filterClassroom;

        // Status filter
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "approved" && student.votingApproved) ||
          (filterStatus === "pending" && !student.votingApproved);

        return matchesSearch && matchesClassroom && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by classroom, then by no
        if (a.classroom !== b.classroom) {
          return a.classroom.localeCompare(b.classroom);
        }
        return a.no - b.no;
      });
  }, [students, searchQuery, filterClassroom, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

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
      {filterClassroom && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-slate-600">
            ดำเนินการกับห้อง <strong>ม.{filterClassroom}</strong> ทั้งหมด:
          </span>
          <button
            onClick={() => bulkApproveVotingRights(filterClassroom)}
            className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            อนุมัติทั้งห้อง
          </button>
          <button
            onClick={() => bulkRevokeVotingRights(filterClassroom)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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
                    {student.no || "-"}
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
                    ม.{student.classroom}
                  </td>
                  <td className="px-6 py-4">
                    <VotingStatusBadge approved={student.votingApproved} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {student.votingApproved ? (
                        <button
                          onClick={() => revokeVotingRight(student.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="เพิกถอนสิทธิ์"
                        >
                          <span className="material-symbols-outlined text-lg">
                            block
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => approveVotingRight(student.id)}
                          className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="อนุมัติสิทธิ์"
                        >
                          <span className="material-symbols-outlined text-lg">
                            verified
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors font-medium"
                      >
                        ดูประวัติ
                      </button>
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
        onAdd={addStudent}
      />

      <ImportJsonModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importStudents}
      />

      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onApprove={approveVotingRight}
        onRevoke={revokeVotingRight}
      />
    </div>
  );
}
