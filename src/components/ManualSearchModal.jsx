import React, { useState } from 'react';
import { X, Search, Sparkles, CheckCircle2, AlertCircle, Hash, Volume2 } from 'lucide-react';
import { extractAndMatchTag } from '../utils/ocrScanner';

export default function ManualSearchModal({ isOpen, onClose, databaseItems, onSelectResult }) {
  const [inputTag, setInputTag] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!inputTag.trim()) return;

    const match = extractAndMatchTag(inputTag, databaseItems);
    setResult(match);
  };

  const handleSelect = () => {
    if (result) {
      onSelectResult(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base text-white">ค้นหา Tag ด้วยการพิมพ์ / วางข้อความ</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs font-medium text-slate-300">
              กรอกหมายเลข Tag (เช่น C2IT10231728 หรือ C1IT...)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={inputTag}
                onChange={(e) => {
                  setInputTag(e.target.value);
                  const match = extractAndMatchTag(e.target.value, databaseItems);
                  setResult(match);
                }}
                placeholder="พิมพ์หมายเลข Tag..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
              >
                ค้นหา
              </button>
            </div>
          </form>

          {/* Result Box */}
          {result && (
            <div className={`p-4 rounded-xl border transition-all ${
              result.item 
                ? 'bg-indigo-950/40 border-indigo-500/40' 
                : 'bg-rose-950/40 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                  result.item ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {result.item ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {result.item ? 'พบข้อมูลในระบบ' : 'ไม่พบหมายเลข Tag นี้'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tag: {result.matchedTag}
                </span>
              </div>

              {result.item && (
                <div className="flex items-center justify-between bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-slate-300">หมายเลขลำดับ:</span>
                  </div>
                  <div className="font-display font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">
                    #{result.item.order}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Suggestions / Sample tags */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1.5">ตัวอย่าง Tag สำหรับทดสอบกดดู:</span>
            <div className="flex flex-wrap gap-1.5">
              {['C2IT10231728', 'C1IT10231850', 'L1IT00231751', 'C2IT10231745'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setInputTag(t);
                    const match = extractAndMatchTag(t, databaseItems);
                    setResult(match);
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-700 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ปิด
          </button>
          {result && (
            <button
              onClick={handleSelect}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition shadow-lg shadow-sky-500/30"
            >
              แสดงผลบนหน้าจอหลัก
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
