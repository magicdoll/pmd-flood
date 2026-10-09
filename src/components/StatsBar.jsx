import React from 'react';
import { CheckCircle2, Clock, Cpu, BarChart3 } from 'lucide-react';

export default function StatsBar({ items }) {
  const total = items.length;
  const scanned = items.filter(i => i.scanned).length;
  const remaining = total - scanned;
  const percentage = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-slate-800 shadow-lg">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Progress Metrics Grid (3 columns on mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-6">
          
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/60 p-2 rounded-xl sm:p-0 sm:bg-transparent border border-slate-800 sm:border-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-medium truncate">ทั้งหมด</div>
              <div className="font-display font-bold text-sm sm:text-xl text-white">{total}</div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/60 p-2 rounded-xl sm:p-0 sm:bg-transparent border border-slate-800 sm:border-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-medium truncate">ตรวจแล้ว</div>
              <div className="font-display font-bold text-sm sm:text-xl text-emerald-400">{scanned}</div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/60 p-2 rounded-xl sm:p-0 sm:bg-transparent border border-slate-800 sm:border-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-medium truncate">คงเหลือ</div>
              <div className="font-display font-bold text-sm sm:text-xl text-amber-400">{remaining}</div>
            </div>
          </div>

        </div>

        {/* Progress Bar with Percent */}
        <div className="w-full sm:w-64 pt-1 sm:pt-0">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" /> ความคืบหน้า
            </span>
            <span className="font-mono font-bold text-sky-400 text-xs">{percentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
