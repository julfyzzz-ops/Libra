import React, { useState } from 'react';
import { Search, X, Plus, ArrowUp, ArrowDown, ArrowDownUp } from 'lucide-react';
import { SortKey, SortDirection } from '../types';

interface WishlistControlsProps {
  search: string;
  onSearchChange: (term: string) => void;
  suggestions: string[];
  onAddClick: () => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
  isReordering: boolean;
  onToggleReorder: () => void;
}

export const WishlistControls: React.FC<WishlistControlsProps> = ({
  search,
  onSearchChange,
  suggestions,
  onAddClick,
  sortKey,
  sortDirection,
  onSortChange,
  isReordering,
  onToggleReorder
}) => {
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 h-12">
        <button
          onClick={onAddClick}
          className="h-12 w-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Пошук..."
            className="w-full h-full pl-10 pr-10 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {search.length > 0 && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5"
            >
              <X size={16} />
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl z-50 overflow-hidden border border-gray-100">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSearchChange(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSortPanel(prev => !prev)}
          className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all bg-indigo-600 text-white shadow-indigo-200"
        >
          <ArrowDownUp size={20} />
        </button>
      </div>

      {showSortPanel && (
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 space-y-3 animate-in slide-in-from-top-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['title', 'author', 'addedAt'] as SortKey[]).map((key) => {
              const isActive = sortKey === key && !isReordering && sortKey !== 'custom';
              return (
                <button
                  key={key}
                  onClick={() => onSortChange(key)}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {key === 'title' ? 'Назва' : key === 'author' ? 'Автор' : 'Дата'}
                  {isActive && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
              );
            })}

            <button
              onClick={onToggleReorder}
              className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                isReordering || sortKey === 'custom'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Свій порядок
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
