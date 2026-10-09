import React from 'react';
import { Camera, Volume2, VolumeX, Mic, MicOff, Upload, HelpCircle, Sparkles, QrCode } from 'lucide-react';

export default function Header({
  voiceEnabled,
  setVoiceEnabled,
  beepEnabled,
  setBeepEnabled,
  onOpenUpload,
  onOpenManual,
  onOpenGuide
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[9px] sm:rounded-[10px] flex items-center justify-center">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
              </div>
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-display font-bold text-sm sm:text-lg tracking-wide text-white flex items-center gap-1">
                PMD <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">QR Scanner</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-sans hidden sm:block">
              ระบบสแกน QR Code หาหมายเลขลำดับเครื่อง PMD อัตโนมัติ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          
          {/* Voice Speech Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? "ปิดเสียงอ่านลำดับ" : "เปิดเสียงอ่านลำดับ"}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
              voiceEnabled 
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {voiceEnabled ? <Mic className="w-3.5 h-3.5 text-indigo-400" /> : <MicOff className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden md:inline">{voiceEnabled ? 'เสียงอ่าน' : 'ปิดเสียง'}</span>
          </button>

          {/* Beep Toggle */}
          <button
            onClick={() => setBeepEnabled(!beepEnabled)}
            title={beepEnabled ? "ปิดเสียงสัญญาณ" : "เปิดเสียงสัญญาณ"}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
              beepEnabled 
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/50 shadow-sm' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {beepEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden md:inline">{beepEnabled ? 'บี๊บ' : 'ปิด'}</span>
          </button>

          {/* Quick Manual Search */}
          <button
            onClick={onOpenManual}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
            title="ค้นหาด้วยการพิมพ์"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">พิมพ์หา</span>
          </button>

          {/* Upload Excel Button */}
          <button
            onClick={onOpenUpload}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
            title="เปลี่ยนไฟล์ Excel/CSV"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Help button */}
          <button
            onClick={onOpenGuide}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition border border-transparent hover:border-slate-700 cursor-pointer"
            title="คำแนะนำการใช้งาน"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
