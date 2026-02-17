
import React, { useState, useEffect } from 'react';
import { Book, ReadingSessionData } from '../types';
import { BookOpen, X, Play, Pause, Square, CheckCircle2, Save, Edit3, Trash2, Delete, Trophy, Calendar, Clock, Zap, FileText } from 'lucide-react';
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

  // Helper component for Diary Cards
  const DiaryCardItem = ({ icon: Icon, label, value, colorClass }: any) => (
    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
            <Icon size={10} className="text-gray-400" />
            <span className="text-[9px] text-gray-400 uppercase font-bold truncate">{label}</span>
        </div>
        <span className={`text-xs font-black truncate ${colorClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#323238] flex flex-col animate-in fade-in duration-300">
       
       {/* TOP SECTION: Compact & Non-scrollable */}
       <div className="flex-none flex flex-col items-center px-4 pt-4 pb-2 w-full h-[55%] min-h-[300px]">
           {/* Header */}
           <div className="w-full flex justify-end items-center mb-2">
             <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X size={20} /></button>
           </div>
           
           {/* Book Info (Compact) */}
           <div className="flex flex-col items-center justify-center flex-1 w-full gap-3">
               <div className="flex items-center gap-6 w-full max-w-sm justify-center">
                   <div className="w-20 h-28 rounded-lg overflow-hidden shadow-2xl relative flex-shrink-0 border border-white/10">
                      {book.coverUrl ? (
                          <img src={book.coverUrl} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500"><BookOpen size={32} /></div>
                      )}
                   </div>
                   
                   <div className="flex flex-col justify-center">
                       <div className="text-4xl font-bold text-white leading-none mb-2">
                         {calculateProgress(book.pagesRead, book.pagesTotal)}%
                       </div>
                       <p className="text-xs font-medium text-gray-400 mb-3 max-w-[140px] leading-tight">
                           {getRemainingTimeText(book)}
                       </p>
                       
                       {/* Compact Progress Bar */}
                       <div className="w-32 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                            style={{ width: `${calculateProgress(book.pagesRead, book.pagesTotal)}%` }} 
                          />
                       </div>
                   </div>
               </div>
           </div>

           {/* Controls (Fixed at bottom of top section) */}
           <div className="w-full flex justify-center pb-4">
              {!session.isActive ? (
                <button 
                  onClick={handleStartRecordClick} 
                  disabled={book.status === 'Completed'}
                  className={`w-20 h-20 rounded-full border-[4px] border-white/10 flex items-center justify-center shadow-xl active:scale-95 transition-all ${book.status === 'Completed' ? 'bg-gray-500 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}
                >
                    {book.status === 'Completed' ? <CheckCircle2 size={28} className="text-white" /> : <div className="w-6 h-6 bg-white rounded-sm" />} 
                </button>
              ) : (
                <div className="flex items-center gap-4 bg-black/30 p-2 rounded-[2.5rem] backdrop-blur-md border border-white/5">
                    <button onClick={handlePauseToggle} className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                        {session.isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                    </button>
                    
                    <div className="text-white font-mono text-2xl font-bold w-24 text-center tracking-wider">{formatTime(session.seconds)}</div>

                    <button onClick={handleStopRecordClick} className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                        <Square size={18} fill="currentColor" />
                    </button>
                </div>
              )}
           </div>
       </div>

       {/* BOTTOM SECTION: Diary (Scrollable) */}
       <div className="flex-1 bg-white rounded-t-[2rem] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col w-full">
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" /> 
                Щоденник
             </h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
              {book.sessions && book.sessions.length > 0 ? (
                  [...book.sessions].reverse().map((s) => {
                      const speed = s.duration > 0 ? Math.round(s.pages / (s.duration / 3600)) : 0;
                      const isEditing = editingSessionId === s.id;
                      
                      return (
                          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm flex items-stretch gap-2">
                              {/* 4 Cards Container */}
                              <div className="flex-1 grid grid-cols-4 gap-2">
                                  {/* Date Card */}
                                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-1.5 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                          <Calendar size={10} className="text-gray-400" />
                                          <span className="text-[9px] text-gray-400 uppercase font-bold truncate">Дата</span>
                                      </div>
                                      {isEditing ? (
                                        <input type="date" className="w-full bg-white text-[10px] rounded border border-gray-200 p-0.5" value={s.date} onChange={(e) => updateSession(s.id, 'date', e.target.value)} />
                                      ) : (
                                        <span className="text-xs font-bold text-gray-700 truncate">{new Date(s.date).toLocaleDateString('uk-UA', {day: '2-digit', month: '2-digit'})}</span>
                                      )}
                                  </div>

                                  {/* Pages Card */}
                                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-1.5 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                          <FileText size={10} className="text-gray-400" />
                                          <span className="text-[9px] text-gray-400 uppercase font-bold truncate">Стор</span>
                                      </div>
                                      {isEditing ? (
                                        <input type="number" className="w-full text-center bg-white text-xs rounded border border-gray-200 p-0.5" value={s.pages} onChange={(e) => updateSession(s.id, 'pages', parseInt(e.target.value) || 0)} />
                                      ) : (
                                        <span className="text-xs font-black text-indigo-600">{s.pages}</span>
                                      )}
                                  </div>

                                  {/* Time Card */}
                                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl p-1.5 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                          <Clock size={10} className="text-gray-400" />
                                          <span className="text-[9px] text-gray-400 uppercase font-bold truncate">Хв</span>
                                      </div>
                                      {isEditing ? (
                                        <input type="number" className="w-full text-center bg-white text-xs rounded border border-gray-200 p-0.5" value={Math.round(s.duration / 60)} onChange={(e) => updateSession(s.id, 'duration', (parseInt(e.target.value) || 0) * 60)} />
                                      ) : (
                                        <span className="text-xs font-black text-gray-700">{Math.round(s.duration / 60)}</span>
                                      )}
                                  </div>

                                  {/* Speed Card */}
                                  <DiaryCardItem 
                                    icon={Zap} 
                                    label="Швидк" 
                                    value={`${speed}`} 
                                    colorClass="text-amber-500" 
                                  />
                              </div>

                              {/* Actions Column */}
                              <div className="flex flex-col gap-1 w-8 flex-shrink-0">
                                  <button 
                                      onClick={() => setEditingSessionId(isEditing ? null : s.id)} 
                                      className={`flex-1 flex items-center justify-center rounded-lg transition-colors ${isEditing ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-indigo-600'}`}
                                  >
                                      {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                                  </button>
                                  <button 
                                      onClick={() => deleteSession(s.id)} 
                                      className="flex-1 flex items-center justify-center bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </div>
                      );
                  })
              ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-2">
                    <Clock size={32} opacity={0.2} />
                    <p className="text-xs font-medium">Історія читання порожня</p>
                  </div>
              )}
          </div>
       </div>

       {/* Numpad Dialog */}
       {numpadMode && (
         <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
               <h3 className="text-lg font-bold text-gray-800 text-center mb-6">
                   {numpadMode === 'start' ? 'З якої сторінки почали?' : 'На якій сторінці зупинились?'}
               </h3>
               <div className="flex justify-center mb-6">
                   <div className="text-5xl font-black text-gray-800 flex items-center tracking-tight">{numpadValue || '0'}<span className="animate-pulse text-indigo-500 ml-1">|</span></div>
               </div>
               <div className="grid grid-cols-3 gap-3 mb-4">
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                       <button key={num} onClick={() => handleNumpadPress(num)} className="h-14 rounded-2xl text-xl font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm">{num}</button>
                   ))}
                   <div />
                   <button onClick={() => handleNumpadPress(0)} className="h-14 rounded-2xl text-xl font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm">0</button>
                   <button onClick={handleNumpadBackspace} className="h-14 rounded-2xl flex items-center justify-center text-gray-800 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-sm"><Delete size={20} /></button>
               </div>
               <div className="flex gap-3">
                   <button onClick={() => setNumpadMode(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-600 active:scale-95 transition-all">Скасувати</button>
                   <button onClick={handleNumpadConfirm} className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all">OK</button>
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
