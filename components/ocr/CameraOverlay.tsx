"use client";

import {
  createCanvas,
  detectCard,
  drawDetectionOverlay,
  ExtendedDetectionResult,
  loadOpenCV,
  parseOCRText,
  processImageWithDiagnostics,
  validateParsedData,
} from "@/lib/ocr";
import { StudentData } from "@/lib/student-data";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

interface CameraOverlayProps {
  onScanComplete?: (data: StudentData) => void;
  onClose?: () => void;
}

type ProcessingStage =
  | "idle"
  | "detecting"
  | "processing"
  | "ocr"
  | "validating"
  | "complete";

export default function CameraOverlay({
  onScanComplete,
  onClose,
}: CameraOverlayProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // Detection state
  const [lastDetection, setLastDetection] =
    useState<ExtendedDetectionResult | null>(null);
  const detectionFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);

  // Processing state
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);

  // Logger ref to avoid worker re-init
  const loggerRef = useRef<(m: Tesseract.LoggerMessage) => void>(null);
  loggerRef.current = (m) => {
    if (m.status === "recognizing text") {
      setOcrProgress(Math.floor(m.progress * 100));
      setStatus(`Scanning... ${Math.floor(m.progress * 100)}%`);
    }
  };

  // Initialize Thai Tesseract Worker
  useEffect(() => {
    let isMounted = true;
    const initWorker = async () => {
      try {
        const worker = await Tesseract.createWorker("tha", 1, {
          logger: (m) => loggerRef.current?.(m),
        });
        if (isMounted) {
          workerRef.current = worker;
          setWorkerReady(true);
          console.log("✓ Tesseract worker ready (Thai)");
        } else {
          await worker.terminate();
        }
      } catch (err) {
        console.error("Failed to init Tesseract worker", err);
      }
    };
    initWorker();

    return () => {
      isMounted = false;
      workerRef.current?.terminate();
    };
  }, []);

  // Preload OpenCV
  useEffect(() => {
    loadOpenCV()
      .then(() => console.log("✓ OpenCV preloaded"))
      .catch((err) => console.warn("OpenCV preload failed:", err));
  }, []);

  const handleClose = useCallback(() => {
    // Stop detection loop
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    isDetectingRef.current = false;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [router, onClose, stream]);

  // Real-time card detection loop
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
      setStatus("Card detected! Tap to capture");
    } else {
      setStatus("Position card within frame");
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
    setTimeout(() => {
      if (isDetectingRef.current) {
        detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
      }
    }, 100);
  }, []);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setStatus("Position card within frame");
            isDetectingRef.current = true;
            detectionFrameRef.current =
              requestAnimationFrame(runDetectionFrame);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStatus("Camera access denied");
      }
    };

    startCamera();

    return () => {
      if (detectionFrameRef.current) {
        cancelAnimationFrame(detectionFrameRef.current);
      }
      isDetectingRef.current = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current) return;

    // Stop detection loop during processing
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    isDetectingRef.current = false;

    setScanning(true);
    setProcessingStage("detecting");
    setStatus("Detecting card...");
    setOcrProgress(0);

    try {
      const video = videoRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Capture frame
      const tempCanvasResult = createCanvas(width, height);
      if (!tempCanvasResult.ok) {
        throw new Error("Failed to create canvas");
      }
      const { canvas, ctx } = tempCanvasResult.value;
      ctx.drawImage(video, 0, 0, width, height);
      const capturedImage = canvas.toDataURL("image/png");

      // Stage 1: Run pipeline (detect, crop, warp, enhance)
      setProcessingStage("processing");
      setStatus("Processing image...");

      const pipelineResult = await processImageWithDiagnostics(capturedImage, {
        enableCrop: true,
        enableEnhancement: true,
        enableOcrPreprocessing: true,
      });

      if (!pipelineResult.result.ok) {
        console.error(
          "Pipeline failed:",
          pipelineResult.result.error.getUserMessage()
        );
        setStatus("Detection failed. Try again.");
        setScanning(false);
        setProcessingStage("idle");
        // Resume detection
        isDetectingRef.current = true;
        detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
        return;
      }

      const processed = pipelineResult.result.value;

      // Stage 2: OCR
      setProcessingStage("ocr");
      setStatus("Reading text...");

      let text = "";
      if (workerRef.current && workerReady) {
        const result = await workerRef.current.recognize(
          processed.thresholdedCard
        );
        text = result.data.text;
      } else {
        // Fallback
        const result = await Tesseract.recognize(
          processed.thresholdedCard,
          "tha",
          {
            logger: (m) => loggerRef.current?.(m),
          }
        );
        text = result.data.text;
      }

      console.log("OCR Result:", text);

      // Stage 3: Parse text
      setProcessingStage("validating");
      setStatus("Validating data...");

      const parsed = parseOCRText(text);

      if (!parsed.id) {
        setStatus("Could not read ID. Try again.");
        setScanning(false);
        setProcessingStage("idle");
        // Resume detection
        isDetectingRef.current = true;
        detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
        return;
      }

      // Stage 4: Validate against database
      const validation = await validateParsedData(parsed);

      if (validation.isValid && validation.matchedStudent) {
        setProcessingStage("complete");
        setStatus(
          `Found: ${validation.matchedStudent.name} ${validation.matchedStudent.surname}`
        );

        // Brief delay to show success
        await new Promise((r) => setTimeout(r, 800));

        if (onScanComplete) {
          onScanComplete(validation.matchedStudent);
        }
        return;
      }

      // Partial or no match - still pass parsed data
      if (parsed.id && (parsed.name || parsed.surname)) {
        setStatus("Partial match found. Please verify.");
        await new Promise((r) => setTimeout(r, 500));

        if (onScanComplete) {
          // Create partial student data
          onScanComplete({
            id: parsed.id,
            name: parsed.name || "",
            surname: parsed.surname || "",
            classroom: parsed.classroom || "",
            no: parsed.no || 0,
          });
        }
        return;
      }

      setStatus("ID not found. Try again.");
    } catch (err) {
      console.error("OCR Error:", err);
      setStatus("Scan failed. Try again.");
    } finally {
      setScanning(false);
      setProcessingStage("idle");
      // Resume detection if still mounted
      if (videoRef.current) {
        isDetectingRef.current = true;
        detectionFrameRef.current = requestAnimationFrame(runDetectionFrame);
      }
    }
  };

  const getStatusColor = () => {
    if (processingStage !== "idle") return "text-blue-400";
    if (lastDetection?.success) return "text-emerald-400";
    return "text-white/90";
  };

  const getCaptureButtonStyle = () => {
    if (scanning) return "opacity-50 scale-95";
    if (lastDetection?.success) return "ring-4 ring-emerald-500/50";
    return "";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden">
      {/* Background Camera Feed */}
      <div className="absolute inset-0 z-0 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Detection Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col h-full w-full">
        {/* Top Section */}
        <div className="flex-1 w-full bg-black/60 flex flex-col relative transition-all duration-300">
          <div className="w-full p-4 pt-12 lg:pt-8 flex justify-between items-start">
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Detection indicator */}
            {lastDetection && processingStage === "idle" && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${
                  lastDetection.success
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    lastDetection.success
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-white/50"
                  }`}
                />
                <span className="text-xs font-medium">
                  {lastDetection.success
                    ? `${lastDetection.confidence.toFixed(0)}%`
                    : "Searching..."}
                </span>
              </div>
            )}
          </div>
          <div className="mt-auto pb-6 w-full text-center px-8">
            <p
              className={`text-base font-medium drop-shadow-md tracking-wide transition-colors ${getStatusColor()}`}
            >
              {status}
            </p>
            {processingStage === "ocr" && (
              <div className="mt-2 w-48 mx-auto bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scanning Area - Visual guide when no detection overlay */}
        <div className="h-[230px] w-full flex shrink-0 relative">
          <div className="flex-1 bg-black/60"></div>
          <div className="relative h-full aspect-[1.586/1] max-w-[90vw]">
            {/* Only show corners when not detecting */}
            {!lastDetection?.success && (
              <>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl drop-shadow-md"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl drop-shadow-md"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl drop-shadow-md"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl drop-shadow-md"></div>
              </>
            )}

            {/* Scan Line when processing */}
            {scanning && (
              <div className="absolute inset-x-4 h-[2px] bg-primary shadow-[0_0_15px_rgba(19,127,236,0.8)] animate-scan z-20"></div>
            )}
          </div>
          <div className="flex-1 bg-black/60"></div>
        </div>

        {/* Bottom Section */}
        <div className="flex-1 w-full bg-black/60 relative flex flex-col justify-end">
          <div className="w-full px-8 pb-12 pt-8 flex items-center justify-between max-w-md mx-auto">
            <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md border border-white/10 opacity-50">
              <span className="material-symbols-outlined">flash_off</span>
            </button>
            <button
              onClick={captureAndScan}
              disabled={scanning}
              className={`flex shrink-0 items-center justify-center rounded-full size-20 border-[5px] border-white bg-transparent transition-all ${getCaptureButtonStyle()}`}
            >
              <div
                className={`size-[60px] rounded-full shadow-inner transition-colors ${
                  lastDetection?.success ? "bg-emerald-500" : "bg-primary"
                }`}
              ></div>
            </button>
            <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md border border-white/10 opacity-50">
              <span className="material-symbols-outlined">flip_camera_ios</span>
            </button>
          </div>
          <div className="h-6 w-full"></div>
        </div>
      </div>
    </div>
  );
}
