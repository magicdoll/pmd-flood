import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ScannerHUD from './components/ScannerHUD';
import DetectionResultCard from './components/DetectionResultCard';
import DataTable from './components/DataTable';
import StatsBar from './components/StatsBar';
import FullscreenScannerPage from './components/FullscreenScannerPage';
import FileUploadModal from './components/FileUploadModal';
import ManualSearchModal from './components/ManualSearchModal';
import GuideModal from './components/GuideModal';
import { DEFAULT_RAW_CSV, parsePmdCsv } from './data/defaultPmdData';
import { playSuccessBeep, playNotFoundBeep, speakResult, unlockAudioOnUserGesture } from './utils/audio';
import confetti from 'canvas-confetti';
import { Camera, FileSpreadsheet, Search, Sparkles, Maximize2 } from 'lucide-react';

export default function App() {
  // Page view: 'DASHBOARD' | 'FULLSCREEN_AR'
  const [currentView, setCurrentView] = useState('FULLSCREEN_AR'); // Default to the requested Fullscreen AR Scanner page!
  
  // Mobile active tab for dashboard: 'SCAN' | 'LIST'
  const [mobileTab, setMobileTab] = useState('SCAN');

  // Database Items state
  const [databaseItems, setDatabaseItems] = useState(() => {
    try {
      const saved = localStorage.getItem('pmd_database_items');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Cannot load saved items:', e);
    }
    return parsePmdCsv(DEFAULT_RAW_CSV);
  });

  // Detection states
  const [latestResult, setLatestResult] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);
  const [highlightTag, setHighlightTag] = useState(null);

  // Audio settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [beepEnabled, setBeepEnabled] = useState(true);

  // Scan controls
  const [isPaused, setIsPaused] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const lastSpokenTagRef = useRef({ tag: null, time: 0 });

  // Save database items to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('pmd_database_items', JSON.stringify(databaseItems));
    } catch (e) {
      console.warn('Cannot save to localStorage:', e);
    }
  }, [databaseItems]);

  // Handle new tag detected by Scanner or Manual
  const handleTagDetected = useCallback((result) => {
    if (!result || !result.matchedTag) return;

    unlockAudioOnUserGesture();

    const now = Date.now();
    const isSameTagRecent = (lastSpokenTagRef.current.tag === result.matchedTag) && (now - lastSpokenTagRef.current.time < 3500);

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullResult = {
      ...result,
      timestamp: timeStr
    };

    setLatestResult(fullResult);
    setHighlightTag(result.matchedTag);

    // Update recent detections history
    setRecentDetections(prev => {
      if (prev.length > 0 && prev[0].matchedTag === result.matchedTag) {
        return [{ ...fullResult }, ...prev.slice(1)];
      }
      return [{ ...fullResult }, ...prev.slice(0, 7)];
    });

    // Auto mark as scanned in database
    if (result.item) {
      setDatabaseItems(prev => prev.map(item => {
        if (item.id === result.item.id) {
          return {
            ...item,
            scanned: true,
            scannedAt: item.scannedAt || timeStr
          };
        }
        return item;
      }));
    }

    // Audio & Speech announcements
    if (!isSameTagRecent) {
      lastSpokenTagRef.current = { tag: result.matchedTag, time: now };

      if (result.item) {
        if (beepEnabled) playSuccessBeep();
        if (voiceEnabled) {
          const speechText = `ลำดับ ${result.item.order} ${result.item.asset ? `แอสเซท ${result.item.asset}` : ''}`;
          speakResult(speechText);
        }
        try {
          confetti({
            particleCount: 20,
            spread: 40,
            origin: { y: 0.85 },
            colors: ['#38bdf8', '#6366f1', '#10b981']
          });
        } catch (e) {}
      } else {
        if (beepEnabled) playNotFoundBeep();
        if (voiceEnabled) {
          speakResult(`ไม่พบข้อมูลแท็ก`);
        }
      }
    }
  }, [beepEnabled, voiceEnabled]);

  // Toggle scanned checkbox
  const handleToggleScanned = (itemId) => {
    unlockAudioOnUserGesture();
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDatabaseItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextScanned = !item.scanned;
        return {
          ...item,
          scanned: nextScanned,
          scannedAt: nextScanned ? timeStr : null
        };
      }
      return item;
    }));
  };

  // Reset all scanned status
  const handleResetAllScanned = () => {
    if (window.confirm('คุณต้องการรีเซ็ตสถานะการสแกนทั้งหมดกลับเป็นเริ่มต้นหรือไม่?')) {
      setDatabaseItems(prev => prev.map(item => ({
        ...item,
        scanned: false,
        scannedAt: null
      })));
      setLatestResult(null);
      setRecentDetections([]);
    }
  };

  // Load new dataset
  const handleDataLoaded = (newItems) => {
    setDatabaseItems(newItems);
    setLatestResult(null);
    setRecentDetections([]);
  };

  const scannedCount = databaseItems.filter(i => i.scanned).length;

  // 🚀 IF IN FULLSCREEN AR MODE, RENDER THE NEW FULLSCREEN SCANNER PAGE!
  if (currentView === 'FULLSCREEN_AR') {
    return (
      <>
        <FullscreenScannerPage
          databaseItems={databaseItems}
          onBackToDashboard={() => setCurrentView('DASHBOARD')}
          voiceEnabled={voiceEnabled}
          setVoiceEnabled={setVoiceEnabled}
          beepEnabled={beepEnabled}
          setBeepEnabled={setBeepEnabled}
          onOpenManual={() => setIsManualOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
        />

        <FileUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onDataLoaded={handleDataLoaded}
          currentCount={databaseItems.length}
        />

        <ManualSearchModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
          databaseItems={databaseItems}
          onSelectResult={handleTagDetected}
        />

        <GuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      </>
    );
  }

  // 📊 OTHERWISE, RENDER THE STANDARD DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-16 sm:pb-0">
      
      {/* Header */}
      <Header
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        beepEnabled={beepEnabled}
        setBeepEnabled={setBeepEnabled}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenFullscreen={() => setCurrentView('FULLSCREEN_AR')}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        
        {/* Stats & Progress Bar */}
        <StatsBar items={databaseItems} />

        {/* Desktop 2-Column Grid / Mobile Tab Switching */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Left: Camera Scanner + Detection Card */}
          <div className={`lg:col-span-6 space-y-4 ${mobileTab === 'SCAN' ? 'block' : 'hidden lg:block'}`}>
            <ScannerHUD
              databaseItems={databaseItems}
              onTagDetected={handleTagDetected}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
            />

            <DetectionResultCard
              latestResult={latestResult}
              recentDetections={recentDetections}
              onToggleScanned={handleToggleScanned}
            />
          </div>

          {/* Right: PMD Sequence Data Table */}
          <div className={`lg:col-span-6 h-full ${mobileTab === 'LIST' ? 'block' : 'hidden lg:block'}`}>
            <DataTable
              items={databaseItems}
              onToggleScanned={handleToggleScanned}
              onResetAllScanned={handleResetAllScanned}
              highlightTag={highlightTag}
            />
          </div>

        </div>

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <button
          onClick={() => setCurrentView('FULLSCREEN_AR')}
          className="flex flex-col items-center gap-1 text-xs font-semibold py-1 px-3 rounded-xl text-sky-400 bg-sky-500/10 active:scale-95 transition"
        >
          <Maximize2 className="w-5 h-5 text-sky-400" />
          <span>เต็มจอ AR</span>
        </button>

        <button
          onClick={() => setMobileTab('LIST')}
          className={`flex flex-col items-center gap-1 text-xs font-medium py-1 px-3 rounded-xl transition ${
            mobileTab === 'LIST' 
              ? 'text-indigo-400 bg-indigo-500/10' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>ตาราง ({scannedCount}/{databaseItems.length})</span>
        </button>

        <button
          onClick={() => setIsManualOpen(true)}
          className="flex flex-col items-center gap-1 text-xs font-medium py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition"
        >
          <Search className="w-5 h-5 text-amber-400" />
          <span>พิมพ์ค้นหา</span>
        </button>
      </nav>

      {/* Footer Desktop */}
      <footer className="hidden sm:block border-t border-slate-800/80 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PMD Auto QR & Tag Scanner | Vercel Ready ⚡</span>
          <span>รองรับโหมดเต็มจอ AR & คอลัมน์ Asset</span>
        </div>
      </footer>

      {/* Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataLoaded={handleDataLoaded}
        currentCount={databaseItems.length}
      />

      <ManualSearchModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        databaseItems={databaseItems}
        onSelectResult={handleTagDetected}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

    </div>
  );
}
