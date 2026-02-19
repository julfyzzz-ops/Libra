
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Library as LibraryIcon, PlusCircle, Calendar as CalendarIcon, Settings as SettingsIcon, Book as BookIcon } from 'lucide-react';
import { ViewType, Book, LibraryState, BookFormat } from './types';
import { Statistics } from './components/Statistics';
import { Library } from './components/Library';
import { AddBook } from './components/AddBook';
import { Calendar } from './components/Calendar';
import { Settings } from './components/Settings';
import { ReadingList } from './components/ReadingList';
import { loadLibrary, saveLibrary, loadSettings } from './services/storageService';
import { applyTheme } from './utils';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('library');
  const [state, setState] = useState<LibraryState>({ books: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // Lifted state for filtering library from other views
  const [libraryFilter, setLibraryFilter] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      // Load Theme
      const settings = loadSettings();
      applyTheme(settings.accent, settings.bg);

      // Load Data
      const data = await loadLibrary();
      setState(data);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleUpdate = useCallback(async (newState: LibraryState) => {
    setState(newState);
    await saveLibrary(newState);
  }, []);

  const addBook = (book: Book) => {
    const newState = { ...state, books: [...state.books, book] };
    handleUpdate(newState);
    if (book.status !== 'Wishlist') {
        setActiveView('library');
    }
  };

  const updateBook = (updatedBook: Book) => {
    const newState = {
      ...state,
      books: state.books.map(b => b.id === updatedBook.id ? updatedBook : b)
    };
    handleUpdate(newState);
  };

  const deleteBook = (id: string) => {
    const newState = {
      ...state,
      books: state.books.filter(b => b.id !== id)
    };
    handleUpdate(newState);
  };

  const handleReorder = (newBooks: Book[]) => {
    handleUpdate({ ...state, books: newBooks });
  };

  const moveFromWishlist = (id: string, targetStatus: 'Reading' | 'Completed', formats?: BookFormat[]) => {
    const newState = {
      ...state,
      books: state.books.map(b => b.id === id ? { 
        ...b, 
        status: targetStatus,
        formats: formats || b.formats,
        readingStartedAt: targetStatus === 'Reading' ? new Date().toISOString() : b.readingStartedAt,
        readingDates: targetStatus === 'Reading' ? [new Date().toISOString().split('T')[0]] : b.readingDates 
      } : b)
    };
    handleUpdate(newState);
  };

  // Handler to switch to library and set filter
  const handleFilterByTag = (tag: string) => {
    setLibraryFilter(tag);
    setActiveView('library');
  };

  const renderView = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center animate-bounce"><LibraryIcon size={48} className="text-indigo-600" /></div>;

    switch (activeView) {
      case 'statistics': return <Statistics books={state.books} />;
      case 'library': return (
        <Library 
          books={state.books} 
          onUpdateBook={updateBook} 
          onDeleteBook={deleteBook} 
          onReorderBooks={handleReorder}
          onUpdateStatus={moveFromWishlist}
          onAddClick={() => setActiveView('add')}
          onAddBook={addBook}
          initialSearch={libraryFilter}
          onFilterByTag={handleFilterByTag}
        />
      );
      case 'reading': return (
        <ReadingList 
          books={state.books} 
          onUpdateBook={updateBook} 
          onDeleteBook={deleteBook}
          onFilterByTag={handleFilterByTag}
        />
      );
      case 'add': return <AddBook onAdd={addBook} existingBooks={state.books} />;
      case 'calendar': return (
        <Calendar 
          books={state.books} 
          onUpdateBook={updateBook} 
          onDeleteBook={deleteBook}
          onFilterByTag={handleFilterByTag}
        />
      );
      case 'wishlist': return null; 
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 overflow-x-hidden relative transition-colors duration-300">
      <main className="min-h-screen">{renderView()}</main>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] glass-morphism rounded-[2.5rem] shadow-2xl p-2 z-50 flex justify-between items-center px-4">
        <NavButton active={activeView === 'library' || activeView === 'add'} onClick={() => setActiveView('library')} icon={<LibraryIcon size={20} />} label="Бібліотека" />
        <NavButton active={activeView === 'reading'} onClick={() => setActiveView('reading')} icon={<BookIcon size={20} />} label="Читаю" />
        <NavButton active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} icon={<CalendarIcon size={20} />} label="Календар" />
        <NavButton active={activeView === 'statistics'} onClick={() => setActiveView('statistics')} icon={<BarChart2 size={20} />} label="Статистика" />
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20} />} label="Налаштування" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all flex-1 ${active ? 'text-indigo-600 scale-110 font-medium' : 'text-gray-400'}`}>
    {icon}
    <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

export default App;
