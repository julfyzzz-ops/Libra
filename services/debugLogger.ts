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
const DEBUG_RUNTIME_KEY = "libra_debug_runtime";
const MAX_LOGS = 300;

let isInitialized = false;
let idCounter = 0;
let heartbeatTimer: number | null = null;
let lagWatchdogTimer: number | null = null;
let flushTimer: number | null = null;
let flushQueued = false;
let logsCacheLoaded = false;
let logsCache: DebugLogEntry[] = [];

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

const ensureLogsCacheLoaded = (): void => {
  if (logsCacheLoaded) return;
  logsCache = readLogs();
  logsCacheLoaded = true;
};

const flushLogsNow = (): void => {
  flushQueued = false;
  if (!logsCacheLoaded) return;
  writeLogs(logsCache);
};

const scheduleFlush = (): void => {
  if (flushQueued) return;
  flushQueued = true;
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
  }
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushLogsNow();
  }, 1200);
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

export const getDebugLogs = (): DebugLogEntry[] => {
  ensureLogsCacheLoaded();
  return [...logsCache];
};

export const clearDebugLogs = (): void => {
  ensureLogsCacheLoaded();
  logsCache = [];
  flushQueued = false;
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
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
  ensureLogsCacheLoaded();
  const entry: DebugLogEntry = {
    id: nextId(),
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    details: details === undefined ? undefined : safeStringify(details),
  };
  logsCache.push(entry);
  if (logsCache.length > MAX_LOGS) {
    logsCache = logsCache.slice(-MAX_LOGS);
  }
  scheduleFlush();
};

export type DebugTraceToken = {
  scope: string;
  action: string;
  startedAt: number;
  details?: unknown;
};

export const startDebugTrace = (scope: string, action: string, details?: unknown): DebugTraceToken => {
  return {
    scope,
    action,
    startedAt: performance.now(),
    details,
  };
};

export const finishDebugTrace = (
  token: DebugTraceToken,
  level: DebugLogLevel = "info",
  details?: unknown
): void => {
  const durationMs = Math.round(performance.now() - token.startedAt);
  appendDebugLog(level, token.scope, `${token.action} finished`, {
    durationMs,
    ...(token.details === undefined ? {} : { startDetails: token.details }),
    ...(details === undefined ? {} : { details }),
  });
};

type DebugRuntimeState = {
  sessionId: string;
  startedAt: string;
  lastHeartbeatAt: string;
  cleanShutdown: boolean;
};

const readRuntimeState = (): DebugRuntimeState | null => {
  try {
    const raw = localStorage.getItem(DEBUG_RUNTIME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DebugRuntimeState;
  } catch {
    return null;
  }
};

const writeRuntimeState = (state: DebugRuntimeState): void => {
  try {
    localStorage.setItem(DEBUG_RUNTIME_KEY, JSON.stringify(state));
  } catch {
    // no-op
  }
};

const startRuntimeWatchdog = (): void => {
  if (heartbeatTimer !== null || lagWatchdogTimer !== null) return;

  const nowIso = new Date().toISOString();
  const prev = readRuntimeState();
  if (prev && prev.cleanShutdown === false) {
    const deltaMs = Date.now() - new Date(prev.lastHeartbeatAt).getTime();
    if (Number.isFinite(deltaMs) && deltaMs > 10000) {
      appendDebugLog(
        "warn",
        "runtime.recover",
        "Detected possible previous app freeze/crash",
        { previousSessionId: prev.sessionId, noHeartbeatMs: deltaMs }
      );
    }
  }

  const currentState: DebugRuntimeState = {
    sessionId: nextId(),
    startedAt: nowIso,
    lastHeartbeatAt: nowIso,
    cleanShutdown: false,
  };
  writeRuntimeState(currentState);

  heartbeatTimer = window.setInterval(() => {
    const state = readRuntimeState();
    if (!state) return;
    writeRuntimeState({
      ...state,
      lastHeartbeatAt: new Date().toISOString(),
      cleanShutdown: false,
    });
  }, 2000);

  let expected = performance.now() + 1000;
  let lastVisibleAt = Date.now();
  const updateVisibleTs = () => {
    if (document.visibilityState === "visible") {
      lastVisibleAt = Date.now();
    }
  };
  document.addEventListener("visibilitychange", updateVisibleTs);

  lagWatchdogTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") {
      expected = performance.now() + 1000;
      return;
    }
    const now = performance.now();
    const driftMs = Math.round(now - expected);
    expected = now + 1000;
    // Ignore immediate post-resume spikes right after app becomes visible.
    if (Date.now() - lastVisibleAt < 2000) return;
    if (driftMs > 1500) {
      appendDebugLog("warn", "runtime.eventloop", "Main thread lag spike detected", { driftMs });
    }
  }, 1000);

  const markCleanShutdown = () => {
    const state = readRuntimeState();
    if (!state) return;
    writeRuntimeState({
      ...state,
      lastHeartbeatAt: new Date().toISOString(),
      cleanShutdown: true,
    });
  };

  window.addEventListener("pagehide", markCleanShutdown);
  window.addEventListener("beforeunload", markCleanShutdown);
  window.addEventListener("pagehide", flushLogsNow);
  window.addEventListener("beforeunload", flushLogsNow);
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

  startRuntimeWatchdog();
};
