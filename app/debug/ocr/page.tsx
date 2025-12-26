"use client";

import { ParseResult, parseOCRText, validateParsedData } from "@/lib/ocr/parser";
import { StudentData } from "@/lib/student-data";
import React, { useEffect, useState } from "react";
import Tesseract from "tesseract.js";

interface ValidationResult {
  isValid: boolean;
  matchedStudent: StudentData | null;
  matchType: "exact" | "partial" | "none";
}

export default function OCRDebugPage() {
  const [image, setImage] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParseResult>({
    confidence: { id: 0, name: 0, surname: 0, classroom: 0, no: 0 },
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
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
      setValidation(null); // Reset validation when re-parsing
    }
  }, [rawText]);

  const handleReparse = () => {
    const parsed = parseOCRText(rawText);
    setParsedData(parsed);
    setValidation(null);
  };

  const handleValidate = async () => {
    if (!parsedData.id) return;
    setValidating(true);
    try {
      const result = await validateParsedData(parsedData);
      setValidation(result);
    } finally {
      setValidating(false);
    }
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
              <div className="flex gap-2">
                <button
                  onClick={handleReparse}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors"
                  title="Manually trigger parser logic with current raw text"
                >
                  Re-parse
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!parsedData.id || validating}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    !parsedData.id || validating
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                  title="Validate against student database"
                >
                  {validating ? "Validating..." : "Validate"}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <DataField
                label="Student ID"
                value={parsedData.id}
                confidence={parsedData.confidence.id}
              />
              <DataField
                label="Name"
                value={parsedData.name}
                confidence={parsedData.confidence.name}
              />
              <DataField
                label="Surname"
                value={parsedData.surname}
                confidence={parsedData.confidence.surname}
              />
              <DataField
                label="Classroom"
                value={parsedData.classroom}
                confidence={parsedData.confidence.classroom}
              />
              <DataField
                label="No"
                value={parsedData.no}
                confidence={parsedData.confidence.no}
              />
            </div>

            {/* Validation Result */}
            {validation && (
              <div
                className={`mt-4 p-4 rounded-xl border ${
                  validation.matchType === "exact"
                    ? "bg-emerald-900/30 border-emerald-500/50"
                    : validation.matchType === "partial"
                    ? "bg-yellow-900/30 border-yellow-500/50"
                    : "bg-red-900/30 border-red-500/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      validation.matchType === "exact"
                        ? "text-emerald-400"
                        : validation.matchType === "partial"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {validation.matchType === "none"
                      ? "error"
                      : validation.matchType === "exact"
                      ? "check_circle"
                      : "warning"}
                  </span>
                  <span className="font-semibold">
                    {validation.matchType === "exact"
                      ? "Exact Match Found"
                      : validation.matchType === "partial"
                      ? "Partial Match (ID Only)"
                      : "No Match Found"}
                  </span>
                </div>
                {validation.matchedStudent && (
                  <div className="text-sm text-slate-300 space-y-1 mt-3 pl-2 border-l-2 border-slate-600">
                    <p>
                      <span className="text-slate-500">Database Record:</span>
                    </p>
                    <p>
                      ID: {validation.matchedStudent.id} | Name:{" "}
                      {validation.matchedStudent.name}{" "}
                      {validation.matchedStudent.surname}
                    </p>
                    <p>
                      Classroom: {validation.matchedStudent.classroom} | No:{" "}
                      {validation.matchedStudent.no}
                    </p>
                  </div>
                )}
              </div>
            )}
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

function DataField({
  label,
  value,
  confidence,
}: {
  label: string;
  value: any;
  confidence?: number;
}) {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return "text-emerald-400";
    if (conf >= 50) return "text-yellow-400";
    if (conf > 0) return "text-orange-400";
    return "text-slate-600";
  };

  return (
    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        {confidence !== undefined && confidence > 0 && (
          <span
            className={`text-xs font-mono ${getConfidenceColor(confidence)}`}
            title="Confidence score"
          >
            {confidence}%
          </span>
        )}
        <span
          className={`font-mono ${
            value ? "text-blue-300" : "text-slate-600 italic"
          }`}
        >
          {value?.toString() || "not found"}
        </span>
      </div>
    </div>
  );
}
