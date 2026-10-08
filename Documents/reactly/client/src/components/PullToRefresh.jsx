import React, { useState, useEffect, useRef } from 'react';
import { CircleNotch } from 'phosphor-react';

const PullToRefresh = ({ children, onRefresh }) => {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const contentRef = useRef(null);
  
  // Ambang batas tarikan (pixel) agar refresh terpicu
  const PULL_THRESHOLD = 120;
  // Maksimum tarikan visual
  const MAX_PULL = 160;

  const handleTouchStart = (e) => {
    // Hanya aktif jika scroll ada di paling atas
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - startY;

    // Jika scroll di atas, tidak sedang refresh, dan gerakan ke bawah
    if (window.scrollY === 0 && diff > 0 && !refreshing) {
      // Logika "Resistance" (semakin ditarik semakin berat)
      const pullDistance = diff < MAX_PULL ? diff : MAX_PULL + (diff - MAX_PULL) * 0.3;
      setCurrentY(pullDistance);
      
      // Mencegah scroll default browser (overscroll) jika ditarik
      if (e.cancelable && diff < PULL_THRESHOLD) {
         // Opsional: e.preventDefault() kadang bikin scroll macet di beberapa browser
      }
    }
  };

  const handleTouchEnd = async () => {
    if (currentY > PULL_THRESHOLD) {
      setRefreshing(true);
      setCurrentY(60); // Tahan posisi di loading area
      
      // Panggil fungsi refresh parent
      if (onRefresh) {
        await onRefresh();
      }
      
      // Selesai
      setRefreshing(false);
      setCurrentY(0);
    } else {
      // Batal refresh, balik ke atas
      setCurrentY(0);
    }
    setStartY(0);
  };

  return (
    <div 
      ref={contentRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
    >
      {/* Loading Indicator Icon */}
      <div 
        className="fixed top-20 left-0 right-0 flex justify-center z-40 pointer-events-none transition-opacity duration-300"
        style={{ 
           opacity: currentY > 0 ? 1 : 0,
           transform: `translateY(${currentY > 0 ? 0 : -50}px)` // Muncul sedikit dari atas
        }}
      >
        <div className="bg-white rounded-full p-2 shadow-lg border border-slate-100">
           <CircleNotch 
              size={24} 
              className={`text-blue-500 ${refreshing ? 'animate-spin' : ''}`} 
              style={{ transform: `rotate(${currentY * 2}deg)` }} // Icon berputar visual saat ditarik
           />
        </div>
      </div>

      {/* Main Content yang turun saat ditarik */}
      {/* [PERBAIKAN UTAMA] Jika currentY 0, hapus properti transform agar sticky header di Explore bekerja */}
      <div 
        style={currentY > 0 ? { 
          transform: `translateY(${currentY}px)`,
          transition: refreshing ? 'transform 0.3s ease' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;