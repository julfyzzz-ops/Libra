
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Library as LibraryIcon, PlusCircle, Calendar as CalendarIcon, Heart, Settings as SettingsIcon } from 'lucide-react';
import { ViewType, Book, LibraryState, BookFormat } from './types';
import { Statistics } from './components/Statistics';
import { Library } from './components/Library';
import { AddBook } from './components/AddBook';
import { Calendar } from './components/Calendar';
import { Wishlist } from './components/Wishlist';
import { Settings } from './components/Settings';
import { loadLibrary, saveLibrary } from './services/storageService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('library');
  const [state, setState] = useState<LibraryState>({ books: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
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
    setActiveView(book.status === 'Wishlist' ? 'wishlist' : 'library');
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
    setActiveView('library');
  };

  const renderView = () => {
    if (isLoading) return <div className="flex h-screen items-center justify-center animate-bounce"><LibraryIcon size={48} className="text-indigo-600" /></div>;

    switch (activeView) {
      case 'statistics': return <Statistics books={state.books} />;
      case 'library': return <Library books={state.books} onUpdateBook={updateBook} onDeleteBook={deleteBook} onReorderBooks={handleReorder} />;
      case 'add': return <AddBook onAdd={addBook} />;
      case 'calendar': return <Calendar books={state.books} />;
      case 'wishlist': return <Wishlist books={state.books} onUpdateStatus={moveFromWishlist} onDelete={deleteBook} onReorderBooks={handleReorder} />;
      case 'settings': return <Settings />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 overflow-x-hidden">
      <main className="min-h-screen">{renderView()}</main>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] glass-morphism rounded-[2.5rem] shadow-2xl p-2 z-50 flex justify-between items-center px-4">
        <NavButton active={activeView === 'statistics'} onClick={() => setActiveView('statistics')} icon={<BarChart2 size={20} />} label="Стат" />
        <NavButton active={activeView === 'library'} onClick={() => setActiveView('library')} icon={<LibraryIcon size={20} />} label="Книги" />
        <NavButton active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} icon={<CalendarIcon size={20} />} label="Календ" />
        <button onClick={() => setActiveView('add')} className={`p-4 rounded-full shadow-xl transition-all transform active:scale-90 ${activeView === 'add' ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}><PlusCircle size={28} strokeWidth={2.5} /></button>
        <NavButton active={activeView === 'wishlist'} onClick={() => setActiveView('wishlist')} icon={<Heart size={20} />} label="Бажання" />
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20} />} label="Налашт" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all flex-1 ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
    {icon}
    <span className={`text-[8px] font-bold mt-1 uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

export default App;
