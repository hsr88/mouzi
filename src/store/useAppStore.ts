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
}

interface AppState {
  rules: Rule[];
  folders: WatchedFolder[];
  logs: ActionLog[];
  stats: { file_type: string; count: number }[];
  settings: AppSettings | null;
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
  undoAction: (id: number) => Promise<boolean>;
  addFolder: (path: string, mode: string) => Promise<void>;
  removeFolder: (id: number) => Promise<void>;
  addRule: (rule: Rule) => Promise<void>;
  updateRule: (rule: Rule) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  clearLogs: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  rules: [],
  folders: [],
  logs: [],
  stats: [],
  settings: null,
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

  undoAction: async (id) => {
    const success = await invoke<boolean>('undo_action_cmd', { id });
    if (success) {
      await get().loadLogs();
      await get().loadStats();
    }
    return success;
  },

  addFolder: async (path, mode) => {
    await invoke('add_folder_cmd', { path, mode });
    await get().loadFolders();
  },

  removeFolder: async (id) => {
    await invoke('remove_folder_cmd', { id });
    await get().loadFolders();
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
}));
