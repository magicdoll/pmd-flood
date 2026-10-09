import React, { useState, useMemo } from 'react';
import { 
  Search, CheckCircle2, Circle, Download, Filter, 
  RotateCcw, ArrowUpDown, ChevronRight, FileSpreadsheet, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DataTable({
  items,
  onToggleScanned,
  onResetAllScanned,
  highlightTag
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'SCANNED' | 'PENDING'
  const [sortOrder, setSortOrder] = useState('ASC'); // 'ASC' | 'DESC'

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        if (filterTab === 'SCANNED' && !item.scanned) return false;
        if (filterTab === 'PENDING' && item.scanned) return false;

        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase().trim();
        const matchesTag = item.tagNo.toLowerCase().includes(query);
        const matchesOrder = String(item.order).toLowerCase().includes(query);
        return matchesTag || matchesOrder;
      })
      .sort((a, b) => {
        const numA = typeof a.order === 'number' ? a.order : 9999;
        const numB = typeof b.order === 'number' ? b.order : 9999;
        return sortOrder === 'ASC' ? numA - numB : numB - numA;
      });
  }, [items, filterTab, searchTerm, sortOrder]);

  const scannedCount = items.filter(i => i.scanned).length;
  const pendingCount = items.length - scannedCount;

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = items.map(item => ({
      'ลำดับ': item.order,
      'TagNo': item.tagNo,
      'สถานะการสแกน': item.scanned ? 'สแกนแล้ว (Completed)' : 'ยังไม่สแกน (Pending)',
      'เวลาที่ตรวจพบ': item.scannedAt || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PMD Summary');
    XLSX.writeFile(workbook, `PMD_Scan_Audit_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-xl bg-slate-900/60">
      
      {/* Table Header Controls */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 space-y-2.5">
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>ตารางข้อมูล PMD ({items.length} เครื่อง)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              สถานะเครื่องที่ตรวจแล้ว & คงเหลือ
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition flex items-center gap-1 cursor-pointer"
              title="ดาวน์โหลดรายงานเป็นไฟล์ Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {scannedCount > 0 && (
              <button
                onClick={onResetAllScanned}
                className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                title="รีเซ็ตสถานะการสแกน"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">รีเซ็ต</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Tag หรือ ลำดับ..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-800 text-[11px] shrink-0 justify-between sm:justify-start">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterTab === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setFilterTab('SCANNED')}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                filterTab === 'SCANNED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              ตรวจแล้ว ({scannedCount})
            </button>
            <button
              onClick={() => setFilterTab('PENDING')}
              className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                filterTab === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Circle className="w-3 h-3" />
              รอตรวจ ({pendingCount})
            </button>
          </div>

        </div>

      </div>

      {/* Table Data View */}
      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-950/95 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">ตรวจ</th>
                <th 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition select-none w-20"
                  onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                >
                  <div className="flex items-center gap-1">
                    <span>ลำดับ</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">หมายเลข Tag PMD</th>
                <th className="py-2.5 px-3 text-right">เวลาสแกน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const isHighlighted = highlightTag && item.normalizedTag === highlightTag.replace(/[^A-Z0-9]/gi, '').toUpperCase();

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors duration-200 hover:bg-slate-800/40 ${
                      isHighlighted 
                        ? 'bg-sky-500/25 border-l-4 border-sky-400 font-bold' 
                        : item.scanned 
                          ? 'bg-emerald-950/15 text-slate-300' 
                          : 'text-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => onToggleScanned(item.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition mx-auto cursor-pointer ${
                          item.scanned 
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' 
                            : 'border-slate-600 hover:border-sky-400 text-transparent'
                        }`}
                        title={item.scanned ? 'คลิกเพื่อยกเลิก' : 'คลิกเพื่อติ๊กว่าตรวจแล้ว'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </td>

                    {/* Order */}
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-display font-bold text-xs ${
                        item.scanned 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-800 text-sky-400 border border-slate-700'
                      }`}>
                        #{item.order}
                      </span>
                    </td>

                    {/* Tag Number */}
                    <td className="py-2 px-3 font-mono text-xs sm:text-sm tracking-wide">
                      <span className={item.tagNo ? 'text-white font-semibold' : 'text-slate-500 italic'}>
                        {item.tagNo || '(ไม่มีแท็ก)'}
                      </span>
                    </td>

                    {/* Scanned Timestamp */}
                    <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-400">
                      {item.scannedAt || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Summary */}
      <div className="px-3.5 py-2 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>แสดง {filteredItems.length} จาก {items.length} เครื่อง</span>
        <span>สแกนแล้ว {scannedCount} ({items.length > 0 ? Math.round((scannedCount / items.length) * 100) : 0}%)</span>
      </div>

    </div>
  );
}
