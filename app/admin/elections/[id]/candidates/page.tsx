"use client";

import { useElection } from "@/components/ElectionContext";
import { logAdminAction, logElectionChange } from "@/lib/activity-store";
import {
  DEFAULT_AVATAR_URL,
  getNextCandidateRank,
  isCandidateNameDuplicate,
} from "@/lib/election-store";
import { ElectionCandidate, Position } from "@/lib/election-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// Edit Election Details Modal (Title, Description, Dates)
function EditElectionModal({
  election,
  onClose,
  onSave,
}: {
  election: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  };
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState(election.title);
  const [description, setDescription] = useState(election.description);
  const [startDate, setStartDate] = useState(
    new Date(election.startDate).toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(
    new Date(election.endDate).toISOString().slice(0, 16),
  );
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError("กรุณากรอกชื่อการเลือกตั้ง");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("วันสิ้นสุดต้องมากกว่าวันเริ่มต้น");
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            แก้ไขข้อมูลการเลือกตั้ง
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ชื่อการเลือกตั้ง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              รายละเอียด
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                วันเริ่มต้น <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                วันสิ้นสุด <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Candidate Modal
function EditCandidateModal({
  candidate,
  onClose,
  onSave,
}: {
  candidate: ElectionCandidate;
  onClose: () => void;
  onSave: (data: Partial<ElectionCandidate>) => void;
}) {
  const [name, setName] = useState(candidate.name);
  const [slogan, setSlogan] = useState(candidate.slogan);
  const [imageUrl, setImageUrl] = useState(candidate.imageUrl);
  const [rank, setRank] = useState(candidate.rank);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      slogan: slogan.trim(),
      imageUrl: imageUrl.trim(),
      rank,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">แก้ไขผู้สมัคร</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full bg-cover bg-center border-4 border-slate-100"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              คำขวัญ/นโยบาย
            </label>
            <textarea
              rows={2}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL รูปโปรไฟล์
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              หมายเลขผู้สมัคร
            </label>
            <input
              type="number"
              min={1}
              value={rank}
              onChange={(e) => setRank(parseInt(e.target.value) || 1)}
              className="w-24 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:bg-slate-300"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Candidate Modal
function AddCandidateModal({
  electionId,
  positionId,
  positionTitle,
  initialRank,
  onClose,
  onAdd,
}: {
  electionId: string;
  positionId: string;
  positionTitle: string;
  initialRank: number;
  onClose: () => void;
  onAdd: (candidate: Omit<ElectionCandidate, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rank, setRank] = useState(initialRank);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("กรุณากรอกชื่อผู้สมัคร");
      return;
    }

    // Check for duplicate name in same position
    if (isCandidateNameDuplicate(electionId, positionId, name.trim())) {
      setError("ผู้สมัครชื่อนี้มีอยู่แล้วในตำแหน่งนี้");
      return;
    }

    onAdd({
      positionId,
      name: name.trim(),
      slogan: slogan.trim(),
      imageUrl: imageUrl.trim() || DEFAULT_AVATAR_URL,
      rank,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">เพิ่มผู้สมัคร</h3>
            <p className="text-sm text-slate-500">{positionTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ชื่อผู้สมัคร"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              คำขวัญ/นโยบาย
            </label>
            <textarea
              rows={2}
              placeholder="คำขวัญหรือนโยบายหลัก"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL รูปโปรไฟล์
            </label>
            <input
              type="text"
              placeholder="https://example.com/image.jpg (ไม่บังคับ)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              หมายเลขผู้สมัคร
            </label>
            <input
              type="number"
              min={1}
              value={rank}
              onChange={(e) => setRank(parseInt(e.target.value) || 1)}
              className="w-24 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            เพิ่มผู้สมัคร
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Custom Position Modal
function AddPositionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (title: string, icon: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("star");

  const icons = [
    { value: "star", label: "ดาว" },
    { value: "workspace_premium", label: "เหรียญ" },
    { value: "emoji_events", label: "ถ้วย" },
    { value: "groups", label: "กลุ่ม" },
    { value: "school", label: "โรงเรียน" },
    { value: "palette", label: "ศิลปะ" },
    { value: "science", label: "วิทยาศาสตร์" },
    { value: "book", label: "หนังสือ" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-slide-up">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">เพิ่มตำแหน่งใหม่</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ชื่อตำแหน่ง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น ประธานชมรมศิลปะ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ไอคอน
            </label>
            <div className="grid grid-cols-4 gap-2">
              {icons.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setIcon(item.value)}
                  className={`p-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                    icon === item.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {item.value}
                  </span>
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              if (title.trim()) {
                onAdd(title.trim(), icon);
                onClose();
              }
            }}
            disabled={!title.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:bg-slate-300"
          >
            เพิ่มตำแหน่ง
          </button>
        </div>
      </div>
    </div>
  );
}

// Position Card Component
function PositionCard({
  position,
  candidates,
  isLocked,
  onToggle,
  onAddCandidate,
  onEditCandidate,
  onDeleteCandidate,
}: {
  position: Position;
  candidates: ElectionCandidate[];
  isLocked: boolean;
  onToggle: () => void;
  onAddCandidate: () => void;
  onEditCandidate: (candidate: ElectionCandidate) => void;
  onDeleteCandidate: (candidateId: string) => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
        position.enabled ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}
    >
      {/* Position Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              position.enabled
                ? "bg-primary/10 text-primary"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <span className="material-symbols-outlined">{position.icon}</span>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{position.title}</h4>
            <p className="text-xs text-slate-500">
              {candidates.length} ผู้สมัคร
              {position.isCustom && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                  กำหนดเอง
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={isLocked}
          title={
            isLocked
              ? "ไม่สามารถแก้ไขได้ - การเลือกตั้งเริ่มต้นแล้ว"
              : undefined
          }
          className={`relative w-12 h-6 rounded-full transition-colors ${
            position.enabled ? "bg-primary" : "bg-slate-300"
          } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              position.enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* Candidates List */}
      {position.enabled && (
        <div className="p-4">
          {candidates.length > 0 ? (
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className="w-10 h-10 rounded-full bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${candidate.imageUrl})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold">
                        #{candidate.rank}
                      </span>
                      <span className="font-medium text-slate-900 truncate">
                        {candidate.name}
                      </span>
                    </div>
                    {candidate.slogan && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {candidate.slogan}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditCandidate(candidate)}
                      disabled={isLocked}
                      title={
                        isLocked
                          ? "ไม่สามารถแก้ไขได้ - การเลือกตั้งเริ่มต้นแล้ว"
                          : "แก้ไข"
                      }
                      className={`p-1.5 text-slate-400 rounded-lg transition-colors ${
                        isLocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:text-primary hover:bg-primary/10"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => onDeleteCandidate(candidate.id)}
                      disabled={isLocked}
                      title={
                        isLocked
                          ? "ไม่สามารถลบได้ - การเลือกตั้งเริ่มต้นแล้ว"
                          : "ลบ"
                      }
                      className={`p-1.5 text-slate-400 rounded-lg transition-colors ${
                        isLocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              ยังไม่มีผู้สมัครในตำแหน่งนี้
            </p>
          )}

          <button
            onClick={onAddCandidate}
            disabled={isLocked}
            title={
              isLocked
                ? "ไม่สามารถเพิ่มผู้สมัครได้ - การเลือกตั้งเริ่มต้นแล้ว"
                : undefined
            }
            className={`w-full mt-3 py-2.5 border border-dashed rounded-lg text-sm flex items-center justify-center gap-2 transition-colors ${
              isLocked
                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                : "border-slate-300 text-slate-600 hover:border-primary hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            เพิ่มผู้สมัคร
          </button>
        </div>
      )}
    </div>
  );
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CandidateManagement() {
  const params = useParams();
  const electionId = params.id as string;

  const {
    election,
    updateElection,
    togglePosition,
    addCustomPosition,
    addCandidate,
    updateCandidate,
    deleteCandidate,
  } = useElection(electionId);

  const [showAddCandidate, setShowAddCandidate] = useState<{
    positionId: string;
    positionTitle: string;
  } | null>(null);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showEditElection, setShowEditElection] = useState(false);
  const [editingCandidate, setEditingCandidate] =
    useState<ElectionCandidate | null>(null);

  if (!election) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
          search_off
        </span>
        <h3 className="text-lg font-semibold text-slate-900">
          ไม่พบการเลือกตั้ง
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          การเลือกตั้งนี้อาจถูกลบไปแล้ว
        </p>
        <Link
          href="/admin/elections"
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          กลับไปหน้าจัดการ
        </Link>
      </div>
    );
  }

  // Check if election is locked (open or closed status)
  const isLocked = election.status !== "draft";

  const getCandidatesForPosition = (positionId: string) => {
    return election.candidates.filter((c) => c.positionId === positionId);
  };

  const handleAddCandidate = (candidate: Omit<ElectionCandidate, "id">) => {
    addCandidate(electionId, candidate);
    // Log activity
    logAdminAction(
      "เพิ่มผู้สมัคร",
      `${candidate.name} ในการเลือกตั้ง ${election?.title}`,
    );
  };

  const handleEditCandidate = (
    candidateId: string,
    data: Partial<ElectionCandidate>,
  ) => {
    const candidateName =
      election?.candidates.find((c) => c.id === candidateId)?.name ||
      data.name ||
      "Unknown";
    updateCandidate(electionId, candidateId, data);
    // Log activity
    logAdminAction(
      "แก้ไขผู้สมัคร",
      `${candidateName} ในการเลือกตั้ง ${election?.title}`,
    );
  };

  const handleDeleteCandidate = (candidateId: string) => {
    const candidateName =
      election?.candidates.find((c) => c.id === candidateId)?.name || "Unknown";
    if (confirm("ต้องการลบผู้สมัครนี้หรือไม่?")) {
      deleteCandidate(electionId, candidateId);
      // Log activity after successful deletion
      logAdminAction(
        "ลบผู้สมัคร",
        `${candidateName} ในการเลือกตั้ง ${election?.title}`,
      );
    }
  };

  const handleAddPosition = (title: string, icon: string) => {
    addCustomPosition(electionId, title, icon);
    // Log activity
    logAdminAction(
      "เพิ่มตำแหน่ง",
      `${title} ในการเลือกตั้ง ${election?.title}`,
    );
  };

  const handleUpdateElection = (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }) => {
    updateElection(electionId, data);
    // Log activity
    logElectionChange("แก้ไขการเลือกตั้ง", election?.title || data.title);
  };

  // Handler for toggling position with logging
  const handleTogglePosition = (positionId: string) => {
    const position = election?.positions.find((p) => p.id === positionId);
    togglePosition(electionId, positionId);
    // Log activity
    if (position) {
      logAdminAction(
        position.enabled ? "ปิดตำแหน่ง" : "เปิดตำแหน่ง",
        `${position.title} ในการเลือกตั้ง ${election?.title}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Lock Warning Banner */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">
            warning
          </span>
          <div>
            <p className="font-medium text-amber-800">
              การเลือกตั้งเริ่มต้นแล้ว - ไม่สามารถแก้ไขตำแหน่งและผู้สมัครได้
            </p>
            <p className="text-sm text-amber-700 mt-1">
              หากต้องการแก้ไข กรุณาเลื่อนวันเริ่มต้นออกไปก่อน
              โดยคลิกปุ่มแก้ไขที่หัวข้อการเลือกตั้ง
            </p>
          </div>
        </div>
      )}

      {/* Header with Edit Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/admin/elections"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mt-1"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  {election.title}
                </h2>
                <button
                  onClick={() => setShowEditElection(true)}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="แก้ไขข้อมูล"
                >
                  <span className="material-symbols-outlined text-xl">
                    edit
                  </span>
                </button>
                {/* Status Badge */}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    election.status === "draft"
                      ? "bg-slate-100 text-slate-600"
                      : election.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {election.status === "draft"
                    ? "ฉบับร่าง"
                    : election.status === "open"
                      ? "เปิดรับโหวต"
                      : "ปิดแล้ว"}
                </span>
              </div>
              {election.description && (
                <p className="text-slate-600 text-sm mt-1">
                  {election.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg">
                    calendar_today
                  </span>
                  <span>เริ่ม: {formatDate(election.startDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg">
                    event_busy
                  </span>
                  <span>สิ้นสุด: {formatDate(election.endDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg">
                    groups
                  </span>
                  <span>{election.candidates.length} ผู้สมัคร</span>
                </div>
              </div>
            </div>
          </div>
          {/* Hide Add Position button when locked */}
          {!isLocked && (
            <button
              onClick={() => setShowAddPosition(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 self-start"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              เพิ่มตำแหน่งใหม่
            </button>
          )}
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {election.positions.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            candidates={getCandidatesForPosition(position.id)}
            isLocked={isLocked}
            onToggle={() => handleTogglePosition(position.id)}
            onAddCandidate={() =>
              setShowAddCandidate({
                positionId: position.id,
                positionTitle: position.title,
              })
            }
            onEditCandidate={(candidate) => setEditingCandidate(candidate)}
            onDeleteCandidate={handleDeleteCandidate}
          />
        ))}
      </div>

      {election.positions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
            category
          </span>
          <p className="text-slate-500">ยังไม่มีตำแหน่ง</p>
          <p className="text-slate-400 text-sm mt-1">
            คลิก &quot;เพิ่มตำแหน่งใหม่&quot; เพื่อเริ่มต้น
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href="/admin/elections"
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">check</span>
          เสร็จสิ้น
        </Link>
      </div>

      {/* Modals */}
      {showAddCandidate && (
        <AddCandidateModal
          electionId={electionId}
          positionId={showAddCandidate.positionId}
          positionTitle={showAddCandidate.positionTitle}
          initialRank={getNextCandidateRank(
            electionId,
            showAddCandidate.positionId,
          )}
          onClose={() => setShowAddCandidate(null)}
          onAdd={handleAddCandidate}
        />
      )}

      {showAddPosition && (
        <AddPositionModal
          onClose={() => setShowAddPosition(false)}
          onAdd={handleAddPosition}
        />
      )}

      {showEditElection && (
        <EditElectionModal
          election={{
            title: election.title,
            description: election.description,
            startDate: election.startDate,
            endDate: election.endDate,
          }}
          onClose={() => setShowEditElection(false)}
          onSave={handleUpdateElection}
        />
      )}

      {editingCandidate && (
        <EditCandidateModal
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSave={(data) => {
            handleEditCandidate(editingCandidate.id, data);
            setEditingCandidate(null);
          }}
        />
      )}
    </div>
  );
}
