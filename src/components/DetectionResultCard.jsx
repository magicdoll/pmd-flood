import React from 'react';
import { 
  CheckCircle2, AlertCircle, Copy, Volume2, Sparkles, Clock, 
  Tag, Hash, ShieldCheck, Check
} from 'lucide-react';
import { speakResult } from '../utils/audio';

export default function DetectionResultCard({
  latestResult,
  recentDetections = [],
  onToggleScanned
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplayVoice = () => {
    if (!latestResult) return;
    if (latestResult.item) {
      speakResult(`ลำดับที่ ${latestResult.item.order} แท็ก ${latestResult.matchedTag}`);
    } else {
      speakResult(`แท็ก ${latestResult.matchedTag} ไม่พบในระบบ`);
    }
  };

  // If no tag scanned yet
  if (!latestResult) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-center text-center min-h-[170px]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2.5 animate-pulse">
          <Tag className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">พร้อมรอรับการสแกน</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          เล็งกล้องไปที่ QR Code บนเครื่อง PMD หมายเลขลำดับจะปรากฏขึ้นทันที
        </p>
      </div>
    );
  }

  const { matchedTag, item, confidence, method, timestamp } = latestResult;
  const isFound = Boolean(item);
  const orderNum = item ? item.order : 'N/A';

  return (
    <div className="space-y-3">
      
      {/* Main High-Impact Detection Banner */}
      <div className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden shadow-2xl ${
        isFound 
          ? 'bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-indigo-500/50 shadow-indigo-500/25' 
          : 'bg-gradient-to-br from-slate-900 via-rose-950/50 to-slate-900 border-rose-500/50 shadow-rose-500/25'
      }`}>
        
        {/* Glow Accent */}
        <div className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl opacity-30 ${isFound ? 'bg-indigo-500' : 'bg-rose-500'}`} />

        <div className="relative z-10">
          
          {/* Top Row: Status badge & timestamp */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 border ${
                isFound 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isFound ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {isFound ? 'ตรงกับฐานข้อมูล PMD' : 'ไม่พบในไฟล์ Excel'}
              </span>

              {item?.scanned && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> ตรวจแล้ว
                </span>
              )}
            </div>

            <div className="flex items-center text-slate-400 text-[11px] font-mono gap-1">
              <Clock className="w-3 h-3" />
              <span>{timestamp || new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Main Visual Display: Huge Order Badge & Tag Code */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-950/70 rounded-xl p-3.5 border border-slate-800">
            
            {/* Left: Giant Sequence / Order Number */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-indigo-900/50 to-slate-900 border border-indigo-500/30 text-center">
              <span className="text-[11px] uppercase font-semibold text-indigo-300 tracking-wider flex items-center gap-1 mb-0.5">
                <Hash className="w-3.5 h-3.5 text-sky-400" /> ลำดับเครื่อง (ORDER)
              </span>
              <div className="font-display font-black text-5xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-200 to-cyan-300 drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
                {orderNum}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {isFound ? `เครื่องลำดับที่ ${orderNum} ของ PMD` : 'ไม่มีหมายเลขลำดับ'}
              </span>
            </div>

            {/* Right: Tag Details & Quick Action Buttons */}
            <div className="sm:col-span-7 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">หมายเลข Tag PMD</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-lg sm:text-2xl font-bold text-white tracking-wide bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 truncate">
                    {matchedTag}
                  </span>
                  <button
                    onClick={() => handleCopy(matchedTag)}
                    title="คัดลอก Tag"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  onClick={handleReplayVoice}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ฟังเสียงลำดับ</span>
                </button>

                {isFound && (
                  <button
                    onClick={() => onToggleScanned(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                      item.scanned 
                        ? 'bg-slate-800 text-slate-400 border-slate-700' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{item.scanned ? 'ยกเลิกติ๊ก' : 'บันทึกว่าตรวจแล้ว'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Mini Recent History Carousel */}
      {recentDetections.length > 1 && (
        <div className="glass-card rounded-xl p-3 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              สแกนล่าสุด ({recentDetections.length} รายการ)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {recentDetections.slice(0, 4).map((rec, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-center justify-between"
              >
                <div className="truncate pr-1">
                  <div className="font-mono text-[11px] font-bold text-white truncate">
                    {rec.matchedTag}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {rec.timestamp}
                  </div>
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-display font-bold text-xs border border-indigo-500/30 shrink-0">
                  #{rec.item ? rec.item.order : '?'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
