import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, CameraOff, Zap, ZapOff, SwitchCamera, QrCode, 
  Volume2, VolumeX, Mic, MicOff, CheckCircle2, AlertCircle, 
  Tag, Hash, Layers, ArrowLeft, RefreshCw, Sparkles, Box, Check, Copy
} from 'lucide-react';
import { scanQrFromCanvas, extractAndMatchTag } from '../utils/ocrScanner';
import { playSuccessBeep, playNotFoundBeep, speakResult, unlockAudioOnUserGesture, triggerHaptic } from '../utils/audio';
import confetti from 'canvas-confetti';

export default function FullscreenScannerPage({
  databaseItems,
  onBackToDashboard,
  voiceEnabled,
  setVoiceEnabled,
  beepEnabled,
  setBeepEnabled,
  onOpenManual,
  onOpenUpload
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  
  // 3-second Auto-Hide Timer Ref
  const hideTimerRef = useRef(null);
  const lastSpokenTagRef = useRef({ tag: null, time: 0 });

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera default
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Active Popup State
  const [activePopup, setActivePopup] = useState(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [copied, setCopied] = useState(false);

  // Total & Scanned stats
  const totalCount = databaseItems.length;
  const scannedCount = databaseItems.filter(i => i.scanned).length;

  // Start Camera
  const startCamera = useCallback(async (preferFacing = 'environment') => {
    try {
      unlockAudioOnUserGesture();
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream = null;
      try {
        const constraints = {
          video: {
            facingMode: { ideal: preferFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
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

      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
      setTorchSupported(!!capabilities.torch);

    } catch (err) {
      console.error('AR Camera error:', err);
      if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
        setCameraError('กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น: กรุณาปิดแอป Camera ของ Windows, MS Teams, Zoom หรือแท็บเบราว์เซอร์อื่นที่เปิดกล้องอยู่ แล้วกดเปิดกล้องใหม่อีกครั้ง');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('กรุณากดอนุญาตการใช้กล้อง (Allow Camera) ในเบราว์เซอร์');
      } else if (err.name === 'NotFoundError') {
        setCameraError('ไม่พบอุปกรณ์กล้องบนเครื่องนี้');
      } else {
        setCameraError(`ไม่สามารถเปิดกล้องได้ (${err.name || 'Error'}): ${err.message || 'โปรดกดใหม่อีกครั้ง'}`);
      }
      setCameraActive(false);
    }
  }, []);

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

  // Flip Camera
  const flipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        const nextTorch = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
        setTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Reset or Start the 3-Second Auto-Hide Countdown
  const startAutoHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setIsFadingOut(false);

    // Wait 3 seconds, then start fade-out and hide
    hideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setActivePopup(null);
        setIsFadingOut(false);
      }, 400); // 400ms fade transition
    }, 3000); // 3000ms (3 seconds delay requested)
  }, []);

  // Handle QR code detection in AR mode
  const handleQrDetected = useCallback((rawCode) => {
    if (!rawCode) return;

    unlockAudioOnUserGesture();

    const match = extractAndMatchTag(rawCode, databaseItems);
    const now = Date.now();
    const isSameRecent = (lastSpokenTagRef.current.tag === rawCode) && (now - lastSpokenTagRef.current.time < 3500);

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Set popup state
    setActivePopup({
      scannedRaw: rawCode,
      matchedTag: match ? match.matchedTag : rawCode,
      item: match ? match.item : null,
      timestamp: timeStr
    });

    // Reset the 3s hide timer every time QR is in frame
    startAutoHideTimer();

    // Voice & Beep Announcement
    if (!isSameRecent) {
      lastSpokenTagRef.current = { tag: rawCode, time: now };

      if (match && match.item) {
        if (beepEnabled) playSuccessBeep();
        if (voiceEnabled) {
          const speechText = `ลำดับ ${match.item.order} ${match.item.asset ? `แอสเซท ${match.item.asset}` : ''}`;
          speakResult(speechText);
        }
        try {
          confetti({
            particleCount: 25,
            spread: 45,
            origin: { y: 0.75 },
            colors: ['#38bdf8', '#6366f1', '#10b981']
          });
        } catch (e) {}
      } else {
        if (beepEnabled) playNotFoundBeep();
        if (voiceEnabled) {
          speakResult(`ไม่พบข้อมูลในระบบ`);
        }
      }
    }
  }, [databaseItems, beepEnabled, voiceEnabled, startAutoHideTimer]);

  // Real-time AR Scan Loop
  useEffect(() => {
    let isActive = true;

    const scanLoop = async () => {
      if (!isActive) return;

      if (videoRef.current && cameraActive) {
        const video = videoRef.current;

        if (video.readyState >= 2 && video.videoWidth > 0) {
          const now = performance.now();
          if (now - lastScanTimeRef.current >= 90) { // scan every 90ms
            lastScanTimeRef.current = now;

            try {
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              const canvas = canvasRef.current || document.createElement('canvas');
              canvas.width = vw;
              canvas.height = vh;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, vw, vh);

              const qrResult = await scanQrFromCanvas(canvas);
              if (qrResult && qrResult.rawValue) {
                handleQrDetected(qrResult.rawValue);
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
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [cameraActive, handleQrDetected]);

  // Initial Camera Start
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none">
      
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Inactive Camera UI */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-10">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
              <Camera className="w-10 h-10 text-sky-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 font-display">
              โหมดสแกนเต็มจอ (AR Mode)
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mb-6">
              {cameraError || 'กรุณากดปุ่มเพื่อเปิดกล้องและเริ่มสแกน QR Code หน้าเครื่อง PMD'}
            </p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/40 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>เปิดกล้องสแกนทันที</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Floating Header HUD */}
      <div className="relative z-20 px-3 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center justify-between gap-2">
        
        {/* Back to Dashboard Button */}
        <button
          onClick={onBackToDashboard}
          className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>หน้าตาราง</span>
        </button>

        {/* Center Progress Pill */}
        <div className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-200 flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>PMD: {scannedCount}/{totalCount}</span>
        </div>

        {/* Right Floating Quick Controls */}
        <div className="flex items-center gap-1.5">
          
          {/* Flip Camera */}
          {cameraActive && (
            <button
              onClick={flipCamera}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-sky-400 active:scale-95 transition shadow-lg cursor-pointer"
              title="สลับกล้องหน้า/หลัง"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {/* Torch */}
          {torchSupported && cameraActive && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-xl backdrop-blur-md border transition shadow-lg cursor-pointer ${
                torchOn 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                  : 'bg-slate-900/80 text-slate-300 border-slate-700/80'
              }`}
              title={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Voice Speech Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl backdrop-blur-md border transition shadow-lg cursor-pointer ${
              voiceEnabled 
                ? 'bg-indigo-600/60 text-indigo-200 border-indigo-500/60' 
                : 'bg-slate-900/80 text-slate-400 border-slate-700/80'
            }`}
            title={voiceEnabled ? 'เปิดเสียงอ่านอยู่' : 'ปิดเสียงอ่าน'}
          >
            {voiceEnabled ? <Mic className="w-4 h-4 text-sky-300" /> : <MicOff className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

      </div>

      {/* Central Viewport Reticle */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 pointer-events-none">
        
        {/* AR Scan Target Box */}
        <div className="relative w-[78%] sm:w-[50%] max-w-sm aspect-square border-2 border-dashed border-sky-400/80 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(56,189,248,0.3)] bg-sky-500/[0.03]">
          
          {/* Neon Corner Brackets */}
          <div className="absolute -top-3 -left-3 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-2xl shadow-[0_0_10px_#38bdf8]" />
          <div className="absolute -top-3 -right-3 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-2xl shadow-[0_0_10px_#38bdf8]" />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-2xl shadow-[0_0_10px_#38bdf8]" />
          <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-2xl shadow-[0_0_10px_#38bdf8]" />

          {/* Animated Laser Scan Line */}
          <div className="laser-beam absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee]" />

          {/* Center Target Icon */}
          <div className="opacity-25">
            <QrCode className="w-20 h-20 text-sky-300 stroke-1" />
          </div>

          {/* Instruction Chip */}
          {!activePopup && (
            <div className="absolute -bottom-10 bg-slate-950/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400/40 text-xs text-sky-200 font-medium tracking-wide shadow-xl">
              ส่อง <strong className="text-white">QR Code</strong> หน้าเครื่อง PMD
            </div>
          )}
        </div>

      </div>

      {/* 🚀 THE REQUESTED ON-CAMERA TITLE & AR FLOATING RESULT POPUP 🚀 */}
      {/* Pops up directly on camera view, shows Scanned QR, Sequence #, and Asset. Auto-hides after 3s delay when moved away! */}
      {activePopup && (
        <div className={`relative z-30 px-3 pb-3 sm:px-6 max-w-lg mx-auto w-full transition-all duration-400 ease-out transform ${
          isFadingOut ? 'opacity-0 translate-y-6 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-in fade-in zoom-in-95'
        }`}>
          <div className={`rounded-2xl p-4 sm:p-5 backdrop-blur-2xl border shadow-[0_0_40px_rgba(0,0,0,0.8)] ${
            activePopup.item 
              ? 'bg-slate-950/92 border-indigo-500/60 ring-2 ring-indigo-500/30' 
              : 'bg-slate-950/92 border-rose-500/60 ring-2 ring-rose-500/30'
          }`}>
            
            {/* Top Row: Status badge & 3-second auto-hide indicator */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                  activePopup.item 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {activePopup.item ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {activePopup.item ? 'พบในตาราง Excel' : 'ไม่พบในไฟล์ Excel'}
                </span>

                {activePopup.item?.asset && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                    <Box className="w-3 h-3 text-sky-400" />
                    <span>Asset: {activePopup.item.asset}</span>
                  </span>
                )}
              </div>

              {/* 3s Auto-hide countdown indicator */}
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                ซ่อนอัตโนมัติใน 3s
              </span>
            </div>

            {/* Main Content Grid: Giant Order Badge + Scanned Code + Asset */}
            <div className="grid grid-cols-12 gap-3 items-center bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              
              {/* Left: Giant Sequence / Order Number (ลำดับ) */}
              <div className="col-span-4 sm:col-span-4 flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-b from-indigo-900/60 to-slate-950 border border-indigo-500/40 text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-0.5">
                  <Hash className="w-3 h-3 text-sky-400" /> ลำดับ
                </span>
                <div className="font-display font-black text-4xl sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-200 to-cyan-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]">
                  {activePopup.item ? `#${activePopup.item.order}` : '?'}
                </div>
              </div>

              {/* Right: Scanned Code & Asset details */}
              <div className="col-span-8 sm:col-span-8 flex flex-col justify-center space-y-1.5 pl-1">
                
                {/* Scanned QR Code */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    รหัสที่สแกนได้ (QR CODE)
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700 truncate max-w-[200px]">
                      {activePopup.scannedRaw}
                    </span>
                    <button
                      onClick={() => handleCopy(activePopup.scannedRaw)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="คัดลอกรหัส"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Asset Name / Code (Column Asset in Excel) */}
                {activePopup.item && (
                  <div className="pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      รหัสทรัพย์สิน (ASSET)
                    </span>
                    <span className="font-display font-bold text-xs sm:text-sm text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/30 inline-block">
                      {activePopup.item.asset || '(ไม่มีระบุ)'}
                    </span>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Bottom Floating Bar */}
      <div className="relative z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 flex items-center justify-between gap-2 max-w-lg mx-auto w-full">
        <button
          onClick={onOpenManual}
          className="flex-1 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>พิมพ์ค้นหา</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex-1 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>อัปโหลด Excel</span>
        </button>
      </div>

    </div>
  );
}
