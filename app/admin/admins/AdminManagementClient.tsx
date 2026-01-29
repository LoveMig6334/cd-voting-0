"use client";

import {
  createAdmin,
  deleteAdmin,
  resetAdminPassword,
  updateAdmin,
} from "@/lib/actions/admin-auth";
import {
  ACCESS_LEVELS,
  ACCESS_LEVEL_LABELS,
  AccessLevel,
} from "@/lib/admin-types";
import {
  canDeleteAdmin,
  canEditAdmin,
  getCreatableAccessLevels,
} from "@/lib/permissions";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useState, useTransition } from "react";

// Admin data passed from server (without password_hash)
interface AdminData {
  id: number;
  username: string;
  display_name: string | null;
  access_level: number; // Use number to be compatible with AdminRow
  created_at: Date | string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admins: any[]; // Accept any array, will be treated as AdminData
  currentAdminId: number;
  currentAccessLevel: AccessLevel;
}

export function AdminManagementClient({
  admins,
  currentAdminId,
  currentAccessLevel,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    displayName: "",
    accessLevel: ACCESS_LEVELS.TEACHER as AccessLevel,
  });
  const [newPassword, setNewPassword] = useState("");

  const creatableLevels = getCreatableAccessLevels(currentAccessLevel);

  const generatePassword = () => {
    const length = 16;
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_+={}[]|;:"<>,./?';
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "คัดลอกรหัสผ่านแล้ว" });
    // Clear success message after 2 seconds
    setTimeout(() => setMessage(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      displayName: "",
      accessLevel: ACCESS_LEVELS.TEACHER,
    });
    setNewPassword("");
    setSelectedAdmin(null);
  };

  const handleCreate = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await createAdmin(
        formData.username,
        formData.password,
        formData.displayName || undefined,
        formData.accessLevel,
        currentAccessLevel,
      );

      if (result.success) {
        setMessage({ type: "success", text: "สร้าง Admin สำเร็จ" });
        setShowCreateModal(false);
        resetForm();
      } else {
        setMessage({ type: "error", text: result.message || "เกิดข้อผิดพลาด" });
      }
    });
  };

  const handleEdit = () => {
    if (!selectedAdmin) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateAdmin(
        selectedAdmin.id,
        {
          displayName: formData.displayName,
          accessLevel: formData.accessLevel,
        },
        currentAccessLevel,
      );

      if (result.success) {
        setMessage({ type: "success", text: "อัพเดท Admin สำเร็จ" });
        setShowEditModal(false);
        resetForm();
      } else {
        setMessage({ type: "error", text: result.message || "เกิดข้อผิดพลาด" });
      }
    });
  };

  const handleDelete = () => {
    const adminToDelete = selectedAdmin;
    if (!adminToDelete) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAdmin(
        adminToDelete.id,
        currentAdminId,
        currentAccessLevel,
      );

      if (result.success) {
        setMessage({ type: "success", text: "ลบ Admin สำเร็จ" });
        resetForm();
      } else {
        setMessage({ type: "error", text: result.message || "เกิดข้อผิดพลาด" });
      }
    });
  };

  const handleResetPassword = () => {
    if (!selectedAdmin) return;
    setMessage(null);
    startTransition(async () => {
      const result = await resetAdminPassword(
        selectedAdmin.id,
        newPassword,
        currentAccessLevel,
      );

      if (result.success) {
        setMessage({ type: "success", text: "รีเซ็ตรหัสผ่านสำเร็จ" });
        setShowResetPasswordModal(false);
        resetForm();
      } else {
        setMessage({ type: "error", text: result.message || "เกิดข้อผิดพลาด" });
      }
    });
  };

  const openEditModal = (admin: AdminData) => {
    setSelectedAdmin(admin);
    setFormData({
      ...formData,
      displayName: admin.display_name || "",
      accessLevel: admin.access_level as AccessLevel,
    });
    setShowEditModal(true);
  };

  const getLevelBadgeColor = (level: AccessLevel) => {
    switch (level) {
      case ACCESS_LEVELS.ROOT:
        return "bg-red-100 text-red-700 border-red-200";
      case ACCESS_LEVELS.SYSTEM_ADMIN:
        return "bg-blue-100 text-blue-700 border-blue-200";
      case ACCESS_LEVELS.TEACHER:
        return "bg-green-100 text-green-700 border-green-200";
      case ACCESS_LEVELS.OBSERVER:
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">
            จัดการผู้ดูแลระบบ
          </h1>
          <p className="text-cool-gray mt-1">
            จัดการบัญชีผู้ดูแลระบบและสิทธิ์การเข้าถึง
          </p>
        </div>
        {creatableLevels.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">person_add</span>
            เพิ่ม Admin
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span className="material-symbols-outlined">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          {message.text}
        </div>
      )}

      {/* Admin List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-dark-slate">
                  ผู้ใช้
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-dark-slate">
                  ระดับสิทธิ์
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-dark-slate">
                  สร้างเมื่อ
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-dark-slate">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSelf = admin.id === currentAdminId;
                const canDelete =
                  !isSelf &&
                  canDeleteAdmin(currentAccessLevel, admin.access_level);
                const canEdit = canEditAdmin(
                  currentAccessLevel,
                  admin.access_level,
                );

                return (
                  <tr
                    key={admin.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-royal-blue to-cyan-500 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white">
                            person
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-dark-slate">
                            {admin.display_name || admin.username}
                            {isSelf && (
                              <span className="ml-2 text-xs text-cool-gray">
                                (คุณ)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-cool-gray">
                            @{admin.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getLevelBadgeColor(admin.access_level)}`}
                      >
                        {ACCESS_LEVEL_LABELS[admin.access_level]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-cool-gray">
                      {new Date(admin.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditModal(admin)}
                              className="p-2 text-cool-gray hover:text-royal-blue hover:bg-royal-blue/10 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <span className="material-symbols-outlined text-lg">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowResetPasswordModal(true);
                              }}
                              className="p-2 text-cool-gray hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              <span className="material-symbols-outlined text-lg">
                                key
                              </span>
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-cool-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-lg">
                              delete
                            </span>
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-cool-gray">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Level Legend */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-dark-slate mb-4">
          ระดับสิทธิ์การเข้าถึง
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(ACCESS_LEVELS.ROOT)}`}
            >
              0
            </span>
            <div>
              <p className="font-medium text-sm text-dark-slate">Root Admin</p>
              <p className="text-xs text-cool-gray">
                สิทธิ์สูงสุด ทำได้ทุกอย่าง
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(ACCESS_LEVELS.SYSTEM_ADMIN)}`}
            >
              1
            </span>
            <div>
              <p className="font-medium text-sm text-dark-slate">ผู้ดูแลระบบ</p>
              <p className="text-xs text-cool-gray">
                จัดการการเลือกตั้ง, สร้าง Admin ระดับ 2-3
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(ACCESS_LEVELS.TEACHER)}`}
            >
              2
            </span>
            <div>
              <p className="font-medium text-sm text-dark-slate">
                คุณครูประจำชั้น
              </p>
              <p className="text-xs text-cool-gray">
                อนุมัติสิทธิ์โหวตนักเรียน
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(ACCESS_LEVELS.OBSERVER)}`}
            >
              3
            </span>
            <div>
              <p className="font-medium text-sm text-dark-slate">
                ผู้สังเกตการณ์
              </p>
              <p className="text-xs text-cool-gray">ดูผลเลือกตั้งอย่างเดียว</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-dark-slate mb-4">
              เพิ่ม Admin ใหม่
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  ชื่อที่แสดง
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ชื่อที่แสดง (ไม่บังคับ)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  รหัสผ่าน
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                  <button
                    onClick={() => {
                      const pass = generatePassword();
                      setFormData({ ...formData, password: pass });
                    }}
                    className="px-3 py-2 bg-slate-100 text-dark-slate rounded-xl hover:bg-slate-200 transition-colors"
                    title="สุ่มรหัสผ่าน"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      autorenew
                    </span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(formData.password)}
                    disabled={!formData.password}
                    className="px-3 py-2 bg-slate-100 text-dark-slate rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                    title="คัดลอก"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      content_copy
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  ระดับสิทธิ์
                </label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accessLevel: Number(e.target.value) as AccessLevel,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {creatableLevels.map((level) => (
                    <option key={level} value={level}>
                      {level} - {ACCESS_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-dark-slate rounded-xl hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !formData.username || !formData.password}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isPending ? "กำลังสร้าง..." : "สร้าง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-dark-slate mb-4">
              แก้ไข Admin: {selectedAdmin.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  ชื่อที่แสดง
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  ระดับสิทธิ์
                </label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accessLevel: Number(e.target.value) as AccessLevel,
                    })
                  }
                  disabled={
                    selectedAdmin.id === currentAdminId ||
                    (currentAccessLevel === ACCESS_LEVELS.SYSTEM_ADMIN &&
                      selectedAdmin.access_level < ACCESS_LEVELS.TEACHER)
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:bg-slate-100"
                >
                  {currentAccessLevel === ACCESS_LEVELS.ROOT
                    ? [
                        ACCESS_LEVELS.ROOT,
                        ACCESS_LEVELS.SYSTEM_ADMIN,
                        ACCESS_LEVELS.TEACHER,
                        ACCESS_LEVELS.OBSERVER,
                      ].map((level) => (
                        <option key={level} value={level}>
                          {level} - {ACCESS_LEVEL_LABELS[level]}
                        </option>
                      ))
                    : [ACCESS_LEVELS.TEACHER, ACCESS_LEVELS.OBSERVER].map(
                        (level) => (
                          <option key={level} value={level}>
                            {level} - {ACCESS_LEVEL_LABELS[level]}
                          </option>
                        ),
                      )}
                </select>
                {selectedAdmin.id === currentAdminId && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      lock
                    </span>
                    ไม่สามารถเปลี่ยนระดับสิทธิ์ตัวเองได้
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-dark-slate rounded-xl hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEdit}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal && !!selectedAdmin}
        onClose={() => {
          setShowDeleteModal(false);
          resetForm();
        }}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={
          selectedAdmin
            ? `คุณต้องการลบ Admin "${selectedAdmin.display_name || selectedAdmin.username}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
            : ""
        }
        confirmText="ลบ"
        cancelText="ยกเลิก"
        variant="danger"
      />

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-dark-slate mb-4">
              รีเซ็ตรหัสผ่าน: {selectedAdmin.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-1">
                  รหัสผ่านใหม่
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                  <button
                    onClick={() => setNewPassword(generatePassword())}
                    className="px-3 py-2 bg-slate-100 text-dark-slate rounded-xl hover:bg-slate-200 transition-colors"
                    title="สุ่มรหัสผ่าน"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      autorenew
                    </span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(newPassword)}
                    disabled={!newPassword}
                    className="px-3 py-2 bg-slate-100 text-dark-slate rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                    title="คัดลอก"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      content_copy
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-dark-slate rounded-xl hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isPending || newPassword.length < 6}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
