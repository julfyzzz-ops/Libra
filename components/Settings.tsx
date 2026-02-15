
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, CheckCircle2, ShieldCheck, Folder, Download, FileJson } from 'lucide-react';
import { getSyncStatus, connectGoogleDrive, disconnectGoogleDrive, syncToCloud, loadLibrary } from '../services/storageService';
import { SyncStatus } from '../types';

export const Settings: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    const success = await connectGoogleDrive();
    if (success) {
      setStatus(getSyncStatus());
    }
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    disconnectGoogleDrive();
    setStatus(getSyncStatus());
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncToCloud();
    setStatus(getSyncStatus());
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleExport = async () => {
    try {
      const data = await loadLibrary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `booktracker_library_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export library:', error);
      alert('Помилка при експорті даних.');
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Налаштування</h1>
        <p className="text-gray-500">Синхронізація та профіль</p>
      </header>

      {/* Google Drive Sync Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${status.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
              {status.isConnected ? <Cloud size={24} /> : <CloudOff size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Google Drive</h3>
              <p className="text-xs text-gray-500">
                {status.isConnected ? `Підключено: ${status.accountEmail}` : 'Не підключено'}
              </p>
            </div>
          </div>
          {status.isConnected ? (
            <button 
              onClick={handleDisconnect}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isConnecting ? 'Підключення...' : 'Увійти'}
            </button>
          )}
        </div>

        {status.isConnected && (
          <>
            <div className="pt-4 border-t border-gray-50 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2">
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  Остання синхронізація
                </span>
                <span className="font-medium text-gray-700">
                  {status.lastSync ? new Date(status.lastSync).toLocaleString('uk-UA') : 'Ніколи'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2">
                  <Folder size={14} />
                  Папка на диску
                </span>
                <span className="font-medium text-gray-700">BookTracker_Library</span>
              </div>
              <button 
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                Синхронізувати зараз
              </button>
            </div>
          </>
        )}
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Керування даними</h3>
        <p className="text-sm text-gray-500">Збережіть копію своєї бібліотеки для резервного копіювання.</p>
        <button 
          onClick={handleExport}
          className="w-full bg-slate-50 text-slate-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-slate-100 hover:bg-slate-100"
        >
          <FileJson size={18} className="text-indigo-600" />
          Експортувати в JSON
        </button>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Про додаток</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <ShieldCheck className="text-indigo-600" size={20} />
             <div className="text-sm">
               <p className="font-bold text-gray-800">Безпека даних</p>
               <p className="text-gray-500 text-xs">Дані зберігаються лише у вашому браузері та на Google Drive</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <CheckCircle2 className="text-emerald-500" size={20} />
             <div className="text-sm">
               <p className="font-bold text-gray-800">BookTracker v1.5</p>
               <p className="text-gray-500 text-xs">Твій розумний помічник для читання</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
