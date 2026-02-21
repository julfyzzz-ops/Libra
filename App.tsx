
import React, { useState, useEffect } from 'react';
import { BarChart2, Library as LibraryIcon, Calendar as CalendarIcon, Settings as SettingsIcon, Book as BookIcon } from 'lucide-react';
import { ViewType } from './types';
import { Statistics } from './components/Statistics';
import { Library } from './components/Library';
import { AddBook } from './components/AddBook';
import { Calendar } from './components/Calendar';
import { Settings } from './components/Settings';
import { ReadingList } from './components/ReadingList';
import { loadSettings } from './services/storageService';
import { applyTheme } from './utils';
import { LibraryProvider, useLibrary } from './contexts/LibraryContext';
import { UIProvider } from './contexts/UIContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Create a wrapper component to use the hook
const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('library');
  const { isLoading, filterTag, setFilterTag } = useLibrary();

  useEffect(() => {
    const settings = loadSettings();
    applyTheme(settings.accent, settings.bg);
  }, []);

  // Watch for filter changes to switch view
  useEffect(() => {
    if (filterTag) {
        setActiveView('library');
    }
  }, [filterTag]);

  const renderView = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center animate-bounce"><LibraryIcon size={48} className="text-indigo-600" /></div>;

    switch (activeView) {
      case 'statistics': return <Statistics />;
      case 'library': return <Library onAddClick={() => setActiveView('add')} />;
      case 'reading': return <ReadingList />;
      case 'add': return <AddBook onAddSuccess={() => setActiveView('library')} />;
      case 'calendar': return <Calendar />;
      case 'wishlist': return null; 
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-x-clip relative transition-colors duration-300">
      <main className="min-h-screen">{renderView()}</main>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-2 z-50 grid grid-cols-5 gap-1 items-center">
        <NavButton active={activeView === 'library' || activeView === 'add'} onClick={() => { setActiveView('library'); setFilterTag(''); }} icon={<LibraryIcon size={20} />} label="Бібліотека" />
        <NavButton active={activeView === 'reading'} onClick={() => setActiveView('reading')} icon={<BookIcon size={20} />} label="Читаю" />
        <NavButton active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} icon={<CalendarIcon size={20} />} label="Календар" />
        <NavButton active={activeView === 'statistics'} onClick={() => setActiveView('statistics')} icon={<BarChart2 size={20} />} label="Статистика" />
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20} />} label="Налаштування" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all w-full ${active ? 'text-indigo-600 scale-110 font-medium' : 'text-gray-400 hover:bg-gray-50/50'}`}>
    {icon}
    <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <UIProvider>
          <LibraryProvider>
              <AppContent />
          </LibraryProvider>
      </UIProvider>
    </ErrorBoundary>
  );
};

export default App;
