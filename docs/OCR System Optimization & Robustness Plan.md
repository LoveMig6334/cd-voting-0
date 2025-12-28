# **OCR System Optimization & Robustness Plan**

This document outlines the roadmap for transitioning the current OCR system from a manual, heuristic-based approach to a robust, industry-standard Computer Vision pipeline using OpenCV.js and Next.js.

## **1\. Implementation Checklist**

### **Phase 1: Core Math & Geometry Optimization (Immediate Priority)**

* \[ \] **Delete Manual Math:** Remove solveLinearSystem, invertMatrix3x3, and manual DLT logic from geometry-utils.ts.  
* \[ \] **Adopt OpenCV Homography:** Replace manual transformation logic with cv.getPerspectiveTransform and cv.warpPerspective.  
* \[ \] **Implement Robust Sorting:** Replace "Sum/Difference" corner sorting with **Centroid-based Angular Sorting** to handle \>45° rotation.  
* \[ \] **Enforce Aspect Ratio:** Hardcode the ISO 7810 ID-1 ratio (1.586) for the destination buffer dimensions.

### **Phase 2: Photometric Robustness (Lighting & Glare)**

* \[ \] **Add CLAHE:** Implement Contrast Limited Adaptive Histogram Equalization to handle shadows (Image 1\) and uneven lighting.  
* \[ \] **Tune Gaussian Blur:** Standardize noise reduction with a $5 \\times 5$ kernel ($\\sigma \\approx 1.4$) before edge detection.  
* \[ \] **Glare Detection:** Implement a "Saturation Mask" check (HSV color space) to warn users if glare obscures text (Image 2).

### **Phase 3: Architecture & Performance**

* \[ \] **Web Worker Offloading:** Move all OpenCV processing to a dedicated Worker thread to prevent UI freezing.  
* \[ \] **Memory Hygiene:** Wrap all cv.Mat allocations in try...finally blocks with explicit .delete() calls.  
* \[ \] **Wasm Configuration:** Update next.config.mjs to enable asyncWebAssembly for optimal loading.

## ---

**2\. Detailed Technical Explanations**

### **2.1 Manual Math Code Optimization**

**Current Weakness:** The current geometry-utils.ts manually implements Gaussian elimination and matrix inversion in TypeScript. This is computationally inefficient (JS numbers are 64-bit floats, processed without SIMD optimization) and numerically unstable for near-singular matrices (common in extreme perspective views).

**Optimization:**

* **Action:** Delete custom linear algebra functions.  
* **Replacement:** Use cv.getPerspectiveTransform(srcTri, dstTri).  
* **Benefit:** This runs in WebAssembly (compiled C++), utilizing CPU vector instructions (SIMD) for a 10-20x speedup and higher numerical precision.

### **2.2 Robust Corner Sorting (The "Clockwise" Problem)**

**Current Weakness:** The current orderCorners function uses min(x+y) (Top-Left) and max(x+y) (Bottom-Right).

* *Failure Mode:* If the card is rotated by 90° or if the camera angle is steep, the geometric "sum" heuristic fails, causing the "Top-Left" corner to be misidentified as "Top-Right," leading to a twisted (bowtie) or sideways crop.1

**Optimization:**

* **Action:** Implement **Centroid Angular Sorting**.  
  1. Compute the center mean: $\\bar{x} \= \\sum x\_i / 4, \\bar{y} \= \\sum y\_i / 4$.  
  2. Calculate angle for each point: $\\theta \= \\text{atan2}(y \- \\bar{y}, x \- \\bar{x})$.  
  3. Sort points by $\\theta$.  
* **Benefit:** This guarantees a mathematically consistent counter-clockwise order regardless of the card's rotation in the frame.

### **2.3 Photometric Normalization (Lighting & Glare)**

**Current Weakness:** The system likely uses standard grayscale conversion or global thresholding.

* *Failure Mode:* In **Image 1**, the top right is shadowed. Global thresholds will treat the shadow as "black text," losing the card boundary. In **Image 2**, the flash creates a "white hole" (specular reflection).

**Optimization:**

* **Action:** Use **CLAHE (Contrast Limited Adaptive Histogram Equalization)**.  
  * Unlike global equalization, CLAHE enhances contrast locally in small tiles ($8 \\times 8$). It brings out edge details in shadows without over-amplifying noise in the flat yellow regions.3  
