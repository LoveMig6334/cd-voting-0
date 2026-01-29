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
        return "bg-red-600 hover:bg-red-700";
      case "success":
        return "bg-emerald-600 hover:bg-emerald-700";
      default:
        return "bg-primary hover:bg-primary-dark";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white p-6 shadow-2xl rounded-2xl animate-fade-in">
        {/* Title */}
        <h3 className="text-xl font-bold text-dark-slate mb-4">
          {title}
        </h3>

        {/* Message */}
        <p className="text-dark-slate mb-6">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-dark-slate rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white transition-colors ${getVariantStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
