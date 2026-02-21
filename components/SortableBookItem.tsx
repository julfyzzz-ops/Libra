
import React, { useCallback, useEffect, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { Book } from '../types';

interface SortableBookItemProps {
  book: Book;
  children: React.ReactNode;
  showHandle: boolean;
}

export const SortableBookItem: React.FC<SortableBookItemProps> = ({ book, children, showHandle }) => {
  const controls = useDragControls();
  const isDraggingRef = useRef(false);
  const pointerYRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const EDGE_THRESHOLD_PX = 120;
  const MAX_SCROLL_STEP_PX = 22;

  const stopAutoScroll = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const autoScrollStep = useCallback(() => {
    if (!isDraggingRef.current || pointerYRef.current === null) {
      stopAutoScroll();
      return;
    }

    const viewportHeight = window.innerHeight;
    const pointerY = pointerYRef.current;
    let delta = 0;

    if (pointerY < EDGE_THRESHOLD_PX) {
      const proximity = (EDGE_THRESHOLD_PX - pointerY) / EDGE_THRESHOLD_PX;
      delta = -Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, proximity));
    } else if (pointerY > viewportHeight - EDGE_THRESHOLD_PX) {
      const proximity = (pointerY - (viewportHeight - EDGE_THRESHOLD_PX)) / EDGE_THRESHOLD_PX;
      delta = Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, proximity));
    }

    if (delta !== 0) {
      window.scrollBy(0, delta);
    }

    rafIdRef.current = requestAnimationFrame(autoScrollStep);
  }, [stopAutoScroll]);

  const handleGlobalPointerMove = useCallback((event: PointerEvent) => {
    pointerYRef.current = event.clientY;
  }, []);

  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  return (
    <Reorder.Item
      value={book}
      id={book.id}
      {...{ dragListener: false } as any}
      dragControls={controls}
      onDragStart={(_, info) => {
        isDraggingRef.current = true;
        pointerYRef.current = info.point.y;
        window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(autoScrollStep);
        }
      }}
      onDragEnd={() => {
        isDraggingRef.current = false;
        pointerYRef.current = null;
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        stopAutoScroll();
      }}
      className="relative mb-3"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Content */}
      <div className="w-full relative z-0">
        {children}
      </div>
      
      {/* Handle Overlay */}
      {showHandle && (
        <div
            onPointerDown={(e) => controls.start(e)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/80 backdrop-blur-sm rounded-xl text-gray-400 border border-gray-100 shadow-sm active:text-indigo-600 active:scale-110 transition-all cursor-grab active:cursor-grabbing touch-none"
            style={{ touchAction: 'none' }} 
        >
            <GripVertical size={20} />
        </div>
      )}
    </Reorder.Item>
  );
};
