"use client";

import { useState } from "react";

// Types
interface Student {
  id: string;
  name: string;
  class: string;
  registrationStatus: "registered" | "not_registered";
  lastActive: string;
  votedIn: number;
}

// Mock Data
const mockStudents: Student[] = [
  {
    id: "6312001",
    name: "Somchai Jaidee",
    class: "M.6/1",
    registrationStatus: "registered",
    lastActive: "2 hours ago",
    votedIn: 2,
  },
  {
    id: "6312002",
    name: "Naree Suwan",
    class: "M.6/1",
    registrationStatus: "registered",
    lastActive: "Just now",
    votedIn: 1,
  },
  {
    id: "6312003",
    name: "Kittipong Rattana",
    class: "M.6/2",
    registrationStatus: "not_registered",
    lastActive: "-",
    votedIn: 0,
  },
  {
    id: "6312004",
    name: "Wipada Wongsawat",
    class: "M.6/2",
    registrationStatus: "registered",
    lastActive: "1 day ago",
    votedIn: 2,
  },
  {
    id: "6312005",
    name: "Tanawat Chai",
    class: "M.6/3",
    registrationStatus: "registered",
    lastActive: "5 mins ago",
    votedIn: 2,
  },
  {
    id: "6312006",
    name: "Siriporn Laemthong",
    class: "M.6/3",
    registrationStatus: "not_registered",
    lastActive: "-",
    votedIn: 0,
  },
  {
    id: "6312007",
    name: "Anucha Pramoj",
    class: "M.6/4",
    registrationStatus: "registered",
    lastActive: "3 hours ago",
    votedIn: 1,
  },
  {
    id: "6312008",
    name: "Malai Sriwong",
    class: "M.6/4",
    registrationStatus: "registered",
    lastActive: "Yesterday",
    votedIn: 2,
  },
];

// Registration Status Badge
function RegistrationBadge({
  status,
}: {
  status: Student["registrationStatus"];
}) {
  const styles = {
    registered: "bg-green-100 text-green-700",
    not_registered: "bg-slate-100 text-slate-600",
  };

  const labels = {
    registered: "ลงทะเบียนแล้ว",
    not_registered: "ยังไม่ลงทะเบียน",
  };

  return (
    <span
      className={`${styles[status]} px-2.5 py-1 rounded-full text-xs font-medium`}
    >
      {labels[status]}
    </span>
  );
}

export default function StudentManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.includes(searchQuery) ||
      student.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            ฐานข้อมูลนักเรียน
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            จัดการการลงทะเบียนนักเรียนและดูประวัติการลงคะแนน
          </p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              upload_file
            </span>
            นำเข้า CSV
          </button>
          <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              person_add
            </span>
            เพิ่มนักเรียน
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
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
                  สถานะ
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ใช้งานล่าสุด
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
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-900">
                      {student.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
                      {student.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{student.class}</td>
                  <td className="px-6 py-4">
                    <RegistrationBadge status={student.registrationStatus} />
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {student.lastActive}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
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

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                โปรไฟล์นักเรียน
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
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
                    {selectedStudent.name}
                  </h4>
                  <p className="text-slate-500 font-mono">
                    รหัส: {selectedStudent.id}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                    ห้อง
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedStudent.class}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                    สถานะ
                  </p>
                  <RegistrationBadge
                    status={selectedStudent.registrationStatus}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                    ใช้งานล่าสุด
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedStudent.lastActive}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                    ลงคะแนนแล้ว
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedStudent.votedIn}
                  </p>
                </div>
              </div>

              {/* Voting History */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-3">
                  ประวัติการลงคะแนน
                </h5>
                {selectedStudent.votedIn > 0 ? (
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-slate-600">
                        ลงคะแนนในสภานักเรียน 2568
                      </span>
                      <span className="text-slate-400 ml-auto">
                        21 ต.ค. 10:30
                      </span>
                    </li>
                    {selectedStudent.votedIn >= 2 && (
                      <li className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-slate-600">
                          ลงคะแนนในการเลือกหัวหน้าชมรม
                        </span>
                        <span className="text-slate-400 ml-auto">
                          23 ต.ค. 14:15
                        </span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    ยังไม่มีประวัติการลงคะแนน
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
