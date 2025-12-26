"use client";

import { parseOCRText } from "@/lib/ocr/parser";
import { StudentData } from "@/lib/student-data";
import React, { useEffect, useState } from "react";
import Tesseract from "tesseract.js";

export default function OCRDebugPage() {
  const [image, setImage] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [parsedData, setParsedData] = useState<Partial<StudentData>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const runOCR = async () => {
    if (!image) return;
    setLoading(true);
    setProgress(0);
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(image, "tha+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.floor(m.progress * 100));
          }
        },
      });
      setRawText(text);
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hot-reload logic: re-parse whenever rawText OR the parser itself (via hot reload) triggers a re-render
  useEffect(() => {
    if (rawText) {
      const parsed = parseOCRText(rawText);
      setParsedData(parsed);
    }
  }, [rawText]);

  const handleReparse = () => {
    const parsed = parseOCRText(rawText);
    setParsedData(parsed);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          OCR Debug Laboratory
        </h1>
        <p className="text-slate-400 mt-2">
          Test and refine Student ID extraction logic.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Preview */}
        <section className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Input Image
            </h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 transition-all cursor-pointer"
            />
            {image && (
              <div className="mt-6 border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-slate-900">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-auto object-contain max-h-[400px]"
                />
              </div>
            )}
            <button
              onClick={runOCR}
              disabled={!image || loading}
              className={`mt-6 w-full py-3 rounded-xl font-bold transition-all ${
                !image || loading
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-900/20"
              }`}
            >
              {loading ? `Processing... (${progress}%)` : "Run OCR Engine"}
            </button>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                Parsed Data
              </h2>
              <button
                onClick={handleReparse}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors"
                title="Manually trigger parser logic with current raw text"
              >
                Manual Re-parse
              </button>
            </div>
            <div className="space-y-3">
              <DataField label="Student ID" value={parsedData.id} />
              <DataField label="Name" value={parsedData.name} />
              <DataField label="Surname" value={parsedData.surname} />
              <DataField label="Classroom" value={parsedData.classroom} />
              <DataField label="No" value={parsedData.no} />
            </div>
          </div>
        </section>

        {/* Right Column: Raw Output */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col min-h-[600px]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            Raw OCR Log
          </h2>
          <div className="flex-grow bg-slate-950 p-4 rounded-xl border border-slate-700 font-mono text-xs overflow-auto text-emerald-400/80 whitespace-pre-wrap leading-relaxed">
            {rawText || "Waiting for OCR run..."}
          </div>
        </section>
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <span className="text-slate-400 text-sm">{label}</span>
      <span
        className={`font-mono ${
          value ? "text-blue-300" : "text-slate-600 italic"
        }`}
      >
        {value?.toString() || "not found"}
      </span>
    </div>
  );
}
