import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface Rule {
  id?: number;
  name: string;
  priority: number;
  enabled: boolean;
  extensions: string[];
  pattern: string | null;
  destination: string;
  action: string;
  folder_id: number;
  notification_message: string | null;
  normalize_extensions: boolean;
  extension_mappings: string;
}

export interface WatchedFolder {
  id?: number;
  path: string;
  enabled: boolean;
  mode: string;
}

export interface ActionLog {
  id?: number;
  timestamp: string;
  source_path: string;
  destination_path: string | null;
  action: string;
  file_name: string;
  file_type: string;
  undone: boolean;
}

export interface AppSettings {
  id?: number;
  language: string;
  theme: string;
  telemetry_enabled: boolean;
  first_run: boolean;
  autostart: boolean;
  grace_period_seconds: number;
  lock_check_enabled: boolean;
  auto_update_enabled: boolean;
}

export const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'system',
  telemetry_enabled: false,
  first_run: true,
  autostart: true,
  grace_period_seconds: 300,
  lock_check_enabled: true,
  auto_update_enabled: true,
};

export interface ScheduleSettings {
  schedule_enabled: boolean;
  schedule_times_per_day: number;
  schedule_time_1: string | null;
  schedule_time_2: string | null;
  schedule_time_3: string | null;
  schedule_time_4: string | null;
}

interface AppState {
  rules: Rule[];
  folders: WatchedFolder[];
  logs: ActionLog[];
  stats: { file_type: string; count: number }[];
  settings: AppSettings | null;
  schedule: ScheduleSettings | null;
  pendingFiles: [string, string][];
  isLoading: boolean;
  currentView: 'popup' | 'settings';

  loadSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  setAutostart: (enabled: boolean) => Promise<void>;
  loadRules: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadLogs: () => Promise<void>;
  loadStats: () => Promise<void>;
  scanFolder: (path: string) => Promise<{ file: string; rule: string; destination: string }[]>;
  scanSelectedFiles: (paths: string[]) => Promise<{ file: string; rule: string; destination: string }[]>;
  undoAction: (id: number) => Promise<boolean>;
  undoAll: () => Promise<number>;
  addFolder: (path: string, mode: string) => Promise<void>;
  removeFolder: (id: number) => Promise<void>;
  updateFolderMode: (id: number, mode: string) => Promise<void>;
  addRule: (rule: Rule) => Promise<void>;
  updateRule: (rule: Rule) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  clearLogs: () => Promise<void>;
  getPendingFiles: () => Promise<void>;
  getSchedule: () => Promise<void>;
  updateSchedule: (schedule: ScheduleSettings) => Promise<void>;
  exportRules: (path: string) => Promise<void>;
  importRules: (path: string, replace: boolean) => Promise<number>;
}

export const useAppStore = create<AppState>((set, get) => ({
  rules: [],
  folders: [],
  logs: [],
  stats: [],
  settings: null,
  schedule: null,
  pendingFiles: [],
  isLoading: false,
  currentView: 'popup',

  loadSettings: async () => {
    const settings = await invoke<AppSettings>('get_settings_cmd');
    set({ settings });
  },

  saveSettings: async (settings) => {
    await invoke('update_settings_cmd', { settings });
    set({ settings });
  },

  setAutostart: async (enabled) => {
    const { settings } = get();
    if (!settings) return;
    if (enabled) {
      await invoke('enable_autostart_cmd');
    } else {
      await invoke('disable_autostart_cmd');
    }
    const updated = { ...settings, autostart: enabled };
    await invoke('update_settings_cmd', { settings: updated });
    set({ settings: updated });
  },

  loadRules: async () => {
    const rules = await invoke<Rule[]>('get_rules_cmd');
    set({ rules });
  },

  loadFolders: async () => {
    const folders = await invoke<WatchedFolder[]>('get_folders_cmd');
    set({ folders });
  },

  loadLogs: async () => {
    const logs = await invoke<ActionLog[]>('get_logs_cmd', { limit: 50 });
    set({ logs });
  },

  loadStats: async () => {
    const raw = await invoke<[string, number][]>('get_stats_cmd');
    set({ stats: raw.map(([file_type, count]) => ({ file_type, count })) });
  },

  scanFolder: async (path) => {
    set({ isLoading: true });
    try {
      const results = await invoke<[string, string, string][]>('scan_folder_cmd', { path });
      await get().loadLogs();
      await get().loadStats();
      return results.map(([file, rule, destination]) => ({ file, rule, destination }));
    } finally {
      set({ isLoading: false });
    }
  },

  scanSelectedFiles: async (paths) => {
    set({ isLoading: true });
    try {
      const results = await invoke<[string, string, string][]>('scan_selected_files_cmd', { paths });
      await get().loadLogs();
      await get().loadStats();
      await get().getPendingFiles();
      return results.map(([file, rule, destination]) => ({ file, rule, destination }));
    } finally {
      set({ isLoading: false });
    }
  },

  undoAction: async (id) => {
    const success = await invoke<boolean>('undo_action_cmd', { id });
    if (success) {
      await get().loadLogs();
      await get().loadStats();
    }
    return success;
  },

  undoAll: async () => {
    const count = await invoke<number>('undo_all_cmd');
    if (count > 0) {
      await get().loadLogs();
      await get().loadStats();
    }
    return count;
  },

  addFolder: async (path, mode) => {
    try {
      await invoke('add_folder_cmd', { path, mode });
      await get().loadFolders();
    } catch (e) {
      console.error('addFolder failed:', e);
      throw e;
    }
  },

  removeFolder: async (id) => {
    try {
      await invoke('remove_folder_cmd', { id });
      await get().loadFolders();
    } catch (e) {
      console.error('removeFolder failed:', e);
      throw e;
    }
  },

  updateFolderMode: async (id, mode) => {
    try {
      await invoke('update_folder_mode_cmd', { id, mode });
      await get().loadFolders();
    } catch (e) {
      console.error('updateFolderMode failed:', e);
      throw e;
    }
  },

  addRule: async (rule) => {
    await invoke('add_rule_cmd', { rule });
    await get().loadRules();
  },

  updateRule: async (rule) => {
    await invoke('update_rule_cmd', { rule });
    await get().loadRules();
  },

  deleteRule: async (id) => {
    await invoke('delete_rule_cmd', { id });
    await get().loadRules();
  },

  clearLogs: async () => {
    await invoke('clear_logs_cmd');
    set({ logs: [], stats: [] });
  },

  getPendingFiles: async () => {
    try {
      const pendingFiles = await invoke<[string, string][]>('get_pending_files_cmd');
      set({ pendingFiles });
    } catch (e) {
      console.error('getPendingFiles failed:', e);
    }
  },

  getSchedule: async () => {
    try {
      const schedule = await invoke<ScheduleSettings>('get_schedule_cmd');
      set({ schedule });
    } catch (e) {
      console.error('getSchedule failed:', e);
    }
  },

  updateSchedule: async (schedule) => {
    await invoke('update_schedule_cmd', { schedule });
    set({ schedule });
  },

  exportRules: async (path) => {
    await invoke('export_rules_cmd', { path });
  },

  importRules: async (path, replace) => {
    const count = await invoke<number>('import_rules_cmd', { path, replace });
    await get().loadRules();
    return count;
  },
}));
