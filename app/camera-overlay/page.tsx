"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CameraOverlay() {
  const router = useRouter();

  // Simulate scanning process
  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate to dashboard after "scanning"
      router.push("/");
    }, 3500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative h-screen w-full flex flex-col bg-black text-white overflow-hidden">
      {/* Background Camera Feed Simulation */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://picsum.photos/seed/desk/1080/1920"
          alt="Camera Feed"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col h-full w-full">
        {/* Top Mask */}
        <div className="flex-1 w-full bg-black/60 flex flex-col relative transition-all duration-300">
          <div className="w-full p-4 pt-12 lg:pt-8 flex justify-between items-start">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="mt-auto pb-6 w-full text-center px-8">
            <p className="text-white/90 text-base font-medium drop-shadow-md tracking-wide">
              Position your Student ID inside the frame
            </p>
          </div>
        </div>

        {/* Scanning Area */}
        <div className="h-[230px] w-full flex shrink-0">
          <div className="flex-1 bg-black/60"></div>
          <div className="relative h-full aspect-[1.586/1] max-w-[90vw]">
            {/* Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl drop-shadow-md"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl drop-shadow-md"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl drop-shadow-md"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl drop-shadow-md"></div>

            {/* Scan Line */}
            <div className="absolute inset-x-4 h-[2px] bg-primary shadow-[0_0_15px_rgba(19,127,236,0.8)] animate-scan z-20"></div>
          </div>
          <div className="flex-1 bg-black/60"></div>
        </div>

        {/* Bottom Mask */}
        <div className="flex-1 w-full bg-black/60 relative flex flex-col justify-end">
          <div className="w-full px-8 pb-12 pt-8 flex items-center justify-between max-w-md mx-auto">
            <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md border border-white/10">
              <span className="material-symbols-outlined">flash_off</span>
            </button>
            <button className="flex shrink-0 items-center justify-center rounded-full size-20 border-[5px] border-white bg-transparent active:scale-95 transition-all">
              <div className="size-[60px] rounded-full bg-primary shadow-inner"></div>
            </button>
            <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md border border-white/10">
              <span className="material-symbols-outlined">flip_camera_ios</span>
            </button>
          </div>
          <div className="h-6 w-full"></div>
        </div>
      </div>
    </div>
  );
}
