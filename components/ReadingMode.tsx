
import React, { useState, useEffect } from 'react';
import { Book, ReadingSessionData } from '../types';
import { BookOpen, X, Play, Pause, Square, CheckCircle2, Save, Edit3, Trash2, Delete, Trophy } from 'lucide-react';
import { calculateProgress, formatTime, getRemainingTimeText } from '../utils';

interface ReadingModeProps {
  book: Book;
  onClose: () => void;
  onUpdateBook: (book: Book) => void;
}

interface ReadingSessionState {
  isActive: boolean;
  isPaused: boolean;
  seconds: number;
  startPage: number;
}

export const ReadingMode: React.FC<ReadingModeProps> = ({ book, onClose, onUpdateBook }) => {
  const [session, setSession] = useState<ReadingSessionState>({ isActive: false, isPaused: false, seconds: 0, startPage: book.pagesRead || 0 });
  const [numpadMode, setNumpadMode] = useState<'start' | 'stop' | null>(null);
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [tempRating, setTempRating] = useState<number>(10);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (session.isActive && !session.isPaused) {
      interval = setInterval(() => {
        setSession(prev => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.isPaused]);

  const handleStartRecordClick = () => {
    if (book.status === 'Completed') return;
    setNumpadValue((book.pagesRead || 0).toString());
    setNumpadMode('start');
  };

  const handlePauseToggle = () => {
    setSession(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleStopRecordClick = () => {
    setNumpadValue((book.pagesRead || session.startPage).toString());
    setNumpadMode('stop');
    setSession(prev => ({ ...prev, isPaused: true }));
  };

  const handleNumpadPress = (num: number) => {
    setNumpadValue(prev => prev === '0' ? num.toString() : prev + num.toString());
  };
  
  const handleNumpadBackspace = () => {
    setNumpadValue(prev => prev.slice(0, -1) || '');
  };

  const handleNumpadConfirm = () => {
    const pageVal = parseInt(numpadValue) || 0;
    
    if (numpadMode === 'start') {
        setSession(prev => ({ ...prev, isActive: true, isPaused: false, seconds: 0, startPage: pageVal }));
        setNumpadMode(null);
    } else if (numpadMode === 'stop') {
        confirmSession(pageVal);
    }
  };

  const confirmSession = (finalPage: number) => {
    const isCompleted = book.pagesTotal && finalPage >= book.pagesTotal;
    const pagesCount = Math.max(0, finalPage - session.startPage);
    const today = new Date().toISOString().split('T')[0];
    
    const newSession: ReadingSessionData = {
      id: crypto.randomUUID(),
      date: today,
      duration: session.seconds,
      pages: pagesCount
    };

    const updatedDates = [...(book.readingDates || [])];
    if (!updatedDates.includes(today)) updatedDates.push(today);
    
    let updatedBook: Book = {
        ...book,
        pagesRead: finalPage,
        status: isCompleted ? 'Completed' : 'Reading',
        sessions: [...(book.sessions || []), newSession],
        readingDates: updatedDates
    };

    if (isCompleted) {
       updatedBook.completedAt = new Date().toISOString();
    }

    onUpdateBook(updatedBook);
    
    // Reset session state but keep reading mode open
    setSession({ isActive: false, isPaused: false, seconds: 0, startPage: 0 });
    setNumpadMode(null);

    if (isCompleted) {
        setShowRatingDialog(true);
    }
  };

  const updateSession = (sessionId: string, field: keyof ReadingSessionData, value: any) => {
    const updatedSessions = book.sessions.map(s => 
      s.id === sessionId ? { ...s, [field]: value } : s
    );
    const totalPagesRead = updatedSessions.reduce((acc, s) => acc + Number(s.pages), 0);
    const updatedBook = { ...book, sessions: updatedSessions, pagesRead: totalPagesRead };
    onUpdateBook(updatedBook);
  };

  const deleteSession = (sessionId: string) => {
    if (!confirm('Видалити цю сесію?')) return;
    const updatedSessions = book.sessions.filter(s => s.id !== sessionId);
    const totalPagesRead = updatedSessions.reduce((acc, s) => acc + Number(s.pages), 0);
    const updatedBook = { ...book, sessions: updatedSessions, pagesRead: totalPagesRead };
    onUpdateBook(updatedBook);
  };

  const submitRatingAndFinish = () => {
    onUpdateBook({ ...book, rating: tempRating });
    setShowRatingDialog(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#323238] flex flex-col items-center animate-in fade-in duration-300">
       {/* Header */}
       <div className="w-full flex justify-end items-center p-6 text-white/70 z-10 flex-shrink-0">
         <button onClick={onClose}><X size={28} /></button>
       </div>
       
       {/* Scrollable Content */}
       <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center pb-4">
           <div className="w-full flex flex-col items-center justify-start px-8">
               <div className="w-36 h-56 rounded-lg overflow-hidden shadow-2xl mb-8 relative flex-shrink-0">
                  {book.coverUrl ? (
                      <img src={book.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500"><BookOpen size={48} /></div>
                  )}
               </div>
               
               <div className="text-5xl font-bold text-white mb-6">
                 {calculateProgress(book.pagesRead, book.pagesTotal)}%
               </div>

               <div className="w-full h-1.5 bg-gray-600 rounded-full mb-4 overflow-hidden">
                  <div 
                    className="h-full bg-gray-300 rounded-full transition-all duration-300" 
                    style={{ width: `${calculateProgress(book.pagesRead, book.pagesTotal)}%` }} 
                  />
               </div>

               <p className="text-sm font-bold text-white mb-12">
                   {getRemainingTimeText(book)}
               </p>

               {/* Control Center */}
               <div className="flex flex-col items-center gap-4 mb-8">
                  {!session.isActive ? (
                    <button 
                      onClick={handleStartRecordClick} 
                      disabled={book.status === 'Completed'}
                      className={`w-24 h-24 rounded-full border-[5px] border-white flex items-center justify-center shadow-xl active:scale-95 transition-all ${book.status === 'Completed' ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'bg-red-600'}`}
                    >
                        {book.status === 'Completed' && <CheckCircle2 size={32} className="text-white" />}
                    </button>
                  ) : (
                    <div className="flex items-center gap-6">
                        <button onClick={handlePauseToggle} className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                            {session.isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                        </button>
                        
                        <div className="text-white font-mono text-3xl font-bold min-w-[120px] text-center">{formatTime(session.seconds)}</div>

                        <button onClick={handleStopRecordClick} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                            <Square size={24} fill="currentColor" />
                        </button>
                    </div>
                  )}
               </div>
           </div>
       </div>

       {/* Diary / History Bottom Sheet */}
       <div className="w-full bg-white rounded-t-[2.5rem] p-6 h-[35vh] flex flex-col z-20 flex-shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center mb-4 px-2">
             <h3 className="text-xl font-bold text-gray-800">Щоденник</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
              {book.sessions && book.sessions.length > 0 ? (
                  [...book.sessions].reverse().map((s) => {
                      const speed = s.duration > 0 ? Math.round(s.pages / (s.duration / 3600)) : 0;
                      const isEditing = editingSessionId === s.id;
                      
                      return (
                          <div key={s.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                  {isEditing ? (
                                      <input type="date" className="bg-white px-2 py-1 rounded-lg text-xs font-bold outline-none border border-gray-200" value={s.date} onChange={(e) => updateSession(s.id, 'date', e.target.value)} />
                                  ) : (
                                      <span className="text-xs font-bold text-gray-500">{new Date(s.date).toLocaleDateString('uk-UA')}</span>
                                  )}
                                  
                                  <div className="flex gap-2">
                                      <button onClick={() => setEditingSessionId(isEditing ? null : s.id)} className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-400 hover:text-indigo-600'}`}>
                                          {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                                      </button>
                                      <button onClick={() => deleteSession(s.id)} className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                  <div className="flex flex-col items-center p-2 bg-white rounded-xl">
                                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Сторінок</span>
                                      {isEditing ? <input type="number" className="w-16 text-center bg-gray-50 rounded text-sm font-bold outline-none" value={s.pages} onChange={(e) => updateSession(s.id, 'pages', parseInt(e.target.value) || 0)} /> : <span className="text-sm font-black text-indigo-600">{s.pages}</span>}
                                  </div>
                                  <div className="flex flex-col items-center p-2 bg-white rounded-xl">
                                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Хвилин</span>
                                      {isEditing ? <input type="number" className="w-16 text-center bg-gray-50 rounded text-sm font-bold outline-none" value={Math.round(s.duration / 60)} onChange={(e) => updateSession(s.id, 'duration', (parseInt(e.target.value) || 0) * 60)} /> : <span className="text-sm font-black text-gray-700">{Math.round(s.duration / 60)}</span>}
                                  </div>
                                  <div className="flex flex-col items-center p-2 bg-white rounded-xl">
                                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Швидкість</span>
                                      <span className="text-sm font-black text-amber-500">{speed} <span className="text-[9px] text-gray-300 font-medium">ст/г</span></span>
                                  </div>
                              </div>
                          </div>
                      );
                  })
              ) : (
                  <div className="text-center text-gray-400 text-sm mt-10">Історія читання порожня</div>
              )}
          </div>
       </div>

       {/* Numpad Dialog */}
       {numpadMode && (
         <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
               <h3 className="text-lg font-bold text-gray-800 text-center mb-8">
                   {numpadMode === 'start' ? 'З якої сторінки почали?' : 'На якій сторінці зупинились?'}
               </h3>
               <div className="flex justify-center mb-8">
                   <div className="text-5xl font-bold text-gray-800 flex items-center">{numpadValue || '0'}<span className="animate-pulse text-indigo-500 ml-1">|</span></div>
               </div>
               <div className="grid grid-cols-3 gap-4 mb-4">
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                       <button key={num} onClick={() => handleNumpadPress(num)} className="h-16 rounded-2xl text-2xl font-bold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors">{num}</button>
                   ))}
                   <div />
                   <button onClick={() => handleNumpadPress(0)} className="h-16 rounded-2xl text-2xl font-bold text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors">0</button>
                   <button onClick={handleNumpadBackspace} className="h-16 rounded-2xl flex items-center justify-center text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors"><Delete size={24} /></button>
               </div>
               <div className="flex gap-4">
                   <button onClick={() => setNumpadMode(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-600">Скасувати</button>
                   <button onClick={handleNumpadConfirm} className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold">OK</button>
               </div>
            </div>
         </div>
       )}

       {/* Rating Dialog */}
       {showRatingDialog && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col items-center">
               <Trophy size={48} className="text-emerald-500 mb-4" />
               <h3 className="text-2xl font-bold mb-2">Вітаємо!</h3>
               <p className="text-gray-500 text-sm mb-8 text-center">Книга прочитана. Як вам вона?</p>
               <div className="grid grid-cols-5 gap-2 mb-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                     <button key={n} onClick={() => setTempRating(n)} className={`w-12 h-12 rounded-2xl text-sm font-bold transition-all ${tempRating === n ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>{n}</button>
                  ))}
               </div>
               <button onClick={submitRatingAndFinish} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-bold shadow-xl active:scale-95">Завершити</button>
            </div>
         </div>
       )}
    </div>
  );
};
