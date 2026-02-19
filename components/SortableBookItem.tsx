
import React from 'react';
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

  return (
    <Reorder.Item
      value={book}
      id={book.id}
      {...{ dragListener: false } as any}
      dragControls={controls}
      className="relative mb-3"
      style={{ touchAction: 'none' }}
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
