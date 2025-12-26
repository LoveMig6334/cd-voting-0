"use client";

import {
  ParseResult,
  parseOCRText,
  validateParsedData,
} from "@/lib/ocr/parser";
import { processImage, ProcessedImage, ProcessingOptions } from "@/lib/ocr/image-processor";
import { StudentData } from "@/lib/student-data";
import React, { useEffect, useState } from "react";
import Tesseract from "tesseract.js";

interface ValidationResult {
  isValid: boolean;
  matchedStudent: StudentData | null;
  matchType: "exact" | "partial" | "none";
}

type PipelineStage = "idle" | "detecting" | "cropping" | "ocr" | "complete";

export default function OCRDebugPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage | null>(
    null
  );
  const [rawText, setRawText] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParseResult>({
    confidence: { id: 0, name: 0, surname: 0, classroom: 0, no: 0, nationalId: 0 },
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [validating, setValidating] = useState(false);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    enableCrop: true,
    enableEnhancement: true,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setOriginalImage(imageData);
        setProcessedImages(null);
        setRawText("");
        setParsedData({
          confidence: { id: 0, name: 0, surname: 0, classroom: 0, no: 0, nationalId: 0 },
        });
        setValidation(null);
        setPipelineStage("idle");
      };
      reader.readAsDataURL(file);
    }
  };

  const runPipeline = async () => {
    if (!originalImage) return;

    // Stage 1: Detection
    setPipelineStage("detecting");
    setOcrProgress(0);

    try {
      // Process image (detect + crop) with options
      const processed = await processImage(originalImage, processingOptions);
      setProcessedImages(processed);

      // Stage 2: Cropping complete
      setPipelineStage("cropping");
      await new Promise((r) => setTimeout(r, 300)); // Brief visual delay

      // Stage 3: OCR Analysis
      setPipelineStage("ocr");
      const {
        data: { text },
      } = await Tesseract.recognize(processed.croppedCard, "tha+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.floor(m.progress * 100));
          }
        },
      });

      setRawText(text);
      setPipelineStage("complete");
    } catch (error) {
      console.error("Pipeline Error:", error);
      setPipelineStage("idle");
    }
  };

  // Auto-parse when raw text changes
  useEffect(() => {
    if (rawText) {
      const parsed = parseOCRText(rawText);
      setParsedData(parsed);
      setValidation(null);
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

  const getStageStatus = (stage: PipelineStage) => {
    const stages: PipelineStage[] = ["detecting", "cropping", "ocr", "complete"];
    const currentIndex = stages.indexOf(pipelineStage);
    const stageIndex = stages.indexOf(stage);

    if (pipelineStage === "idle") return "pending";
    if (stageIndex < currentIndex) return "complete";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          OCR Debug Laboratory
        </h1>
        <p className="text-slate-400 mt-2">
          Visual Preprocessing Pipeline & Student ID Extraction
        </p>
      </header>

      {/* Pipeline Progress Indicator */}
      <div className="mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between">
          <PipelineStep
            number={1}
            label="Detection"
            status={getStageStatus("detecting")}
          />
          <PipelineConnector active={getStageStatus("detecting") === "complete"} />
          <PipelineStep
            number={2}
            label="Crop & Warp"
            status={getStageStatus("cropping")}
          />
          <PipelineConnector active={getStageStatus("cropping") === "complete"} />
          <PipelineStep
            number={3}
            label="OCR Analysis"
            status={getStageStatus("ocr")}
            progress={pipelineStage === "ocr" ? ocrProgress : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage 1: Upload & Detection */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Detection & Outline
          </h2>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-slate-400 mb-4
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700 transition-all cursor-pointer"
          />

          <div className="aspect-[4/3] bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 overflow-hidden flex items-center justify-center">
            {processedImages?.originalWithOverlay ? (
              <img
                src={processedImages.originalWithOverlay}
                alt="Detected Card"
                className="w-full h-full object-contain"
              />
            ) : originalImage ? (
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-full object-contain opacity-60"
              />
            ) : (
              <span className="text-slate-600 text-sm">Upload an image</span>
            )}
          </div>

          {processedImages && (
            <div className="mt-3 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Detection Confidence:</span>
                <span
                  className={
                    processedImages.detectionResult.confidence >= 70
                      ? "text-emerald-400"
                      : processedImages.detectionResult.confidence >= 50
                      ? "text-yellow-400"
                      : "text-red-400"
                  }
                >
                  {processedImages.detectionResult.confidence}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Card Found:</span>
                <span
                  className={
                    processedImages.detectionResult.success
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {processedImages.detectionResult.success ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={runPipeline}
            disabled={!originalImage || pipelineStage !== "idle" && pipelineStage !== "complete"}
            className={`mt-4 w-full py-3 rounded-xl font-bold transition-all ${
              !originalImage || (pipelineStage !== "idle" && pipelineStage !== "complete")
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg"
            }`}
          >
            {pipelineStage === "idle" || pipelineStage === "complete"
              ? "Run Pipeline"
              : "Processing..."}
          </button>
        </section>

        {/* Stage 2: Cropped Card */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Cleaned Card
          </h2>

          {/* Processing Options */}
          <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-3">
            <p className="text-xs text-slate-500 font-medium">Preprocessing Options</p>
            <ToggleSwitch
              label="Auto Crop"
              description="Crop to detected card boundaries"
              checked={processingOptions.enableCrop}
              onChange={(checked) =>
                setProcessingOptions((prev) => ({ ...prev, enableCrop: checked }))
              }
            />
            <ToggleSwitch
              label="Enhancement"
              description="Apply contrast & brightness boost"
              checked={processingOptions.enableEnhancement}
              onChange={(checked) =>
                setProcessingOptions((prev) => ({ ...prev, enableEnhancement: checked }))
              }
            />
          </div>

          <div className="aspect-[4/3] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
            {processedImages?.croppedCard ? (
              <img
                src={processedImages.croppedCard}
                alt="Cropped Card"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-600 text-sm">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                  crop
                </span>
                Awaiting detection...
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {processingOptions.enableCrop && processingOptions.enableEnhancement
              ? "Cropped & enhanced image for OCR"
              : processingOptions.enableCrop
              ? "Cropped image (no enhancement)"
              : processingOptions.enableEnhancement
              ? "Full image with enhancement"
              : "Raw image (no preprocessing)"}
          </p>
        </section>

        {/* Stage 3: Parsed Data */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Parsed Data
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleReparse}
                disabled={!rawText}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
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
              >
                {validating ? "..." : "Validate"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
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
              label="National ID"
              value={parsedData.nationalId}
              confidence={parsedData.confidence.nationalId}
            />
          </div>

          {/* Validation Result */}
          {validation && (
            <div
              className={`mt-4 p-3 rounded-xl border text-sm ${
                validation.matchType === "exact"
                  ? "bg-emerald-900/30 border-emerald-500/50"
                  : validation.matchType === "partial"
                  ? "bg-yellow-900/30 border-yellow-500/50"
                  : "bg-red-900/30 border-red-500/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`material-symbols-outlined text-base ${
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
                    ? "Exact Match"
                    : validation.matchType === "partial"
                    ? "Partial Match"
                    : "No Match"}
                </span>
              </div>
              {validation.matchedStudent && (
                <div className="text-slate-300 text-xs pl-6">
                  {validation.matchedStudent.name}{" "}
                  {validation.matchedStudent.surname} (
                  {validation.matchedStudent.classroom})
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Raw OCR Log */}
      <section className="mt-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
          Raw OCR Output
        </h2>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 font-mono text-xs overflow-auto text-emerald-400/80 whitespace-pre-wrap leading-relaxed max-h-[200px]">
          {rawText || "Waiting for OCR..."}
        </div>
      </section>
    </div>
  );
}

function PipelineStep({
  number,
  label,
  status,
  progress,
}: {
  number: number;
  label: string;
  status: "pending" | "active" | "complete";
  progress?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
          status === "complete"
            ? "bg-emerald-600"
            : status === "active"
            ? "bg-blue-600 animate-pulse"
            : "bg-slate-700"
        }`}
      >
        {status === "complete" ? (
          <span className="material-symbols-outlined text-lg">check</span>
        ) : status === "active" && progress !== undefined ? (
          `${progress}%`
        ) : (
          number
        )}
      </div>
      <span className="mt-2 text-xs text-slate-400">{label}</span>
    </div>
  );
}

function PipelineConnector({ active }: { active: boolean }) {
  return (
    <div
      className={`flex-1 h-1 mx-2 rounded transition-colors ${
        active ? "bg-emerald-600" : "bg-slate-700"
      }`}
    />
  );
}

function DataField({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string | number | undefined;
  confidence?: number;
}) {
  const hasValue = value !== undefined && value !== null && value !== "";

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return "text-emerald-400";
    if (conf >= 50) return "text-yellow-400";
    if (conf > 0) return "text-orange-400";
    return "text-slate-600";
  };

  return (
    <div className="flex justify-between items-center p-2.5 bg-slate-900/50 rounded-lg border border-slate-700/50">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {hasValue && confidence !== undefined && confidence > 0 && (
          <span
            className={`text-xs font-mono ${getConfidenceColor(confidence)}`}
          >
            {confidence}%
          </span>
        )}
        <span
          className={`font-mono text-sm ${
            hasValue ? "text-blue-300" : "text-red-400"
          }`}
        >
          {hasValue ? value?.toString() : "Not Detected"}
        </span>
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-slate-300">{label}</span>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-purple-600" : "bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
