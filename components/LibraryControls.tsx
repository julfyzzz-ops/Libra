
import React, { useState } from 'react';
import { Search, ArrowUpDown, Filter, RotateCcw, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { BookFormat, BookStatus, SortKey, SortDirection } from '../types';
import { FORMAT_LABELS, STATUS_LABELS } from '../utils';

interface LibraryControlsProps {
  search: string;
  onSearchChange: (term: string) => void;
  suggestions: string[];
  onAddClick: () => void;
  
  // Sort Props
  sortKey: SortKey;
  sortDirection: SortDirection;
  onToggleSort: (key: SortKey) => void;
  
  // Filter Props
  selectedStatuses: BookStatus[];
  selectedFormats: BookFormat[];
  onToggleStatus: (status: BookStatus) => void;
  onToggleFormat: (format: BookFormat) => void;
  onClearFilters: () => void;
}

export const LibraryControls: React.FC<LibraryControlsProps> = ({
  search,
  onSearchChange,
  suggestions,
  onAddClick,
  sortKey,
  sortDirection,
  onToggleSort,
  selectedStatuses,
  selectedFormats,
  onToggleStatus,
  onToggleFormat,
  onClearFilters
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'sort' | 'filter'>('none');

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (s: string) => {
    onSearchChange(s);
    setShowSuggestions(false);
  };

  const togglePanel = (panel: 'sort' | 'filter') => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  const hasActiveFilters = selectedFormats.length > 0 || selectedStatuses.length !== 3 || search;

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="flex gap-2">
        <button 
          onClick={onAddClick}
          className="w-12 h-12 flex-shrink-0 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
            <Plus size={24} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
              type="text"
              placeholder="Пошук..."
              className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              value={search}
              onChange={handleSearchInput}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {search.length > 0 && (
              <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                  <X size={16} />
              </button>
          )}
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-morphism rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 suggestion-item transition-colors border-b border-gray-100 last:border-none"
                  >
                  {s}
                  </button>
              ))}
              </div>
          )}
        </div>

        <button 
            onClick={() => togglePanel('sort')}
            className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${activePanel === 'sort' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
        >
            <ArrowUpDown size={18} />
        </button>
        <button 
            onClick={() => togglePanel('filter')}
            className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${activePanel === 'filter' || hasActiveFilters ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
        >
            <Filter size={18} />
        </button>
      </div>

      {/* Sorting Panel */}
      {activePanel === 'sort' && (
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'title', label: 'Назва' },
                  { key: 'author', label: 'Автор' },
                  { key: 'addedAt', label: 'Дата' },
                  { key: 'custom', label: 'Свій порядок' }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => onToggleSort(opt.key as SortKey)}
                    className={`flex items-center justify-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      sortKey === opt.key 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                    {sortKey === opt.key && sortKey !== 'custom' && (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
      )}

      {/* Filters Panel */}
      {activePanel === 'filter' && (
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Статус</span>
                  <div className="flex flex-wrap gap-2">
                      {['Reading', 'Unread', 'Completed'].map((s) => (
                          <button
                              key={s}
                              onClick={() => onToggleStatus(s as BookStatus)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedStatuses.includes(s as BookStatus) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                          >
                              {STATUS_LABELS[s as BookStatus]}
                          </button>
                      ))}
                  </div>
              </div>
              <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Формат</span>
                  <div className="flex flex-wrap gap-2">
                      {Object.keys(FORMAT_LABELS).map((f) => (
                          <button
                              key={f}
                              onClick={() => onToggleFormat(f as BookFormat)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedFormats.includes(f as BookFormat) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                          >
                              {FORMAT_LABELS[f as BookFormat]}
                          </button>
                      ))}
                  </div>
              </div>
              
              {hasActiveFilters && (
                 <button 
                   onClick={onClearFilters}
                   className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                 >
                   <RotateCcw size={14} /> Очистити фільтри
                 </button>
              )}
          </div>
      )}
    </div>
  );
};
