import React from 'react';
import { X, HelpCircle, Camera, CheckCircle2, Volume2, Sparkles, FileSpreadsheet, ShieldAlert } from 'lucide-react';

export default function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-400" />
            <h3 className="font-display font-bold text-base text-white">คำแนะนำการใช้งานระบบสแกน PMD</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300">
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-white mb-0.5">เปิดกล้องและเล็งที่ป้าย Tag</h4>
                <p className="text-slate-400">
                  ถือ Notebook หรือหมุนกล้อง Webcam เล็งไปที่ป้าย Tag บนตัวเครื่อง PMD (ให้อยู่ในกรอบสี่เหลี่ยมเป้าหมาย) ระบบจะตรวจจับตัวอักษรและบาร์โค้ดอัตโนมัติ Real-time ตลอดเวลา
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-white mb-0.5">ระบบจะแสดง "หมายเลขลำดับ" ทันที</h4>
                <p className="text-slate-400">
                  เมื่อตรวจพบตัวเลข Tag (เช่น C2IT10231728) ระบบจะทำการค้นหาในตาราง Excel แล้วแสดง <strong>"ลำดับเครื่อง" (เช่น #1, #22)</strong> ตัวใหญ่ชัดเจนบนหน้าจอ พร้อมเสียงสังเคราะห์ภาษาไทยอ่านลำดับให้ฟังอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-white mb-0.5">Checklist ตรวจนับเครื่อง & Export Excel</h4>
                <p className="text-slate-400">
                  คุณสามารถติ๊กสถานะเครื่องที่ตรวจแล้ว และกดปุ่ม <strong>"Export Excel"</strong> เพื่อนำรายงานสรุปผลการตรวจสอบไปใช้งานต่อได้
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold text-white mb-0.5">กรณีแสงน้อยหรือมุมกล้องถ่ายยาก</h4>
                <p className="text-slate-400">
                  สามารถกดปุ่ม <strong>"ค้นหาด้วยพิมพ์"</strong> หรือถ่ายรูปป้ายแล้วกด <strong>"เลือกรูป"</strong> เพื่อให้อ่านข้อความจากรูปถ่ายได้ทันที
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
            <span className="font-semibold text-indigo-300 block mb-1">💡 เคล็ดลับการสแกนให้ไว:</span>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>ให้ป้าย Tag อยู่ห่างจากกล้องประมาณ 15 - 30 ซม.</li>
              <li>หลีกเลี่ยงแสงสะท้อนจ้าบนพื้นผิวป้ายสติกเกอร์</li>
              <li>หากมีกล้องหลายตัว สามารถเลือกสลับกล้องที่แถบควบคุมด้านล่างได้</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-500/30"
          >
            เข้าใจแล้ว เริ่มสแกนเลย
          </button>
        </div>

      </div>
    </div>
  );
}
