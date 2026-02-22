export type DebugLogLevel = "error" | "warn" | "info";

export interface DebugLogEntry {
  id: string;
  ts: string;
  level: DebugLogLevel;
  scope: string;
  message: string;
  details?: string;
}

const DEBUG_MODE_KEY = "libra_debug_mode";
const DEBUG_LOGS_KEY = "libra_debug_logs";
const MAX_LOGS = 300;

let isInitialized = false;
let idCounter = 0;

const nextId = (): string => {
  idCounter += 1;
  return `dbg-${Date.now().toString(36)}-${idCounter.toString(36)}`;
};

const safeStringify = (value: unknown): string => {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack || ""}`.trim();
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const readLogs = (): DebugLogEntry[] => {
  try {
    const raw = localStorage.getItem(DEBUG_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DebugLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLogs = (logs: DebugLogEntry[]): void => {
  try {
    localStorage.setItem(DEBUG_LOGS_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch {
    // no-op
  }
};

export const isDebugModeEnabled = (): boolean => {
  try {
    return localStorage.getItem(DEBUG_MODE_KEY) === "1";
  } catch {
    return false;
  }
};

export const setDebugModeEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(DEBUG_MODE_KEY, enabled ? "1" : "0");
  } catch {
    // no-op
  }
  appendDebugLog("info", "debug.mode", enabled ? "enabled" : "disabled");
};

export const getDebugLogs = (): DebugLogEntry[] => readLogs();

export const clearDebugLogs = (): void => {
  try {
    localStorage.removeItem(DEBUG_LOGS_KEY);
  } catch {
    // no-op
  }
};

export const appendDebugLog = (
  level: DebugLogLevel,
  scope: string,
  message: string,
  details?: unknown
): void => {
  if (!isDebugModeEnabled()) return;
  const entry: DebugLogEntry = {
    id: nextId(),
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    details: details === undefined ? undefined : safeStringify(details),
  };
  const logs = readLogs();
  logs.push(entry);
  writeLogs(logs);
};

export const initDebugLogger = (): void => {
  if (isInitialized) return;
  isInitialized = true;

  const rawError = console.error.bind(console);
  const rawWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    try {
      const [first, ...rest] = args;
      appendDebugLog("error", "console.error", safeStringify(first), rest.length ? rest : undefined);
    } catch {
      // no-op
    }
    rawError(...args);
  };

  console.warn = (...args: unknown[]) => {
    try {
      const [first, ...rest] = args;
      appendDebugLog("warn", "console.warn", safeStringify(first), rest.length ? rest : undefined);
    } catch {
      // no-op
    }
    rawWarn(...args);
  };

  window.addEventListener("error", (event) => {
    appendDebugLog("error", "window.error", event.message || "Unknown error", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    appendDebugLog("error", "unhandledrejection", "Unhandled promise rejection", event.reason);
  });
};

