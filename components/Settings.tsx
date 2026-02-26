import React, { useEffect, useRef, useState } from 'react';
import { Bug, CheckCircle2, Copy, Download, FileSpreadsheet, Loader2, Palette, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useUI } from '../contexts/UIContext';
import { MessageKey } from '../i18n/messages';
import { importLibraryFromCSV, importLibraryFromJSON } from '../services/importers';
import { clearDebugLogs, getDebugLogs, isDebugModeEnabled, setDebugModeEnabled, type DebugLogEntry } from '../services/debugLogger';
import { exportLibraryToJSON, loadSettings, saveSettings } from '../services/storageService';
import { AccentColor, AppLanguage, AppSettings, BackgroundTone } from '../types';
import { ACCENT_COLORS, applyTheme, BACKGROUND_TONES } from '../utils';

interface SettingsProps {
  onSettingsChange?: (settings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
  const { t, locale } = useI18n();
  const { toast, confirm } = useUI();
  const { refreshLibrary } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ accent: 'indigo', bg: 'cool', language: 'en' });
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

  useEffect(() => {
    setSettings(loadSettings());
    setDebugEnabled(isDebugModeEnabled());
  }, []);

  useEffect(() => {
    if (!showDebugLogs) return;
    setDebugLogs(getDebugLogs());
  }, [showDebugLogs, debugEnabled]);

  const saveAndApply = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
    onSettingsChange?.(nextSettings);
    applyTheme(nextSettings.accent, nextSettings.bg);
  };

  const updateAccent = (color: AccentColor) => {
    saveAndApply({ ...settings, accent: color });
  };

  const updateBg = (tone: BackgroundTone) => {
    saveAndApply({ ...settings, bg: tone });
  };

  const updateLanguage = (language: AppLanguage) => {
    saveAndApply({ ...settings, language });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportLibraryToJSON();
      toast.show(t('settings.toast.exportOk'), 'success');
    } catch (error) {
      console.error('Failed to export library:', error);
      toast.show(t('settings.toast.exportFail'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = async () => {
    const isConfirmed = await confirm({
      title: t('settings.confirmReplaceTitle'),
      message: t('settings.confirmReplaceMessage'),
      confirmText: t('settings.confirmReplace'),
      type: 'danger',
    });

    if (isConfirmed) fileInputRef.current?.click();
  };

  const handleCsvImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      await importLibraryFromJSON(file);
      await refreshLibrary();
      toast.show(t('settings.toast.importOk'), 'success');
    } catch {
      toast.show(t('settings.toast.importInvalid'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const count = await importLibraryFromCSV(file);
      await refreshLibrary();
      toast.show(t('settings.toast.importCount', { count }), 'success');
    } catch (error) {
      console.error(error);
      toast.show(t('settings.toast.csvFail'), 'error');
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleToggleDebugMode = () => {
    const next = !debugEnabled;
    setDebugEnabled(next);
    setDebugModeEnabled(next);
    toast.show(next ? t('settings.toast.debugOn') : t('settings.toast.debugOff'), 'info');
  };

  const handleClearDebugLogs = () => {
    clearDebugLogs();
    setDebugLogs([]);
    toast.show(t('settings.toast.logsCleared'), 'success');
  };

  const handleCopyDebugLogs = async () => {
    const payload = JSON.stringify(getDebugLogs(), null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      toast.show(t('settings.toast.logsCopied'), 'success');
    } catch {
      toast.show(t('settings.toast.logsCopyFail'), 'error');
    }
  };

  const accentLabel = (accent: AccentColor) => t(`accent.${accent}` as MessageKey);
  const bgLabel = (bg: BackgroundTone) => t(`bg.${bg}` as MessageKey);

  return (
    <div className="p-4 space-y-8 pb-32 text-gray-800 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{t('settings.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </header>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Palette size={20} />
           </div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
             {t('settings.interface')}
           </h3>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 ml-1">{t('settings.language')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['en', 'uk'] as AppLanguage[]).map((lang) => {
              const active = (settings.language || 'en') === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => updateLanguage(lang)}
                  className={`h-12 rounded-2xl border text-xs font-bold transition-all ${
                    active ? 'border-indigo-500 ring-2 ring-indigo-500/10 text-indigo-700 bg-indigo-50' : 'border-gray-100 text-gray-500 hover:border-gray-300 bg-gray-50/50'
                  }`}
                >
                  {lang === 'en' ? t('settings.lang.en') : t('settings.lang.uk')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 ml-1">{t('settings.accent')}</label>
          <div className="flex flex-wrap gap-4">
            {Object.entries(ACCENT_COLORS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => updateAccent(key as AccentColor)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  settings.accent === key ? 'ring-4 ring-indigo-100 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: val.hex }}
                title={accentLabel(key as AccentColor)}
              >
                {settings.accent === key && <CheckCircle2 size={22} className="text-white drop-shadow-md" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <label className="text-sm font-bold text-gray-700 ml-1">{t('settings.background')}</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(BACKGROUND_TONES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => updateBg(key as BackgroundTone)}
                className={`h-14 rounded-2xl border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                  settings.bg === key ? 'border-indigo-500 ring-2 ring-indigo-500/10 text-indigo-700 bg-indigo-50' : 'border-gray-100 text-gray-500 hover:border-gray-300 bg-gray-50/50'
                }`}
                style={{ backgroundColor: val.vars.card }}
              >
                <div className="w-4 h-4 rounded-full mb-1 border border-gray-200" style={{ backgroundColor: val.vars.main }} />
                {bgLabel(key as BackgroundTone)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <ShieldCheck size={20} />
           </div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settings.backupTitle')}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{t('settings.backupSubtitle')}</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            disabled={isImporting || isExporting}
            className="bg-indigo-50 text-indigo-700 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
            <span className="text-[10px] uppercase tracking-widest">{isExporting ? t('settings.exporting') : t('settings.export')}</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting || isExporting}
            className="bg-gray-50 text-gray-700 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100 hover:bg-gray-100 disabled:opacity-50"
          >
            <Upload size={24} />
            <span className="text-[10px] uppercase tracking-widest">{t('settings.importJson')}</span>
          </button>

          <button
            onClick={handleCsvImportClick}
            disabled={isImporting || isExporting}
            className="col-span-2 bg-emerald-50 text-emerald-700 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
            <span className="text-[10px] uppercase tracking-widest">{isImporting ? t('settings.importingCovers') : t('settings.importCsv')}</span>
          </button>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <input type="file" ref={csvInputRef} onChange={handleCsvChange} accept=".csv" className="hidden" />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <Bug size={20} />
           </div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settings.debugTitle')}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{t('settings.debugHelp')}</p>
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleToggleDebugMode}
            className={`px-6 py-3 rounded-2xl text-xs font-bold border transition-all ${
              debugEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            {debugEnabled ? t('common.enabled') : t('common.disabled')}
          </button>
          <button onClick={() => setShowDebugLogs(true)} className="px-6 py-3 rounded-2xl text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm active:scale-95">
            {t('settings.openLogs')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t('settings.aboutTitle')}</h3>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="text-sm">
              <p className="font-bold text-gray-800 mb-0.5">{t('settings.localStorageTitle')}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{t('settings.localStorageDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-sm">
              <p className="font-bold text-gray-800 mb-0.5">Libra v2.0</p>
              <p className="text-gray-500 text-xs leading-relaxed">{t('settings.versionDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {showDebugLogs && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{t('settings.logsTitle')}</h3>
                <p className="text-xs text-gray-500">{t('settings.logsCount', { count: debugLogs.length })}</p>
              </div>
              <button onClick={() => setShowDebugLogs(false)} className="p-2 rounded-full bg-gray-50 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex gap-2 border-b border-gray-100">
              <button
                onClick={handleCopyDebugLogs}
                className="px-3 py-2 rounded-xl text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-2"
              >
                <Copy size={14} /> {t('settings.logsCopy')}
              </button>
              <button onClick={handleClearDebugLogs} className="px-3 py-2 rounded-xl text-xs font-bold border bg-red-50 text-red-700 border-red-200 flex items-center gap-2">
                <Trash2 size={14} /> {t('settings.logsClear')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {debugLogs.length === 0 ? (
                <div className="text-sm text-gray-500">{t('settings.logsEmpty')}</div>
              ) : (
                debugLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-[10px] text-gray-500">
                        {new Date(log.ts).toLocaleString(locale)} | {log.level} | {log.scope}
                      </div>
                      <div className="text-xs font-semibold text-gray-800 mt-1 break-words">{log.message}</div>
                      {log.details && <pre className="mt-2 text-[10px] text-gray-600 whitespace-pre-wrap break-words">{log.details}</pre>}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
