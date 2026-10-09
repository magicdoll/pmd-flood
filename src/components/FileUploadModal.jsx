import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, RotateCcw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DEFAULT_RAW_CSV, parsePmdCsv } from '../data/defaultPmdData';

export default function FileUploadModal({ isOpen, onClose, onDataLoaded, currentCount }) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const processFile = async (file) => {
    setErrorMsg(null);
    setFileName(file.name);

    try {
      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text();
        const items = parsePmdCsv(text);
        if (items.length === 0) {
          throw new Error('ไม่พบข้อมูล Tag ในไฟล์ CSV นี้');
        }
        setParsedPreview(items);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        const items = parsePmdCsv(csvText);
        if (items.length === 0) {
          throw new Error('ไม่พบข้อมูล Tag ใน Sheet แรกของไฟล์ Excel');
        }
        setParsedPreview(items);
      } else {
        throw new Error('รองรับเฉพาะไฟล์ .csv, .xlsx, .xls เท่านั้น');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
      setParsedPreview(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parsedPreview && parsedPreview.length > 0) {
      onDataLoaded(parsedPreview);
      onClose();
    }
  };

  const handleRestoreDefault = () => {
    const defaultItems = parsePmdCsv(DEFAULT_RAW_CSV);
    onDataLoaded(defaultItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-bold text-base text-white">อัปเดตไฟล์ข้อมูล Tag PMD</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          <p className="text-xs text-slate-300">
            อัปโหลดไฟล์ <strong>Excel (.xlsx, .xls)</strong> หรือ <strong>CSV (.csv)</strong> ที่มีคอลัมน์ <span className="text-sky-400">ลำดับ</span> และ <span className="text-sky-400">TagNo</span> เพื่อใช้ตรวจสอบ
          </p>

          {/* Drag & Drop Area */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-500/10' 
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/60'
            }`}
            onClick={() => document.getElementById('excel-file-upload')?.click()}
          >
            <Upload className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-xs font-medium text-slate-200">
              ลากและวางไฟล์ที่นี่ หรือ <span className="text-indigo-400 underline">คลิกเพื่อเลือกไฟล์</span>
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              รองรับ .xlsx, .xls, .csv
            </span>
            <input 
              type="file" 
              id="excel-file-upload" 
              className="hidden" 
              accept=".csv, .xlsx, .xls"
              onChange={handleFileInput}
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Parsed Summary */}
          {parsedPreview && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>อ่านไฟล์ "{fileName}" สำเร็จ! พบทั้งหมด {parsedPreview.length} รายการ</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                ตัวอย่าง 3 รายการแรก: {parsedPreview.slice(0, 3).map(p => `#${p.order}: ${p.tagNo}`).join(', ')}...
              </div>
            </div>
          )}

          {/* Default Restore Button */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">ข้อมูลปัจจุบัน: {currentCount} รายการ</span>
            <button
              onClick={handleRestoreDefault}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ใช้ข้อมูลเริ่มต้น (82 เครื่อง)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsedPreview || parsedPreview.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white transition shadow-lg shadow-indigo-500/30"
          >
            บันทึกและนำเข้าข้อมูล
          </button>
        </div>

      </div>
    </div>
  );
}
