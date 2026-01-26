"use client";

import {
  getOrCreateDisplaySettings,
  publishResults,
  unpublishResults,
  updateDisplaySettings,
  updatePositionConfig,
  type PositionDisplayConfig,
  type PublicDisplaySettings,
} from "@/lib/actions/public-display";
import {
  getElectionWinners,
  type PositionWinner,
  type WinnerStatus,
} from "@/lib/vote-store";
import { useCallback, useEffect, useState } from "react";

// ============================================
// Types
// ============================================

interface PublicDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  electionTitle: string;
  positions: { id: string; title: string; enabled: boolean; icon: string }[];
  candidates: { id: string; name: string; positionId: string }[];
}

// ============================================
// Helper Components
// ============================================

/**
 * Get status icon and color based on winner status
 */
function getStatusDisplay(status: WinnerStatus): {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case "winner":
      return {
        icon: "emoji_events",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        label: "",
      };
    case "abstain_wins":
      return {
        icon: "warning",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        label: "Vote No ชนะ",
      };
    case "tie":
      return {
        icon: "handshake",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        label: "เสมอกัน",
      };
    case "no_candidates":
      return {
        icon: "block",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ไม่มีผู้สมัคร",
      };
    case "no_votes":
      return {
        icon: "inbox",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ยังไม่มีคะแนน",
      };
    default:
      return {
        icon: "help",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ไม่ทราบสถานะ",
      };
  }
}

/**
 * Get winner display text
 */
function getWinnerText(winner: PositionWinner): string {
  switch (winner.status) {
    case "winner":
      return `${winner.winner?.candidateName} (${winner.winner?.percentage}%)`;
    case "abstain_wins":
      return `ไม่ประสงค์ลงคะแนน: ${winner.abstainCount} คะแนน`;
    case "tie":
      return (
        winner.tiedCandidates?.map((c) => c.candidateName).join(", ") || ""
      );
    case "no_candidates":
      return "ตำแหน่งนี้ไม่มีผู้สมัคร";
    case "no_votes":
      return "ยังไม่มีการลงคะแนน";
    default:
      return "";
  }
}

// ============================================
// Position Config Card Component
// ============================================

interface PositionConfigCardProps {
  position: { id: string; title: string; icon: string };
  winner: PositionWinner;
  config: PositionDisplayConfig;
  onConfigChange: (updates: {
    showRawScore?: boolean;
    showWinnerOnly?: boolean;
    skip?: boolean;
  }) => void;
  globalShowRawScore: boolean;
  globalShowWinnerOnly: boolean;
}