* **Glare Safety:** Convert the image to HSV. Pixels with High Value (\>230) and Low Saturation (\<40) are glare. If $\>5\\%$ of the card area is glare, reject the frame and prompt the user to "Tilt Card".5

### **2.4 ISO 7810 Aspect Ratio Restoration**

**Current Weakness:** Calculating the aspect ratio from the detected corners ($W\_{detected} / H\_{detected}$) is flawed because perspective distortion *changes* the apparent aspect ratio.

**Optimization:**

* **Action:** Use the "Prior Knowledge" property.  
  * Thai National ID Cards follow the **ISO 7810 ID-1 standard**: $85.60 \\text{mm} \\times 53.98 \\text{mm}$.  
  * Target Ratio: **1.586**.  
* **Algorithm:**  
  1. Measure the widest detected edge ($W\_{max}$) in pixels.  
  2. Set destination width: $W\_{dst} \= W\_{max}$.  
  3. Force destination height: $H\_{dst} \= \\text{round}(W\_{max} / 1.586)$.  
  4. Warp source corners to $$.  
* **Benefit:** This restores the *physical* shape of the card, preventing stretched or squashed text that causes OCR to fail.6

### **2.5 Edge Detection Pipeline (Canny)**

**Current Weakness:** Manual Sobel implementation is noisy and lacks hysteresis (continuity checking).

**Optimization:**

* **Action:** Utilize cv.Canny.  
  * Set $Threshold\_1$ (low) and $Threshold\_2$ (high) dynamically based on the median image intensity.  
  * Use cv.approxPolyDP with $\\epsilon \= 0.02 \\times \\text{perimeter}$ to approximate the contour.  
  * Strictly filter for vertices \== 4 and isContourConvex(approx) \== true.8

#### **Works cited**

1. Ordering coordinates clockwise with Python and OpenCV \- PyImageSearch, accessed December 26, 2025, [https://pyimagesearch.com/2016/03/21/ordering-coordinates-clockwise-with-python-and-opencv/](https://pyimagesearch.com/2016/03/21/ordering-coordinates-clockwise-with-python-and-opencv/)  
2. Ordering coordinates from top left to bottom right \- Stack Overflow, accessed December 26, 2025, [https://stackoverflow.com/questions/29630052/ordering-coordinates-from-top-left-to-bottom-right](https://stackoverflow.com/questions/29630052/ordering-coordinates-from-top-left-to-bottom-right)  
3. Histogram Equalization in Machine Vision Systems for 2025 \- UnitX, accessed December 26, 2025, [https://www.unitxlabs.com/histogram-equalization-machine-vision-system-2025-guide/](https://www.unitxlabs.com/histogram-equalization-machine-vision-system-2025-guide/)  
4. Anti-Glare: Tightly Constrained Optimization for Eyeglass Reflection Removal, accessed December 26, 2025, [https://www.researchgate.net/publication/320971302\_Anti-Glare\_Tightly\_Constrained\_Optimization\_for\_Eyeglass\_Reflection\_Removal](https://www.researchgate.net/publication/320971302_Anti-Glare_Tightly_Constrained_Optimization_for_Eyeglass_Reflection_Removal)  
5. How to detect a flash / Glare in an image of document using skimage / opencv in python?, accessed December 26, 2025, [https://stackoverflow.com/questions/68610607/how-to-detect-a-flash-glare-in-an-image-of-document-using-skimage-opencv-in](https://stackoverflow.com/questions/68610607/how-to-detect-a-flash-glare-in-an-image-of-document-using-skimage-opencv-in)  
6. What are the dimensions of a business card? \- Graphic Design Stack Exchange, accessed December 26, 2025, [https://graphicdesign.stackexchange.com/questions/629/what-are-the-dimensions-of-a-business-card](https://graphicdesign.stackexchange.com/questions/629/what-are-the-dimensions-of-a-business-card)  
7. Aspect Ratio Calculator, accessed December 26, 2025, [https://www.omnicalculator.com/other/aspect-ratio](https://www.omnicalculator.com/other/aspect-ratio)  
8. How to detect document edges in OpenCV \- Scanbot SDK, accessed December 26, 2025, [https://scanbot.io/techblog/document-edge-detection-with-opencv/](https://scanbot.io/techblog/document-edge-detection-with-opencv/)