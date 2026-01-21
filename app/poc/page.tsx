"use client";

import { useState } from "react";
import { castVoteAction, loginAction } from "./actions";

export default function POCPage() {
  const [step, setStep] = useState<"LOGIN" | "VOTE" | "DONE">("LOGIN");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Login State
  const [studentId, setStudentId] = useState("1234");
  const [nationalId, setNationalId] = useState("hashed_secret_123");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("nationalId", nationalId);

    const result = await loginAction(formData);

    if (result.success) {
      setStep("VOTE");
      setMessage("เข้าสู่ระบบสำเร็จ (Session Created via HttpOnly Cookie)");
    } else {
      setMessage(result.message || "Error");
    }
    setLoading(false);
  };

  const handleVote = async (candidateId: number) => {
    setLoading(true);
    const result = await castVoteAction(1, [
      { positionId: "president", candidateId },
    ]); // Election ID 1, Position: president

    if (result.success) {
      setStep("DONE");
      setMessage("บันทึกผลโหวตสำเร็จ (Database Transaction Complete)");
    } else {
      setMessage(result.message || "Error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 font-sans text-slate-800">
      <h1 className="text-3xl font-bold mb-2 text-blue-700">
        POC: Secure Voting Architecture
      </h1>
      <p className="mb-8 text-slate-600 border-b pb-4">
        หน้าสาธิตการทำงานแบบ Server-Action + Database จริง
        เพื่อแก้ปัญหาความปลอดภัย
      </p>

      {/* ERROR / STATUS MESSAGE */}
      {message && (
        <div
          className={`p-4 mb-6 rounded ${message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
        >
          {message}
        </div>
      )}

      {/* STEP 1: LOGIN */}
      {step === "LOGIN" && (
        <div className="bg-white p-6 shadow-lg rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">lock</span>
            1. Secure Authentication
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Student ID (Mock: 1234)
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                National ID Hash (Mock: hashed_secret_123)
              </label>
              <input
                type="password"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Verifying with DB..." : "Login Securely"}
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            * ระบบจะไม่ส่งไฟล์ data.json มาที่ client อีกต่อไป แต่จะส่งแค่
            Credentials ไปตรวจสอบที่ Server
          </p>
        </div>
      )}

      {/* STEP 2: VOTE */}
      {step === "VOTE" && (
        <div className="bg-white p-6 shadow-lg rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">how_to_vote</span>
            2. Anonymous Voting
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleVote(101)}
              disabled={loading}
              className="p-4 border-2 border-blue-100 rounded-xl hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-bold text-lg">เบอร์ 1</div>
              <div className="text-sm text-slate-500">
                นาย ก. (Transaction Test)
              </div>
            </button>
            <button
              onClick={() => handleVote(102)}
              disabled={loading}
              className="p-4 border-2 border-blue-100 rounded-xl hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-bold text-lg">เบอร์ 2</div>
              <div className="text-sm text-slate-500">
                นาง ข. (Transaction Test)
              </div>
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            * เมื่อกดโหวต ระบบจะใช้ Database Transaction เพื่อ:
            <br />
            1. เช็คว่าเคยโหวตหรือยัง (ตาราง vote_history)
            <br />
            2. หย่อนบัตร (ตาราง votes) แบบไม่ระบุตัวตน
          </p>
        </div>
      )}

      {/* STEP 3: DONE */}
      {step === "DONE" && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">บันทึกผลสำเร็จ</h2>
          <p className="text-slate-600">
            ข้อมูลของคุณถูกบันทึกใน Database อย่างปลอดภัยแล้ว
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 text-blue-600 underline"
          >
            ทดสอบใหม่
          </button>
        </div>
      )}
    </div>
  );
}
