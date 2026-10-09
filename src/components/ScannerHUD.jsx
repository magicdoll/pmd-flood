import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, CameraOff, RefreshCw, Zap, ZapOff, Play, Pause, 
  Image as ImageIcon, Sparkles, Scan, QrCode, Type, Layers, Crosshair, SwitchCamera
} from 'lucide-react';
import { initOcrWorker, preprocessCanvas, extractAndMatchTag, scanQrFromCanvas } from '../utils/ocrScanner';
import { unlockAudioOnUserGesture } from '../utils/audio';

export default function ScannerHUD({
  databaseItems,
  onTagDetected,
  isPaused,
  setIsPaused
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scan Mode: 'QR' | 'OCR' | 'HYBRID'
  const [scanMode, setScanMode] = useState('QR');

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetectedText, setLastDetectedText] = useState('');

  const workerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  // Initialize OCR Worker in background
  useEffect(() => {
    let mounted = true;
    initOcrWorker().then(worker => {
      if (mounted) {
        workerRef.current = worker;
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Enumerate Video Devices
  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        const backCam = videoDevs.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('environment') || 
          d.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
      }
    } catch (err) {
      console.warn('Cannot enumerate devices:', err);
    }
  }, [selectedDeviceId]);

  // Start Camera Stream
  const startCamera = useCallback(async (deviceId = null, preferFacing = 'environment') => {
    try {
      unlockAudioOnUserGesture();
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream = null;
      try {
        const constraints = {
          video: deviceId 
            ? { deviceId: { exact: deviceId } } 
            : { 
                facingMode: { ideal: preferFacing },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Initial constraints failed, retrying with fallback:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: preferFacing }, 
          audio: false 
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraActive(true);
      await getCameraDevices();

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
      setTorchSupported(!!capabilities.torch);

    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('กรุณากดอนุญาตการใช้กล้อง (Allow Camera) ในเบราว์เซอร์');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('ไม่พบอุปกรณ์กล้องบนเครื่องนี้');
      } else {
        setCameraError(`ไม่สามารถเปิดกล้องได้: ${err.message || 'โปรดกดใหม่อีกครั้ง'}`);
      }
      setCameraActive(false);
    }
  }, [getCameraDevices]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Flip Camera (Toggle between Back / Front camera on mobile)
  const flipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedDeviceId(''); // clear exact device ID to allow facingMode switch
    startCamera(null, nextFacing);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch Device
  const handleDeviceChange = (e) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    startCamera(devId);
  };

  // Real-time Scanning Loop
  useEffect(() => {
    let isActive = true;

    const scanLoop = async () => {
      if (!isActive) return;

      if (videoRef.current && cameraActive && !isPaused) {
        const video = videoRef.current;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          const now = performance.now();
          const qrInterval = 100; // scan QR every 100ms
          const ocrInterval = 1000; // scan OCR every 1000ms

          if (now - lastScanTimeRef.current >= qrInterval) {
            lastScanTimeRef.current = now;

            try {
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              const canvas = canvasRef.current || document.createElement('canvas');
              canvas.width = vw;
              canvas.height = vh;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, vw, vh);

              // 1. Scan QR Code
              if (scanMode === 'QR' || scanMode === 'HYBRID') {
                const qrResult = await scanQrFromCanvas(canvas);
                if (qrResult && qrResult.rawValue) {
                  const rawVal = qrResult.rawValue;
                  setLastDetectedText(`QR: ${rawVal}`);
                  
                  const match = extractAndMatchTag(rawVal, databaseItems);
                  if (match) {
                    onTagDetected({
                      ...match,
                      method: 'QR_CODE_SCANNER'
                    });
                  }
                }
              }

              // 2. Scan OCR Text
              if ((scanMode === 'OCR' || scanMode === 'HYBRID') && workerRef.current && !isProcessing) {
                if (scanMode === 'OCR' || (now % ocrInterval < 120)) {
                  setIsProcessing(true);
                  const roiW = Math.floor(vw * 0.75);
                  const roiH = Math.floor(vh * 0.55);
                  const roiX = Math.floor((vw - roiW) / 2);
                  const roiY = Math.floor((vh - roiH) / 2);

                  const roiCanvas = preprocessCanvas(canvas, { x: roiX, y: roiY, width: roiW, height: roiH });
                  const ocrRes = await workerRef.current.recognize(roiCanvas);
                  const text = ocrRes?.data?.text || '';

                  if (text.trim()) {
                    setLastDetectedText(`OCR: ${text.replace(/[\n\r]+/g, ' ').slice(0, 25)}`);
                    const match = extractAndMatchTag(text, databaseItems);
                    if (match) {
                      onTagDetected(match);
                    }
                  }
                  setIsProcessing(false);
                }
              }

            } catch (err) {}
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(scanLoop);

    return () => {
      isActive = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive, isPaused, scanMode, databaseItems, onTagDetected, isProcessing]);

  // Initial Camera Start
  useEffect(() => {
    startCamera(null, 'environment');
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Image Upload Scan
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Try QR code first
      const qrResult = await scanQrFromCanvas(canvas);
      if (qrResult && qrResult.rawValue) {
        setLastDetectedText(`QR: ${qrResult.rawValue}`);
        const match = extractAndMatchTag(qrResult.rawValue, databaseItems);
        if (match) {
          onTagDetected({ ...match, method: 'QR_FROM_IMAGE' });
          return;
        }
      }

      // Fallback OCR
      if (workerRef.current) {
        const preCanvas = preprocessCanvas(canvas);
        const result = await workerRef.current.recognize(preCanvas);
        const text = result?.data?.text || '';
        setLastDetectedText(`Text: ${text.slice(0, 30)}`);

        const match = extractAndMatchTag(text, databaseItems);
        if (match) {
          onTagDetected(match);
          return;
        }
      }

      alert('ไม่พบ QR Code หรือตัวเลข Tag ในรูปภาพนี้');
    } catch (err) {
      alert(`ไม่สามารถอ่านรูปภาพได้: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden glass-panel border border-slate-700/60 shadow-2xl flex flex-col bg-slate-950">
      
      {/* Top HUD Bar & Mode Switcher */}
      <div className="px-3 sm:px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 z-10 text-xs">
        
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setScanMode('QR')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition text-[11px] sm:text-xs ${
              scanMode === 'QR' 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => setScanMode('OCR')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition text-[11px] sm:text-xs ${
              scanMode === 'OCR' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>ตัวหนังสือ OCR</span>
          </button>

          <button
            onClick={() => setScanMode('HYBRID')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition text-[11px] sm:text-xs hidden sm:flex ${
              scanMode === 'HYBRID' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ทั้งคู่</span>
          </button>
        </div>

        {/* Live Status & Flip Camera button */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {cameraActive && (
            <button
              onClick={flipCamera}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 flex items-center gap-1 text-[11px] font-medium transition"
              title="สลับกล้องหน้า / กล้องหลัง"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สลับกล้อง</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-medium">
            <span className={`inline-block w-2 h-2 rounded-full ${cameraActive ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{cameraActive ? (isPaused ? 'หยุดชั่วคราว' : 'กำลังสแกนสด') : 'ปิดอยู่'}</span>
          </div>
        </div>

      </div>

      {/* Main Video Viewport (Responsive aspect ratio: 4/3 on mobile portrait, 16/10 on desktop) */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden touch-none">
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Camera Off State */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-slate-950/95 z-20">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 sm:mb-4 shadow-xl shadow-indigo-500/10 animate-bounce">
              <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-sky-400" />
            </div>
            
            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-display">
              แตะปุ่มด้านล่างเพื่อเปิดกล้องมือถือ / Notebook
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-5 leading-relaxed">
              {cameraError ? (
                <span className="text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30 block">
                  {cameraError}
                </span>
              ) : (
                'ส่อง QR Code ที่หน้าตู้ PMD เพื่อดูหมายเลขลำดับทันที'
              )}
            </p>

            <div className="flex flex-wrap gap-2.5 justify-center w-full max-w-xs">
              <button
                onClick={() => startCamera(selectedDeviceId, facingMode)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-cyan-500 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>เปิดกล้องสแกน (Start Camera)</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>เลือกรูปถ่ายจากเครื่อง</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera Active HUD Overlays */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
            
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            {/* Central QR Code Target Box */}
            <div className="relative w-[75%] sm:w-[60%] aspect-square max-h-[75%] border-2 border-dashed border-sky-400/80 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.25)] bg-sky-500/[0.04]">
              
              {/* Corner Reticle Accents */}
              <div className="absolute -top-3 -left-3 w-7 h-7 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
              <div className="absolute -top-3 -right-3 w-7 h-7 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
              <div className="absolute -bottom-3 -left-3 w-7 h-7 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
              <div className="absolute -bottom-3 -right-3 w-7 h-7 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />

              {/* Animated Laser Beam */}
              {!isPaused && (
                <div className="laser-beam absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]" />
              )}

              {/* Center Target Icon */}
              <div className="opacity-25">
                <QrCode className="w-14 h-14 sm:w-16 sm:h-16 text-sky-300 stroke-1" />
              </div>

              {/* Prompt Label */}
              <div className="absolute -bottom-9 bg-slate-900/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-sky-400/40 text-[11px] text-sky-200 font-medium tracking-wide shadow-lg">
                วาง <strong className="text-white">QR Code</strong> ให้อยู่ในกรอบนี้
              </div>
            </div>

            {/* Live Readout Pill */}
            {lastDetectedText && (
              <div className="absolute top-2 left-3 right-3 text-center pointer-events-none">
                <span className="inline-block bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 text-[11px] font-mono text-emerald-400 max-w-[90%] truncate shadow-lg">
                  {lastDetectedText}
                </span>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Bottom Control Bar */}
      <div className="p-2.5 sm:p-3 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between gap-2 z-10">
        
        {/* Device Dropdown (Desktop / Multi-camera) */}
        <div className="hidden sm:flex items-center space-x-1.5 flex-1 min-w-[160px]">
          <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            disabled={devices.length === 0}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-sky-500 focus:outline-none w-full max-w-xs truncate"
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `กล้อง ${idx + 1}`}
              </option>
            ))}
            {devices.length === 0 && <option value="">ไม่พบรายการกล้อง</option>}
          </select>
        </div>

        {/* Mobile Quick Controls */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
          
          {/* Flip camera on mobile */}
          <button
            onClick={flipCamera}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 sm:hidden"
            title="สลับกล้องหน้า/หลัง"
          >
            <SwitchCamera className="w-4 h-4" />
            <span>สลับกล้อง</span>
          </button>

          {/* Torch toggle */}
          {torchSupported && cameraActive && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border text-xs transition ${
                torchOn 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Pause / Resume */}
          {cameraActive && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                isPaused 
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' 
                  : 'bg-amber-600/30 text-amber-300 border-amber-500/50'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'สแกนต่อ' : 'หยุด'}</span>
            </button>
          )}

          {/* Upload photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="เลือกรูปภาพเพื่อสแกน"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">เลือกรูป</span>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Open/Close Camera Toggle */}
          <button
            onClick={cameraActive ? stopCamera : () => startCamera(selectedDeviceId, facingMode)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              cameraActive 
                ? 'bg-rose-600/20 text-rose-300 border-rose-500/40' 
                : 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
            }`}
          >
            {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
            <span>{cameraActive ? 'ปิด' : 'เปิดกล้อง'}</span>
          </button>

        </div>

      </div>

    </div>
  );
}
