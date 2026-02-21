
import React from 'react';
import { GripVertical } from 'lucide-react';

interface SortableBookItemProps {
  itemId: string;
  children: React.ReactNode;
  showHandle: boolean;
  performanceMode?: boolean;
  isDragging?: boolean;
  onHandlePointerDown?: (event: React.PointerEvent<HTMLDivElement>, itemId: string) => void;
  setItemRef?: (itemId: string, el: HTMLDivElement | null) => void;
}

export const SortableBookItem: React.FC<SortableBookItemProps> = ({ itemId, children, showHandle, performanceMode = false, isDragging = false, onHandlePointerDown, setItemRef }) => {
  return (
    <div
      ref={(el) => setItemRef?.(itemId, el)}
      className={`relative mb-3 ${performanceMode ? 'will-change-transform' : ''}`}
      style={{ touchAction: 'pan-y', willChange: 'transform' }}
    >
      {/* Content */}
      <div className={`w-full relative z-0 ${isDragging ? 'opacity-60 grayscale' : ''}`}>
        {children}
      </div>
      
      {/* Handle Overlay */}
      {showHandle && (
        <div
            onPointerDown={(e) => onHandlePointerDown?.(e, itemId)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-xl text-gray-400 border border-gray-100 cursor-grab active:cursor-grabbing touch-none ${performanceMode ? 'bg-white text-gray-500' : 'bg-white/80 backdrop-blur-sm shadow-sm active:text-indigo-600 active:scale-110 transition-all'}`}
            style={{ touchAction: 'none' }} 
        >
            <GripVertical size={20} />
        </div>
      )}
    </div>
  );
};
