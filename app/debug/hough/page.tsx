"use client";

import { loadOpenCV } from "@/lib/ocr";
import {
  drawDebugOverlay,
  extractHoughDebugData,
  HoughDebugResult,
} from "@/lib/ocr/debug-visualizer";
import React, { useEffect, useRef, useState } from "react";

export default function HoughDebugPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<HoughDebugResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvReady, setOpencvReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Preload OpenCV
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        setOpencvReady(true);
        console.log("✓ OpenCV ready for Hough debug");
      })
      .catch((err) => {
        console.error("OpenCV load failed:", err);
        setError("Failed to load OpenCV");
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setOriginalImage(imageData);
        setDebugData(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runHoughAnalysis = async () => {
    if (!originalImage || !opencvReady) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await extractHoughDebugData(originalImage);
      if (result) {
        setDebugData(result);
        console.log(
          `🔍 Found ${result.lines.length} Hough lines and ${result.intersections.length} intersections`
        );
      } else {
        setError("Failed to extract Hough data");
      }
    } catch (err) {
      console.error("Hough analysis error:", err);
      setError("Error during Hough analysis");
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw overlay when debug data changes
  useEffect(() => {
    if (!debugData || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Wait for image to load
    const drawOverlay = () => {
      // Set canvas to match the scaled image dimensions from the debug data
      canvas.width = debugData.imageWidth;
      canvas.height = debugData.imageHeight;

      // Draw the original image scaled to match
      ctx.drawImage(img, 0, 0, debugData.imageWidth, debugData.imageHeight);

      // Draw the debug overlay (lines and intersections)
      drawDebugOverlay(ctx, debugData);
    };

    if (img.complete) {
      drawOverlay();
    } else {
      img.onload = drawOverlay;
    }
  }, [debugData]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-linear-to-r from-red-400 to-cyan-400 bg-clip-text text-transparent">
          Hough Transform Debug Visualizer
        </h1>
        <p className="text-slate-400 mt-2">
          Visualize detected lines and intersection points for quadrilateral
          detection debugging
        </p>
      </header>

      {/* Status Bar */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            opencvReady
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-yellow-900/50 text-yellow-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              opencvReady ? "bg-emerald-400" : "bg-yellow-400 animate-pulse"
            }`}
          />
          {opencvReady ? "OpenCV Ready" : "Loading OpenCV..."}
        </div>
        {error && (
          <div className="px-3 py-1.5 rounded-full text-sm bg-red-900/50 text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Upload Image
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

          <div className="aspect-4/3 bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 overflow-hidden flex items-center justify-center">
            {originalImage ? (
              <img
                ref={imageRef}
                src={originalImage}
                alt="Original"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-slate-600 text-sm">
                Upload an image to analyze
              </span>
            )}
          </div>

          <button
            onClick={runHoughAnalysis}
            disabled={!originalImage || !opencvReady || isProcessing}
            className={`mt-4 w-full py-3 rounded-xl font-bold transition-all ${
              !originalImage || !opencvReady || isProcessing
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-linear-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 shadow-lg"
            }`}
          >
            {isProcessing ? "Analyzing..." : "Run Hough Analysis"}
          </button>
        </section>

        {/* Visualization Section */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Debug Overlay
          </h2>

          <div className="aspect-4/3 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center relative">
            {debugData ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-600 text-sm">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                  analytics
                </span>
                Run analysis to see debug overlay
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-500" />
              <span className="text-slate-400">Hough Lines (2px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-slate-400">Intersections (5px)</span>
            </div>
          </div>
        </section>
      </div>

      {/* Statistics Section */}
      {debugData && (
        <section className="mt-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full" />
            Analysis Results
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Hough Lines"
              value={debugData.lines.length}
              color="text-red-400"
            />
            <StatCard
              label="Intersections"
              value={debugData.intersections.length}
              color="text-cyan-400"
            />
            <StatCard
              label="Processed Width"
              value={`${debugData.imageWidth}px`}
              color="text-purple-400"
            />
            <StatCard
              label="Processed Height"
              value={`${debugData.imageHeight}px`}
              color="text-blue-400"
            />
          </div>

          {/* Detailed Line Info */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              Detected Lines (rho, theta)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {debugData.lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs font-mono"
                >
                  <span className="text-red-400">L{idx + 1}:</span>{" "}
                  <span className="text-slate-300">
                    ρ={line.rho.toFixed(1)}, θ=
                    {((line.theta * 180) / Math.PI).toFixed(1)}°
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Intersection Details */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">
              Intersection Points
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {debugData.intersections.map((point, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs font-mono"
                >
                  <span className="text-cyan-400">P{idx + 1}:</span>{" "}
                  <span className="text-slate-300">
                    ({point.x}, {point.y})
                  </span>
                  <div className="text-slate-500 text-[10px]">
                    Lines: L{point.lineIndices[0] + 1} ∩ L
                    {point.lineIndices[1] + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                lightbulb
              </span>
              Diagnosis
            </h3>
            <p className="text-sm text-slate-300">
              {debugData.intersections.length < 4 ? (
                <span className="text-red-400">
                  ❌ Only {debugData.intersections.length} intersections found.
                  Need at least 4 to form a quadrilateral.
                </span>
              ) : debugData.lines.length < 4 ? (
                <span className="text-red-400">
                  ❌ Only {debugData.lines.length} lines detected. Need at least
                  4 lines to form a quadrilateral.
                </span>
              ) : (
                <span className="text-emerald-400">
                  ✓ Found {debugData.lines.length} lines and{" "}
                  {debugData.intersections.length} intersections. Check visual
                  overlay to see if they form a valid card boundary.
                </span>
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
