import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CaretLeft, CaretRight } from 'phosphor-react';
import { getUrl } from './PostUtils';

const LightboxModal = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const hasNext = currentIndex < images.length - 1;
    const hasPrev = currentIndex > 0;
  
    const handleKeyDown = useCallback((e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) setCurrentIndex(prev => prev + 1);
      if (e.key === 'ArrowLeft' && hasPrev) setCurrentIndex(prev => prev - 1);
    }, [onClose, hasNext, hasPrev]);
  
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleKeyDown]);
  
    if (!images || images.length === 0) return null;
  
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
         <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition z-20"><X size={24} weight="bold"/></button>
         
         {hasPrev && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev - 1); }} className="absolute left-4 p-3 text-white hover:bg-white/10 rounded-full transition z-20"><CaretLeft size={32} weight="bold"/></button>}
         
         <img 
           src={getUrl(images[currentIndex])} 
           alt={`fullscreen-${currentIndex}`}
           className="max-h-[90vh] max-w-[90vw] object-contain animate-in zoom-in-95 duration-200 select-none"
           onClick={(e) => e.stopPropagation()} 
         />
  
         {hasNext && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev + 1); }} className="absolute right-4 p-3 text-white hover:bg-white/10 rounded-full transition z-20"><CaretRight size={32} weight="bold"/></button>}
         
         {images.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-medium bg-black/50 px-3 py-1 rounded-full">{currentIndex + 1} / {images.length}</div>}
      </div>,
      document.body
    );
};

const PostImages = ({ images }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!images || images.length === 0) return null;

  const count = images.length;
  let containerClass = "mt-3 rounded-xl overflow-hidden grid gap-0.5 border border-slate-200 bg-slate-100 relative z-10";

  if (count === 1) containerClass += " grid-cols-1";
  else if (count === 2) containerClass += " grid-cols-2 aspect-[3/2]";
  else if (count === 3) containerClass += " grid-cols-2 grid-rows-2 aspect-[3/2]";
  else if (count >= 4) containerClass += " grid-cols-2 grid-rows-2 aspect-[3/2]";

  return (
    <>
        <div className={containerClass}>
            {images.slice(0, 4).map((img, idx) => {
            let imgClass = "w-full h-full object-cover cursor-pointer hover:opacity-90 transition bg-slate-200";
            let style = {};
            if (count === 1) style = { maxHeight: '510px' };
            if (count === 3 && idx === 0) imgClass += " row-span-2";

            return (
                <img key={idx} src={getUrl(img)} alt={`grid-${idx}`} className={imgClass} style={style} onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }} />
            );
            })}
        </div>
        {lightboxIndex !== null && <LightboxModal images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>
  );
};

export default PostImages;