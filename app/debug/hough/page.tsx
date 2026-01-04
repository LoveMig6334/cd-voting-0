"use client";

import { loadOpenCV } from "@/lib/ocr";
import { CANNY_EDGE_DETECTION } from "@/lib/ocr/constants";
import {
  AccumulatorData,
  drawDebugOverlay,
  extractHoughDebugData,
  HoughDebugResult,
  Point,
  QuadContour,
} from "@/lib/ocr/debug-visualizer";
import React, { useCallback, useEffect, useRef, useState } from "react";

export default function HoughDebugPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<HoughDebugResult | null>(null);
  const [allThresholdResults, setAllThresholdResults] = useState<
    HoughDebugResult[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvReady, setOpencvReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const runHoughAnalysis = useCallback(
    async (customThreshold?: number) => {
      if (!originalImage || !opencvReady) return;

      setIsProcessing(true);
      setError(null);

      try {
        const result = await extractHoughDebugData(
          originalImage,
          customThreshold
        );
        if (result) {
          setDebugData(result);
          console.log(
            `🔍 Found ${result.lines.length} Hough lines and ${result.intersections.length} intersections (threshold: ${result.threshold})`
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
    },
    [originalImage, opencvReady]
  );

  // Run analysis with all thresholds from constants
  const runAllThresholds = useCallback(async () => {
    if (!originalImage || !opencvReady) return;

    setIsProcessing(true);
    setError(null);
    setAllThresholdResults([]);

    const thresholds = CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS;
    const results: HoughDebugResult[] = [];

    try {
      for (const thresh of thresholds) {
        const result = await extractHoughDebugData(originalImage, thresh);
        if (result) {
          results.push(result);
          console.log(
            `🔍 Threshold ${thresh}: ${result.lines.length} lines, ${result.intersections.length} intersections`
          );
        }
      }

      setAllThresholdResults(results);

      // Also set the first result as the main display
      if (results.length > 0) {
        setDebugData(results[0]);
      }
    } catch (err) {
      console.error("Multi-threshold analysis error:", err);
      setError("Error during multi-threshold analysis");
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, opencvReady]);

  // Handle threshold change with debounce
  const handleThresholdChange = useCallback(
    (newThreshold: number) => {
      setThreshold(newThreshold);

      // Debounce the analysis
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (originalImage && opencvReady) {
        debounceRef.current = setTimeout(() => {
          runHoughAnalysis(newThreshold);
        }, 200);
      }
    },
    [originalImage, opencvReady, runHoughAnalysis]
  );

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
          Visualize detected lines, intersection points, and accumulator space
          for quadrilateral detection debugging
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Threshold Slider */}
          <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">
                Hough Threshold
              </label>
              <span className="text-sm font-mono text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">
                {threshold}
              </span>
            </div>
            <input
              type="range"
              min="25"
              max="250"
              value={threshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-cyan-400
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-all
                [&::-webkit-slider-thumb]:hover:bg-cyan-300"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>25 (More lines)</span>
              <span>250 (Fewer lines)</span>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => runHoughAnalysis(threshold)}
              disabled={!originalImage || !opencvReady || isProcessing}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                !originalImage || !opencvReady || isProcessing
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-linear-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 shadow-lg"
              }`}
            >
              {isProcessing ? "Analyzing..." : "Run with Slider"}
            </button>
            <button
              onClick={runAllThresholds}
              disabled={!originalImage || !opencvReady || isProcessing}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                !originalImage || !opencvReady || isProcessing
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-lg"
              }`}
              title={`Runs all thresholds: ${CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS.join(
                ", "
              )}`}
            >
              {isProcessing
                ? "Running..."
                : `All Constants (${CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS.length} thresholds)`}
            </button>
          </div>

          {/* Threshold Comparison Results */}
          {allThresholdResults.length > 0 && (
            <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">
                Threshold Comparison
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {allThresholdResults.map((result, idx) => (
                  <button
                    key={result.threshold}
                    onClick={() => setDebugData(result)}
                    className={`p-2 rounded-lg text-xs text-left transition-all ${
                      debugData?.threshold === result.threshold
                        ? "bg-cyan-600/30 border border-cyan-500"
                        : "bg-slate-800 border border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="font-mono text-cyan-400">
                      T={result.threshold}
                    </div>
                    <div className="text-slate-400">
                      {result.lines.length} lines, {result.intersections.length}{" "}
                      pts
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Accumulator Heatmap Section */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Hough Accumulator (ρ-θ Space)
          </h2>
          {debugData?.accumulator ? (
            <>
              <p className="text-sm text-slate-400 mb-4">
                Bright spots indicate high vote counts — detected lines.
                Threshold:{" "}
                <span className="text-cyan-400 font-mono">
                  {debugData.threshold}
                </span>
              </p>
              <AccumulatorHeatmap
                accumulator={debugData.accumulator}
                lines={debugData.lines}
                threshold={debugData.threshold}
                imageWidth={debugData.imageWidth}
                imageHeight={debugData.imageHeight}
              />
            </>
          ) : (
            <div className="aspect-4/3 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center">
              <div className="text-center text-slate-600 text-sm">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                  grid_on
                </span>
                Run analysis to see accumulator
              </div>
            </div>
          )}
        </section>

        {/* Visualization Section */}
        <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
              3
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
              <span className="text-slate-400">Horizontal Lines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-500" />
              <span className="text-slate-400">Vertical Lines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-slate-400">Intersections</span>
            </div>
          </div>
        </section>
      </div>

      {/* Quadrilaterals Panel */}
      {debugData && (
        <section className="mt-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold">
              4
            </span>
            Quadrilateral Detection
            <span className="ml-auto text-sm font-normal text-slate-400">
              {debugData.quadrilaterals.length} candidates found
            </span>
          </h2>

          {debugData.quadrilaterals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debugData.quadrilaterals.map((quad, idx) => (
                <QuadrilateralCard
                  key={idx}
                  quad={quad}
                  index={idx}
                  isBest={debugData.bestQuadrilateral === quad}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 text-center text-slate-500">
              <span className="material-symbols-outlined text-3xl opacity-50 block mb-2">
                crop_free
              </span>
              No quadrilaterals detected. Try adjusting the threshold.
            </div>
          )}

          {debugData.bestQuadrilateral && (
            <div className="mt-4 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600/50">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-semibold">Best Match Found</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Aspect ratio:{" "}
                {debugData.bestQuadrilateral.aspectRatio.toFixed(3)} | Area:{" "}
                {Math.round(debugData.bestQuadrilateral.area).toLocaleString()}{" "}
                px² | Score: {debugData.bestQuadrilateral.score.toFixed(0)}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Statistics Section */}
      {debugData && (
        <section className="mt-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full" />
            Analysis Results
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
              label="Threshold Used"
              value={debugData.threshold}
              color="text-orange-400"
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

          {/* Vertical/Horizontal Line Merge Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Raw Vertical"
              value={debugData.rawVerticalCount}
              color="text-blue-400"
            />
            <StatCard
              label="Merged Vertical"
              value={debugData.mergedVerticalCount}
              color="text-blue-300"
            />
            <StatCard
              label="Raw Horizontal"
              value={debugData.rawHorizontalCount}
              color="text-red-400"
            />
            <StatCard
              label="Merged Horizontal"
              value={debugData.mergedHorizontalCount}
              color="text-red-300"
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
                  <span
                    className={
                      line.category === "vertical"
                        ? "text-blue-400"
                        : "text-red-400"
                    }
                  >
                    L{idx + 1}:
                  </span>{" "}
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
                  Need at least 4 to form a quadrilateral. Try lowering the
                  threshold.
                </span>
              ) : debugData.lines.length < 4 ? (
                <span className="text-red-400">
                  ❌ Only {debugData.lines.length} lines detected. Need at least
                  4 lines to form a quadrilateral. Try lowering the threshold.
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

// ============================================================================
// Quadrilateral Card Component
// ============================================================================

interface QuadrilateralCardProps {
  quad: QuadContour;
  index: number;
  isBest: boolean;
  scale: number;
}

function QuadrilateralCard({
  quad,
  index,
  isBest,
}: Omit<QuadrilateralCardProps, "scale">) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isBest
          ? "bg-emerald-900/30 border-emerald-500"
          : quad.isValid
          ? "bg-slate-900/50 border-slate-600"
          : "bg-red-900/20 border-red-700/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-300">
          Quad #{index + 1}
        </span>
        {isBest && (
          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
            BEST
          </span>
        )}
        {!quad.isValid && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
            INVALID
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Aspect Ratio:</span>
          <span className={quad.isValid ? "text-emerald-400" : "text-red-400"}>
            {quad.aspectRatio.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Area:</span>
          <span className="text-cyan-400">
            {Math.round(quad.area).toLocaleString()} px²
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Score:</span>
          <span className="text-yellow-400">{quad.score.toFixed(0)}</span>
        </div>
      </div>

      {/* Mini corner preview */}
      <div className="mt-2 text-[10px] text-slate-500 font-mono">
        [{quad.corners.map((c: Point) => `(${c.x},${c.y})`).join(" → ")}]
      </div>
    </div>
  );
}

// ============================================================================
// Accumulator Heatmap Component
// ============================================================================

interface AccumulatorHeatmapProps {
  accumulator: AccumulatorData;
  lines: { rho: number; theta: number }[];
  threshold: number;
  imageWidth?: number;
  imageHeight?: number;
}

function AccumulatorHeatmap({
  accumulator,
  lines,
  threshold,
  imageWidth = 500, // Default to RESCALED_HEIGHT dimension
  imageHeight = 500,
}: AccumulatorHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { votes, maxVotes, thetaSteps, rhoSteps } = accumulator;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render at high resolution matching input image dimensions
    // Use the image width for theta axis and proportional height for rho
    const displayWidth = Math.max(imageWidth, 400);
    const displayHeight = Math.max(imageHeight, 300);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Use ImageData for pixel-level control with higher resolution
    const imageData = ctx.createImageData(displayWidth, displayHeight);
    const data = imageData.data;

    // Draw heatmap with bilinear interpolation for smoother rendering
    for (let y = 0; y < displayHeight; y++) {
      for (let x = 0; x < displayWidth; x++) {
        // Map display coordinates back to accumulator coordinates
        const t = (x / displayWidth) * thetaSteps;
        const r = (y / displayHeight) * rhoSteps;

        // Get integer indices
        const t0 = Math.floor(t);
        const t1 = Math.min(t0 + 1, thetaSteps - 1);
        const r0 = Math.floor(r);
        const r1 = Math.min(r0 + 1, rhoSteps - 1);

        // Bilinear interpolation weights
        const tx = t - t0;
        const ty = r - r0;

        // Get vote counts at corners (with bounds checking)
        const v00 = t0 < thetaSteps && r0 < rhoSteps ? votes[t0][r0] : 0;
        const v01 = t0 < thetaSteps && r1 < rhoSteps ? votes[t0][r1] : 0;
        const v10 = t1 < thetaSteps && r0 < rhoSteps ? votes[t1][r0] : 0;
        const v11 = t1 < thetaSteps && r1 < rhoSteps ? votes[t1][r1] : 0;

        // Interpolate
        const voteCount =
          (1 - tx) * (1 - ty) * v00 +
          (1 - tx) * ty * v01 +
          tx * (1 - ty) * v10 +
          tx * ty * v11;

        const normalized = maxVotes > 0 ? voteCount / maxVotes : 0;
        const color = getHeatmapColor(normalized);

        const pixelIndex = (y * displayWidth + x) * 4;
        data[pixelIndex] = color.r;
        data[pixelIndex + 1] = color.g;
        data[pixelIndex + 2] = color.b;
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw detected line markers at high resolution
    if (maxVotes > 0) {
      for (const line of lines) {
        const thetaNorm = line.theta / Math.PI;
        const xPos = thetaNorm * displayWidth;

        const rhoMax = Math.ceil(Math.sqrt(500 * 500 + 500 * 500));
        const rhoNorm = (line.rho + rhoMax) / (rhoMax * 2);
        const yPos = rhoNorm * displayHeight;

        if (
          xPos >= 0 &&
          xPos < displayWidth &&
          yPos >= 0 &&
          yPos < displayHeight
        ) {
          // Draw a more visible marker
          ctx.strokeStyle = "#00ffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(xPos, yPos, 6, 0, Math.PI * 2);
          ctx.stroke();

          // Add crosshair
          ctx.beginPath();
          ctx.moveTo(xPos - 10, yPos);
          ctx.lineTo(xPos + 10, yPos);
          ctx.moveTo(xPos, yPos - 10);
          ctx.lineTo(xPos, yPos + 10);
          ctx.stroke();
        }
      }
    }
  }, [
    votes,
    maxVotes,
    thetaSteps,
    rhoSteps,
    lines,
    threshold,
    imageWidth,
    imageHeight,
  ]);

  return (
    <div className="relative">
      <div className="overflow-auto rounded-xl border border-slate-700 bg-slate-900">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
        />
      </div>

      {/* Axis Labels */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>θ = 0°</span>
        <span>θ = 90°</span>
        <span>θ = 180°</span>
      </div>

      {/* Color Scale Legend */}
      <div className="mt-4 flex items-center gap-4">
        <span className="text-xs text-slate-400">Vote Count:</span>
        <div
          className="flex-1 h-4 rounded-full overflow-hidden"
          style={{
            background:
              "linear-gradient(to right, #000, #4B0082, #FF0000, #FF8C00, #FFFF00, #FFFFFF)",
          }}
        />
        <div className="flex gap-4 text-xs text-slate-500">
          <span>0</span>
          <span>{Math.round(maxVotes / 2)}</span>
          <span>{maxVotes}</span>
        </div>
      </div>

      {/* Detected Peaks Legend */}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <div className="w-3 h-3 rounded-full border-2 border-cyan-400" />
        <span>Detected line peaks (above threshold)</span>
      </div>
    </div>
  );
}

/**
 * Convert normalized value (0-1) to heatmap color
 */
function getHeatmapColor(value: number): { r: number; g: number; b: number } {
  // Multi-stop gradient: black -> indigo -> red -> orange -> yellow -> white
  const stops = [
    { pos: 0.0, r: 0, g: 0, b: 0 }, // Black
    { pos: 0.2, r: 75, g: 0, b: 130 }, // Indigo
    { pos: 0.4, r: 255, g: 0, b: 0 }, // Red
    { pos: 0.6, r: 255, g: 140, b: 0 }, // Orange
    { pos: 0.8, r: 255, g: 255, b: 0 }, // Yellow
    { pos: 1.0, r: 255, g: 255, b: 255 }, // White
  ];

  // Find the two stops to interpolate between
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].pos && value <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  // Interpolate
  const range = upper.pos - lower.pos;
  const t = range > 0 ? (value - lower.pos) / range : 0;

  return {
    r: Math.round(lower.r + (upper.r - lower.r) * t),
    g: Math.round(lower.g + (upper.g - lower.g) * t),
    b: Math.round(lower.b + (upper.b - lower.b) * t),
  };
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
