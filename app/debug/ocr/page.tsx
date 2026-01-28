"use client";

import {
  ExtendedDetectionResult,
  PipelineResult,
  ProcessingOptions,
  createCanvas,
  detectCard,
  drawDetectionOverlay,
  getMethodDescription,
  loadOpenCV,
  processImageWithDiagnostics,
} from "@/lib/ocr";
import {
  ParseResult,
  parseOCRText,
  validateParsedData,
} from "@/lib/ocr/parser";
import { StudentData } from "@/lib/ocr/types";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

type CameraStatus = "idle" | "initializing" | "scanning" | "found" | "error";

interface ValidationResult {
  isValid: boolean;
  matchedStudent: StudentData | null;
  matchType: "exact" | "partial" | "none";
}

type PipelineStage = "idle" | "detecting" | "cropping" | "ocr" | "complete";

export default function OCRDebugPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null,
  );
  const [rawText, setRawText] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParseResult>({
    confidence: {
      id: 0,
      name: 0,
      surname: 0,
      classroom: 0,
      no: 0,
      nationalId: 0,
    },
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [validating, setValidating] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);
  const [worker, setWorker] = useState<Tesseract.Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [lastDetection, setLastDetection] =
    useState<ExtendedDetectionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);

  // Use a ref for the logger to avoid worker re-init
  const loggerRef = useRef<(m: Tesseract.LoggerMessage) => void>(null);
  loggerRef.current = (m) => {
    if (m.status === "recognizing text") {
      setOcrProgress(Math.floor(m.progress * 100));
    }
  };

  // Initialize persistent worker
  useEffect(() => {
    let activeWorker: Tesseract.Worker | null = null;

    const init = async () => {
      try {
        const w = await Tesseract.createWorker("tha", 1, {
          logger: (m) => loggerRef.current?.(m),
        });
        activeWorker = w;
        setWorker(w);
        setWorkerReady(true);
        console.log("✓ Tesseract worker ready (Thai)");
      } catch (err) {
        console.error("Failed to init Tesseract worker:", err);
      }
    };

    init();

    return () => {
      if (activeWorker) {
        activeWorker.terminate();
      }
    };
  }, []);

  // Preload OpenCV when page mounts (reduces first pipeline run latency)
  useEffect(() => {
    loadOpenCV()
      .then(() => console.log("✓ OpenCV preloaded"))
      .catch((err) => console.warn("OpenCV preload failed:", err));
  }, []);

  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(
    {
      enableCrop: true,
      enableEnhancement: true,
      enableOcrPreprocessing: true,
    },
  );

  // Derived state for backward compatibility
  const processedImages = pipelineResult?.result.ok
    ? pipelineResult.result.value
    : null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stop camera if active
      if (cameraActive) {
        stopCamera();
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setOriginalImage(imageData);
        setPipelineResult(null);
        setRawText("");
        setParsedData({
          confidence: {
            id: 0,
            name: 0,
            surname: 0,
            classroom: 0,
            no: 0,
            nationalId: 0,
          },
        });
        setValidation(null);
        setPipelineStage("idle");
      };
      reader.readAsDataURL(file);
    }
  };

  // ============================================================================
  // Camera Functions
  // ============================================================================

  const stopCamera = useCallback(() => {
    // Stop animation frame
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }

    // Stop media stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    // Reset state
    isDetectingRef.current = false;
    setCameraActive(false);
    setCameraStatus("idle");
    setLastDetection(null);
  }, [cameraStream]);

  const runDetectionFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !overlayCanvasRef.current ||
      !isDetectingRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Skip if video not ready
    if (video.readyState < 2) {
      detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    // Create temp canvas for frame capture
    const tempCanvasResult = createCanvas(width, height);
    if (!tempCanvasResult.ok) {
      detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
      return;
    }
    const { ctx: tempCtx } = tempCanvasResult.value;

    // Capture frame
    tempCtx.drawImage(video, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);

    // Run detection
    const detection = detectCard(imageData, width, height);
    setLastDetection(detection);

    // Update status based on detection
    if (detection.success) {
      setCameraStatus("found");
    } else {
      setCameraStatus("scanning");
    }

    // Size overlay canvas to match video display size
    const displayWidth = video.offsetWidth;
    const displayHeight = video.offsetHeight;

    if (
      overlayCanvas.width !== displayWidth ||
      overlayCanvas.height !== displayHeight
    ) {
      overlayCanvas.width = displayWidth;
      overlayCanvas.height = displayHeight;
    }

    // Draw overlay at display scale
    const overlayCtx = overlayCanvas.getContext("2d");
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, displayWidth, displayHeight);

      // Scale detection coordinates to display size
      const scaleX = displayWidth / width;
      const scaleY = displayHeight / height;

      const scaledDetection = {
        ...detection,
        corners: detection.corners.map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        })),
      };

      drawDetectionOverlay(overlayCtx, scaledDetection);
    }

    // Continue detection loop with throttling (~10 FPS)
    // No auto-capture - user must manually capture
    setTimeout(() => {
      if (isDetectingRef.current) {
        detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
      }
    }, 100);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStatus("initializing");
    setCameraActive(true);
    setOriginalImage(null);
    setPipelineResult(null);
    setLastDetection(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraStatus("scanning");
          isDetectingRef.current = true;
          detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraStatus("error");
      setCameraActive(false);
    }
  }, [runDetectionFrame]);

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, startCamera, stopCamera]);

  // Manual capture function - captures current frame regardless of detection status
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !cameraActive) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Create canvas for capture
    const tempCanvasResult = createCanvas(width, height);
    if (!tempCanvasResult.ok) {
      console.error("Failed to create capture canvas");
      return;
    }
    const { canvas, ctx } = tempCanvasResult.value;

    // Draw current frame
    ctx.drawImage(video, 0, 0, width, height);
    const capturedImage = canvas.toDataURL("image/png");

    console.log(
      "📸 Manual capture",
      lastDetection?.success ? "(card detected)" : "(no card detected)",
    );

    // Stop camera and set image for pipeline
    stopCamera();
    setOriginalImage(capturedImage);
    setPipelineResult(null);
    setRawText("");
    setParsedData({
      confidence: {
        id: 0,
        name: 0,
        surname: 0,
        classroom: 0,
        no: 0,
        nationalId: 0,
      },
    });
    setValidation(null);
    setPipelineStage("idle");
  }, [cameraActive, lastDetection, stopCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (detectionFrameRef.current) {
        cancelAnimationFrame(detectionFrameRef.current);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const runPipeline = async () => {
    if (!originalImage) return;

    // Stage 1: Detection
    setPipelineStage("detecting");
    setOcrProgress(0);

    try {
      // Process image with full diagnostics
      const result = await processImageWithDiagnostics(
        originalImage,
        processingOptions,
      );
      setPipelineResult(result);

      if (!result.result.ok) {
        console.error("Pipeline failed:", result.result.error.getUserMessage());
        setPipelineStage("idle");
        return;
      }

      const processed = result.result.value;

      // Stage 2: Cropping complete
      setPipelineStage("cropping");
      await new Promise((r) => setTimeout(r, 300)); // Brief visual delay

      // Stage 3: OCR Analysis
      setPipelineStage("ocr");

      let text = "";
      if (worker && workerReady) {
        // Use persistent worker
        const result = await worker.recognize(processed.thresholdedCard);
        text = result.data.text;
      } else {
        // Fallback to one-off recognize if worker not ready
        console.warn("Worker not ready, using one-off recognition");
        const result = await Tesseract.recognize(
          processed.thresholdedCard,
          "tha",
          {
            logger: (m) => loggerRef.current?.(m),
          },
        );
        text = result.data.text;
      }

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
    const stages: PipelineStage[] = [
      "detecting",
      "cropping",
      "ocr",
      "complete",
    ];
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
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
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
          <PipelineConnector
            active={getStageStatus("detecting") === "complete"}
          />
          <PipelineStep
            number={2}
            label="Crop & Warp"
            status={getStageStatus("cropping")}
          />
          <PipelineConnector
            active={getStageStatus("cropping") === "complete"}
          />
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

          {/* Input Row: File Upload + Camera Button */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={cameraActive}
              className="flex-1 text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 transition-all cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={toggleCamera}
              title={cameraActive ? "Stop Camera" : "Use Camera"}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                cameraActive
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {cameraActive ? "videocam_off" : "videocam"}
              </span>
              {cameraActive ? "Stop" : "Camera"}
            </button>
          </div>

          {/* Camera Status */}
          {cameraActive && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  cameraStatus === "scanning"
                    ? "bg-green-500 animate-pulse"
                    : cameraStatus === "initializing"
                      ? "bg-yellow-500 animate-pulse"
                      : cameraStatus === "found"
                        ? "bg-emerald-500"
                        : cameraStatus === "error"
                          ? "bg-red-500"
                          : "bg-slate-500"
                }`}
              />
              <span className="text-slate-400">
                {cameraStatus === "initializing" && "Initializing camera..."}
                {cameraStatus === "scanning" && "Scanning for card..."}
                {cameraStatus === "found" && "Card detected!"}
                {cameraStatus === "error" && "Camera access denied"}
              </span>
              {lastDetection && cameraStatus === "scanning" && (
                <span className="ml-auto text-xs text-slate-500">
                  Confidence: {lastDetection.confidence.toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {/* Preview Area: Video or Image */}
          <div className="aspect-4/3 bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 overflow-hidden flex items-center justify-center relative">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 pointer-events-none"
                />
                {/* Capture Button Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <button
                    onClick={captureFrame}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                      lastDetection?.success
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      photo_camera
                    </span>
                    {lastDetection?.success ? "Capture Card" : "Capture Frame"}
                  </button>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      lastDetection?.success
                        ? "bg-emerald-900/80 text-emerald-300"
                        : "bg-slate-900/80 text-slate-400"
                    }`}
                  >
                    {lastDetection?.success
                      ? `✓ Card detected (${lastDetection.confidence.toFixed(
                          0,
                        )}%)`
                      : "Position card in frame"}
                  </span>
                </div>
              </>
            ) : processedImages?.originalWithOverlay ? (
              <Image
                src={processedImages.originalWithOverlay}
                alt="Detected Card"
                className="w-full h-full object-contain"
                width={500}
                height={500}
                unoptimized
              />
            ) : originalImage ? (
              <Image
                src={originalImage}
                alt="Original"
                className="w-full h-full object-contain opacity-60"
                width={500}
                height={500}
                unoptimized
              />
            ) : (
              <div className="text-center text-slate-600">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                  photo_camera
                </span>
                <span className="text-sm">Upload an image or use camera</span>
              </div>
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
                  {processedImages.detectionResult.confidence.toFixed(1)}%
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
              <div className="flex justify-between">
                <span>Detection Method:</span>
                <span
                  className="text-blue-400 truncate max-w-[150px]"
                  title={getMethodDescription(
                    processedImages.detectionResult.method,
                  )}
                >
                  {processedImages.detectionResult.method}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aspect Ratio:</span>
                <span className="text-purple-400">
                  {processedImages.detectionResult.detectedAspectRatio.toFixed(
                    3,
                  )}
                </span>
              </div>
              {pipelineResult && (
                <div className="flex justify-between">
                  <span>Processing Time:</span>
                  <span className="text-cyan-400">
                    {pipelineResult.totalDurationMs.toFixed(0)}ms
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={runPipeline}
            disabled={
              !originalImage ||
              (pipelineStage !== "idle" && pipelineStage !== "complete")
            }
            className={`mt-4 w-full py-3 rounded-xl font-bold transition-all ${
              !originalImage ||
              (pipelineStage !== "idle" && pipelineStage !== "complete")
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg"
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
            <p className="text-xs text-slate-500 font-medium">
              Preprocessing Options
            </p>
            <ToggleSwitch
              label="Auto Crop"
              description="Crop to detected card boundaries"
              checked={processingOptions.enableCrop}
              onChange={(checked) =>
                setProcessingOptions((prev) => ({
                  ...prev,
                  enableCrop: checked,
                }))
              }
            />
            <ToggleSwitch
              label="Enhancement"
              description="Apply contrast & brightness boost"
              checked={processingOptions.enableEnhancement}
              onChange={(checked) =>
                setProcessingOptions((prev) => ({
                  ...prev,
                  enableEnhancement: checked,
                }))
              }
            />
            <ToggleSwitch
              label="OCR Preprocessing"
              description="Adaptive thresholding for OCR"
              checked={processingOptions.enableOcrPreprocessing}
              onChange={(checked) =>
                setProcessingOptions((prev) => ({
                  ...prev,
                  enableOcrPreprocessing: checked,
                }))
              }
            />
          </div>

          <div className="aspect-4/3 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative group flex items-center justify-center">
            {processedImages?.croppedCard ? (
              <>
                <Image
                  src={
                    showThreshold && processedImages.thresholdedCard
                      ? processedImages.thresholdedCard
                      : processedImages.croppedCard
                  }
                  alt="Cropped Card"
                  className="w-full h-full object-contain"
                  width={500}
                  height={500}
                  unoptimized
                />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowThreshold(false)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      !showThreshold ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    CLEANED
                  </button>
                  <button
                    onClick={() => setShowThreshold(true)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      showThreshold ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    OCR-READY
                  </button>
                </div>
              </>
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

      {/* Bottom Section: Raw OCR & Pipeline Diagnostics */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw OCR Log */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            Raw OCR Output
          </h2>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 font-mono text-xs overflow-auto text-emerald-400/80 whitespace-pre-wrap leading-relaxed max-h-[200px]">
            {rawText || "Waiting for OCR..."}
          </div>
        </section>

        {/* Pipeline Diagnostics */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-cyan-500 rounded-full"></span>
            Pipeline Diagnostics
          </h2>
          {pipelineResult ? (
            <div className="space-y-2">
              {pipelineResult.stages.map((stage, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 bg-slate-900/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        stage.success ? "bg-emerald-600" : "bg-red-600"
                      }`}
                    >
                      {stage.success ? "✓" : "✗"}
                    </span>
                    <span className="text-slate-300 text-sm font-mono">
                      {idx + 1}. {stage.stage}
                    </span>
                  </div>
                  <span className="text-cyan-400 text-xs font-mono">
                    {stage.durationMs.toFixed(1)}ms
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-slate-400 text-sm font-semibold">
                  Total Pipeline Time
                </span>
                <span className="text-cyan-300 font-mono font-bold">
                  {pipelineResult.totalDurationMs.toFixed(1)}ms
                </span>
              </div>
              {processedImages && (
                <div className="mt-2 p-2 bg-slate-900/30 rounded-lg text-xs text-slate-500">
                  <span className="text-slate-400">Method:</span>{" "}
                  {getMethodDescription(processedImages.detectionResult.method)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-600 text-sm py-8">
              Run the pipeline to see diagnostics
            </div>
          )}
        </section>
      </div>
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
