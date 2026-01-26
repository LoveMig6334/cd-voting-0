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
  // Close on Escape key and prevent scrollbar jump
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);

      // Calculate scrollbar width and prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 shadow-2xl rounded-2xl animate-modal-content">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-7 leading-relaxed text-base">
          {message}
        </p>

        {/* Buttons */}
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
