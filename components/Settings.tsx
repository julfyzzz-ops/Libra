import React, { useEffect, useRef, useState } from 'react';
import { Bug, CheckCircle2, Copy, Download, DownloadCloud, FileSpreadsheet, Globe, Heart, Loader2, Palette, ShieldCheck, Trash2, Upload, X, Zap } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useUI } from '../contexts/UIContext';
import { MessageKey } from '../i18n/messages';
import { importLibraryFromCSV, importLibraryFromJSON } from '../services/importers';
import { buildCustomProxyUrl } from '../services/MBooksParser';
import { exportLibraryToJSON, loadSettings, saveSettings } from '../services/storageService';
import { AccentColor, AppLanguage, AppSettings, BackgroundTone } from '../types';
import { ACCENT_COLORS, applyTheme, BACKGROUND_TONES } from '../utils';

const CLOUDFLARE_WORKER_CODE = `export default {
  async fetch(request) {
    const url = new URL(request.url);
    let targetUrl = url.searchParams.get("url") || url.searchParams.get("quest");
    if (!targetUrl && url.pathname.length > 1) {
      targetUrl = url.pathname.slice(1);
    }
    if (!targetUrl) {
      return new Response("Libra CORS Proxy is running! Use: ?url=https://...", {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/json,*/*;q=0.8",
          "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": targetUrl.includes("goodreads") ? "https://www.goodreads.com/" : "https://mbooks.com.ua/"
        }
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};`;

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
  const [settings, setSettings] = useState<AppSettings>({ accent: 'indigo', bg: 'cool', language: 'en', corsProxyUrl: '' });

  const [proxyInput, setProxyInput] = useState('');
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestStatus, setProxyTestStatus] = useState<'success' | 'error' | null>(null);
  const [proxyErrorMessage, setProxyErrorMessage] = useState('');
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Check if running as PWA (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    const handleInstallAvailable = () => setCanInstall(true);
    const handleInstalled = () => {
      setCanInstall(false);
      setIsAppInstalled(true);
      toast.show(settings.language === 'en' ? 'Application installed successfully!' : 'Додаток успішно встановлено!', 'success');
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [settings.language]);

  const handlePwaInstall = async () => {
    const promptEvent = (window as any).deferredPrompt;
    
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User prompt decision: ${outcome}`);
      (window as any).deferredPrompt = null;
      setCanInstall(false);
    } else {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isiOS) {
        alert(
          settings.language === 'en'
            ? "To install on iOS:\n1. Tap the Share button (arrow pointing up at Safari toolbar).\n2. Scroll down and tap 'Add to Home Screen'."
            : "Для встановлення на iOS:\n1. Натисніть кнопку 'Поділитися' (іконка стрілки вгору в Safari).\n2. Оберіть пункт 'Додати на початковий екран'."
        );
      } else {
        alert(
          settings.language === 'en'
            ? "To install on Android / Chrome:\n1. Open other menu (three dots in top right corner of Chrome).\n2. Select 'Install app' or 'Add to Home screen'."
            : "Для встановлення на Android / Chrome:\n1. Натисніть на три крапки в правому верхньому кутку меню Chrome.\n2. Оберіть пункт 'Встановити додаток' або 'Додати на головний екран'."
        );
      }
    }
  };

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setProxyInput(loaded.corsProxyUrl || '');
  }, []);

  const saveAndApply = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
    onSettingsChange?.(nextSettings);
    applyTheme(nextSettings.accent, nextSettings.bg);
  };

  const handleSaveProxy = () => {
    const val = proxyInput.trim();
    saveAndApply({ ...settings, corsProxyUrl: val });
    if (val) {
      toast.show(t('settings.toast.proxySaved'), 'success');
    } else {
      toast.show(t('settings.toast.proxyCleared'), 'info');
    }
  };

  const handleTestProxy = async () => {
    const candidate = proxyInput.trim();
    if (!candidate) return;
    setIsTestingProxy(true);
    setProxyTestStatus(null);
    setProxyErrorMessage('');

    try {
      const testTarget = 'https://mbooks.com.ua/';
      const proxiedUrl = buildCustomProxyUrl(candidate, testTarget);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(proxiedUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50 && !text.includes('id="root"')) {
          setProxyTestStatus('success');
          toast.show(t('settings.proxySuccess'), 'success');
          saveAndApply({ ...settings, corsProxyUrl: candidate });
        } else {
          setProxyTestStatus('error');
          setProxyErrorMessage('Empty response');
          toast.show(t('settings.proxyError'), 'error');
        }
      } else {
        setProxyTestStatus('error');
        setProxyErrorMessage(`HTTP error ${res.status}`);
        toast.show(t('settings.proxyError'), 'error');
      }
    } catch (e: any) {
      setProxyTestStatus('error');
      setProxyErrorMessage(e?.message || 'Connection failed');
      toast.show(t('settings.proxyError'), 'error');
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleCopyWorkerCode = async () => {
    try {
      await navigator.clipboard.writeText(CLOUDFLARE_WORKER_CODE);
      setIsCodeCopied(true);
      toast.show(t('settings.proxyCodeCopied'), 'success');
      setTimeout(() => setIsCodeCopied(false), 3000);
    } catch {
      toast.show('Copy failed', 'error');
    }
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
                {bgLabel(key as BackgroundTone)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cloudflare Worker / CORS Proxy Settings */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settings.proxyTitle')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.proxySubtitle')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-700 block">
            {t('settings.proxyLabel')}
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={proxyInput}
              onChange={(e) => {
                setProxyInput(e.target.value);
                setProxyTestStatus(null);
              }}
              placeholder="https://libra-proxy.username.workers.dev"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              onClick={handleSaveProxy}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-xs"
            >
              {t('common.save')}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTestProxy}
              disabled={isTestingProxy || !proxyInput.trim()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
            >
              {isTestingProxy ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              <span>{isTestingProxy ? t('settings.proxyTesting') : t('settings.proxyTest')}</span>
            </button>
            {proxyTestStatus === 'success' && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('settings.proxySuccess')}
              </span>
            )}
            {proxyTestStatus === 'error' && (
              <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <X size={14} /> {proxyErrorMessage || t('settings.proxyError')}
              </span>
            )}
          </div>
        </div>

        <div className="border border-indigo-50 bg-indigo-50/50 rounded-2xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Zap size={14} className="text-indigo-600" />
              {t('settings.proxyHelpTitle')}
            </span>
            <button
              onClick={handleCopyWorkerCode}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              {isCodeCopied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{isCodeCopied ? t('settings.proxyCodeCopied') : t('settings.proxyCopyCode')}</span>
            </button>
          </div>

          <ol className="list-decimal list-inside text-gray-600 space-y-1.5 leading-relaxed pl-1">
            <li>{t('settings.proxyStep1')}</li>
            <li>{t('settings.proxyStep2')}</li>
            <li>{t('settings.proxyStep3')}</li>
            <li>{t('settings.proxyStep4')}</li>
          </ol>
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
           <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <Heart size={20} />
           </div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settings.thankAuthor')}</h3>
        </div>
        <a 
          href="https://send.monobank.ua/jar/7stNN1kZYM" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-200"
        >
          <Heart size={18} />
          <span>{t('settings.thankAuthor')}</span>
        </a>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <DownloadCloud size={20} />
           </div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settings.pwa.installTitle')}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{t('settings.pwa.installSubtitle')}</p>

        <button
          onClick={handlePwaInstall}
          disabled={isAppInstalled}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${
            isAppInstalled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
          }`}
        >
          <DownloadCloud size={18} />
          <span>{isAppInstalled ? t('settings.pwa.installed') : t('settings.pwa.installBtn')}</span>
        </button>
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
              <p className="font-bold text-gray-800 mb-0.5">Libra v4.1</p>
              <p className="text-gray-500 text-xs leading-relaxed">{t('settings.versionDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