function PositionConfigCard({
  position,
  winner,
  config,
  onConfigChange,
  globalShowRawScore,
  globalShowWinnerOnly,
}: PositionConfigCardProps) {
  const statusDisplay = getStatusDisplay(winner.status);
  const winnerText = getWinnerText(winner);
  const isAutoSkipped =
    winner.status === "no_candidates" || winner.status === "no_votes";
  const useGlobalSettings = !config.skip && !isAutoSkipped;

  return (
    <div
      className={`rounded-lg border ${statusDisplay.bgColor} ${
        config.skip || isAutoSkipped ? "opacity-60" : ""
      } p-4`}
    >
      {/* Position Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-white flex items-center justify-center`}
          >
            <span
              className={`material-symbols-outlined ${statusDisplay.color}`}
            >
              {statusDisplay.icon || position.icon}
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{position.title}</h4>
            {statusDisplay.label && (
              <span
                className={`text-xs font-medium ${statusDisplay.color} flex items-center gap-1`}
              >
                {statusDisplay.label}
              </span>
            )}
          </div>
        </div>

        {/* Skip Toggle */}
        <div className="flex items-center gap-2">
          {isAutoSkipped ? (
            <span className="text-xs text-slate-400 italic">Auto-skip</span>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.skip}
                onChange={(e) => onConfigChange({ skip: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-600">ข้าม</span>
            </label>
          )}
        </div>
      </div>

      {/* Winner Info */}
      <div className="text-sm text-slate-600 mb-3">{winnerText}</div>

      {/* Config Options (only if not skipped) */}
      {useGlobalSettings && (
        <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showRawScore}
              onChange={(e) =>
                onConfigChange({ showRawScore: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-600">แสดงคะแนนดิบ</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showWinnerOnly}
              onChange={(e) =>
                onConfigChange({ showWinnerOnly: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-600">แสดงเฉพาะผู้ชนะ</span>
          </label>

          <button
            onClick={() =>
              onConfigChange({
                showRawScore: globalShowRawScore,
                showWinnerOnly: globalShowWinnerOnly,
              })
            }
            className="text-xs text-primary hover:text-primary-dark"
          >
            ใช้ค่ากลาง
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Modal Component
// ============================================

export default function PublicDisplayModal({
  isOpen,
  onClose,
  electionId,
  electionTitle,
  positions,
  candidates,
}: PublicDisplayModalProps) {
  const [settings, setSettings] = useState<PublicDisplaySettings | null>(null);
  const [winners, setWinners] = useState<PositionWinner[]>([]);
  const [saving, setSaving] = useState(false);

  // Load settings and calculate winners
  useEffect(() => {
    if (isOpen) {
      const positionIds = positions.filter((p) => p.enabled).map((p) => p.id);
      const electionIdNum = parseInt(electionId, 10);

      // Load settings from database (async)
      getOrCreateDisplaySettings(electionIdNum, positionIds).then(
        (loadedSettings) => {
          setSettings(loadedSettings);
        },
      );

      // Calculate winners (sync - from localStorage vote-store)
      const calculatedWinners = getElectionWinners(
        electionId,
        positions,
        candidates,
      );
      setWinners(calculatedWinners);
    }
  }, [isOpen, electionId, positions, candidates]);

  // Handle global settings change
  const handleGlobalChange = useCallback(
    async (
      field: "globalShowRawScore" | "globalShowWinnerOnly",
      value: boolean,
    ) => {
      if (!settings) return;

      const electionIdNum = parseInt(electionId, 10);
      const updated = await updateDisplaySettings(electionIdNum, {
        [field]: value,
      });
      if (updated) setSettings(updated);
    },
    [settings, electionId],
  );

  // Handle position config change
  const handlePositionChange = useCallback(
    async (
      positionId: string,
      updates: {
        showRawScore?: boolean;
        showWinnerOnly?: boolean;
        skip?: boolean;
      },
    ) => {
      if (!settings) return;

      const electionIdNum = parseInt(electionId, 10);
      const updated = await updatePositionConfig(
        electionIdNum,
        positionId,
        updates,
      );
      if (updated) setSettings(updated);
    },
    [settings, electionId],
  );

  // Handle publish
  const handlePublish = async () => {
    setSaving(true);
    try {
      const electionIdNum = parseInt(electionId, 10);
      const published = await publishResults(electionIdNum);
      if (published) {
        setSettings(published);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle unpublish
  const handleUnpublish = async () => {
    setSaving(true);
    try {
      const electionIdNum = parseInt(electionId, 10);
      const unpublished = await unpublishResults(electionIdNum);
      if (unpublished) {
        setSettings(unpublished);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !settings) return null;

  const enabledPositions = positions.filter((p) => p.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              settings
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ตั้งค่าการแสดงผลสาธารณะ
              </h2>
              <p className="text-sm text-slate-500">{electionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Published Status */}
          {settings.isPublished && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <span className="material-symbols-outlined text-green-600">
                check_circle
              </span>
              <div className="flex-1">
                <p className="font-medium text-green-700">
                  ผลลัพธ์ถูกเผยแพร่แล้ว
                </p>
                <p className="text-sm text-green-600">
                  เผยแพร่เมื่อ:{" "}
                  {settings.publishedAt &&
                    new Date(settings.publishedAt).toLocaleString("th-TH")}
                </p>
              </div>
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors"
              >
                ยกเลิกการเผยแพร่
              </button>
            </div>
          )}

          {/* Global Settings */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <span className="material-symbols-outlined text-base">tune</span>
              การตั้งค่าทั่วไป
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700">
                  🔢 แสดงคะแนนดิบ (สำหรับทุกตำแหน่ง)
                </span>
                <button
                  onClick={() =>
                    handleGlobalChange(
                      "globalShowRawScore",
                      !settings.globalShowRawScore,
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.globalShowRawScore ? "bg-primary" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.globalShowRawScore
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700">
                  🏆 แสดงเฉพาะผู้ชนะ (ไม่แสดงลำดับอื่น)
                </span>
                <button
                  onClick={() =>
                    handleGlobalChange(
                      "globalShowWinnerOnly",
                      !settings.globalShowWinnerOnly,
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.globalShowWinnerOnly
                      ? "bg-primary"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.globalShowWinnerOnly
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Position Configs */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <span className="material-symbols-outlined text-base">list</span>
              ตั้งค่าแต่ละตำแหน่ง
            </h3>
            <div className="space-y-3">
              {enabledPositions.map((position) => {
                const winner = winners.find(
                  (w) => w.positionId === position.id,
                );
                const config = settings.positionConfigs.find(
                  (c) => c.positionId === position.id,
                );

                if (!winner || !config) return null;

                return (
                  <PositionConfigCard
                    key={position.id}
                    position={position}
                    winner={winner}
                    config={config}
                    onConfigChange={(updates) =>
                      handlePositionChange(position.id, updates)
                    }
                    globalShowRawScore={settings.globalShowRawScore}
                    globalShowWinnerOnly={settings.globalShowWinnerOnly}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            ยกเลิก
          </button>
          {!settings.isPublished && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  บันทึกและเผยแพร่
                  <span className="material-symbols-outlined text-base">
                    rocket_launch
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
