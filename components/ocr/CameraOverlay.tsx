"use client";

import { getStudentById, StudentData } from "@/lib/student-data";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

interface CameraOverlayProps {
  onScanComplete?: (data: StudentData) => void;
  onClose?: () => void;
}

export default function CameraOverlay({
  onScanComplete,
  onClose,
}: CameraOverlayProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("Initializing Camera...");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [router, onClose, stream]);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStatus("Ready to scan");
      } catch (err) {
        console.error("Error accessing camera:", err);
        setStatus("Camera access denied");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    setStatus("Processing image...");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Perform OCR
      const result = await Tesseract.recognize(canvas, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setStatus(`Scanning... ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      });

      const text = result.data.text;
      console.log("OCR Result:", text);

      // Simple regex to find 4-digit ID
      // You might need to adjust this based on actual card layout
      const matches = text.match(/\b\d{4}\b/g);

      if (matches) {
        setStatus("Validating ID...");
        for (const idStr of matches) {
          const student = await getStudentById(idStr);
          if (student) {
            setStatus(`Found: ${student.name}`);
            if (onScanComplete) {
              onScanComplete(student);
            }
            // Stop scanning and close will be handled by parent or effect
            return;
          }
        }
        setStatus("ID not found in database. Try again.");
      } else {
        setStatus("No valid ID found. Align card and try again.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setStatus("Scan failed. Try again.");
    } finally {
      setScanning(false);
    }
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
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col h-full w-full">
        {/* Top Mask */}
        <div className="flex-1 w-full bg-black/60 flex flex-col relative transition-all duration-300">
          <div className="w-full p-4 pt-12 lg:pt-8 flex justify-between items-start">
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="mt-auto pb-6 w-full text-center px-8">
            <p className="text-white/90 text-base font-medium drop-shadow-md tracking-wide">
              {status}
            </p>
          </div>
        </div>

        {/* Scanning Area */}
        <div className="h-[230px] w-full flex shrink-0 relative">
          <div className="flex-1 bg-black/60"></div>
          <div className="relative h-full aspect-[1.586/1] max-w-[90vw]">
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl drop-shadow-md"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl drop-shadow-md"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl drop-shadow-md"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl drop-shadow-md"></div>

            {/* Scan Line */}
            {scanning && (
              <div className="absolute inset-x-4 h-[2px] bg-primary shadow-[0_0_15px_rgba(19,127,236,0.8)] animate-scan z-20"></div>
            )}
          </div>
          <div className="flex-1 bg-black/60"></div>
        </div>

        {/* Bottom Mask */}
        <div className="flex-1 w-full bg-black/60 relative flex flex-col justify-end">
          <div className="w-full px-8 pb-12 pt-8 flex items-center justify-between max-w-md mx-auto">
            <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md border border-white/10 opacity-50">
              <span className="material-symbols-outlined">flash_off</span>
            </button>
            <button
              onClick={captureAndScan}
              disabled={scanning}
              className={`flex shrink-0 items-center justify-center rounded-full size-20 border-[5px] border-white bg-transparent transition-all ${
                scanning ? "opacity-50 scale-95" : "active:scale-95"
              }`}
            >
              <div className="size-[60px] rounded-full bg-primary shadow-inner"></div>
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
