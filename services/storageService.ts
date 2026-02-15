
import { Book, LibraryState, SyncStatus } from "../types";

const STORAGE_KEY = 'booktracker_library_data';
const SYNC_KEY = 'booktracker_sync_status';
const FILE_NAME = 'booktracker_data.json';
const FOLDER_NAME = 'BookTracker_Library';

export const getSyncStatus = (): SyncStatus => {
  const data = localStorage.getItem(SYNC_KEY);
  return data ? JSON.parse(data) : { isConnected: false };
};

export const setSyncStatus = (status: SyncStatus) => {
  localStorage.setItem(SYNC_KEY, JSON.stringify(status));
};

export const loadLibrary = async (): Promise<LibraryState> => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return { books: [] };
  try {
    return JSON.parse(data);
  } catch {
    return { books: [] };
  }
};

export const saveLibrary = async (state: LibraryState): Promise<void> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = getSyncStatus();
  if (status.isConnected) {
    await syncToCloud(state);
  }
};

export const syncToCloud = async (state?: LibraryState) => {
  const dataToSync = state || await loadLibrary();
  console.log("Syncing to Google Drive...", dataToSync);
  
  const status = getSyncStatus();
  setSyncStatus({
    ...status,
    lastSync: new Date().toISOString()
  });
};

export const connectGoogleDrive = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      setSyncStatus({
        isConnected: true,
        accountEmail: 'user@gmail.com',
        lastSync: new Date().toISOString()
      });
      resolve(true);
    }, 1500);
  });
};

export const disconnectGoogleDrive = () => {
  setSyncStatus({ isConnected: false });
};
