import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Project {
  id: string;
  name: string;
  description: string;
  repoName: string;
  status: 'idle' | 'building' | 'success' | 'failed';
  lastBuildUrl?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string | any;
  image?: string;
  video?: string;
  timestamp: string;
}

// API Provider Types
export interface APIProvider {
  id: string;
  name: string;
  type: 'gemini' | 'groq' | 'deepseek' | 'huggingface' | 'openrouter';
  apiKey: string;
  isActive: boolean;
  addedAt: string;
}

// GitHub Account Type
export interface GitHubAccount {
  id: string;
  username: string;
  token: string;
  isDefault: boolean;
  addedAt: string;
}

// Expo Account Type
export interface ExpoAccount {
  id: string;
  username: string;
  password: string;
  accessToken?: string;
  isDefault: boolean;
  addedAt: string;
}

// Build Tool Account Type (Firebase, Play Store, etc.)
export interface BuildToolAccount {
  id: string;
  name: string;
  type: 'firebase' | 'playstore' | 'appstore' | 'vercel' | 'netlify' | 'custom';
  credentials: Record<string, string>;
  isActive: boolean;
  addedAt: string;
}

interface AppSettings {
  // Legacy support
  geminiKeys: string[];
  githubToken: string;
  githubUsername: string;
  expoUsername: string;
  expoPassword: string;
  currentKeyIndex: number;
  
  // AI Provider Management
  aiProviders: APIProvider[];
  activeProviderId: string | null;
  
  // GitHub Account Management
  githubAccounts: GitHubAccount[];
  
  // Expo Account Management
  expoAccounts: ExpoAccount[];
  
  // Build Tools Management
  buildTools: BuildToolAccount[];
  
  // AI Agent Features
  autoCorrectMode: boolean;
  autoTestMode: boolean;
  screenshotAnalysis: boolean;
  highPerformanceMode: boolean;
  autoDebugMode: boolean;
  autonomousMode: boolean; // Full auto mode like Emergent
}

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  
  // AI Provider Management
  addAIProvider: (provider: Omit<APIProvider, 'id' | 'addedAt'>) => void;
  removeAIProvider: (id: string) => void;
  updateAIProvider: (id: string, updates: Partial<APIProvider>) => void;
  setActiveAIProvider: (id: string) => void;
  
  // GitHub Account Management
  addGitHubAccount: (account: Omit<GitHubAccount, 'id' | 'addedAt'>) => void;
  removeGitHubAccount: (id: string) => void;
  updateGitHubAccount: (id: string, updates: Partial<GitHubAccount>) => void;
  setDefaultGitHubAccount: (id: string) => void;
  
  // Expo Account Management
  addExpoAccount: (account: Omit<ExpoAccount, 'id' | 'addedAt'>) => void;
  removeExpoAccount: (id: string) => void;
  updateExpoAccount: (id: string, updates: Partial<ExpoAccount>) => void;
  setDefaultExpoAccount: (id: string) => void;
  
  // Build Tools Management
  addBuildTool: (tool: Omit<BuildToolAccount, 'id' | 'addedAt'>) => void;
  removeBuildTool: (id: string) => void;
  updateBuildTool: (id: string, updates: Partial<BuildToolAccount>) => void;
  
  // Chat
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  
  // Projects
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  
  // Pending files for GitHub push
  pendingFiles: Record<string, string> | null;
  setPendingFiles: (files: Record<string, string> | null) => void;
  
  // GitHub
  linkedRepo: string | null;
  setLinkedRepo: (repo: string | null) => void;
  
  // UI State
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useStore = create<AppState>((set, get) => ({
  // Settings
  settings: {
    // Legacy
    geminiKeys: ['', '', '', ''],
    githubToken: '',
    githubUsername: '',
    expoUsername: '',
    expoPassword: '',
    currentKeyIndex: 0,
    
    // New Management Systems
    aiProviders: [],
    activeProviderId: null,
    githubAccounts: [],
    expoAccounts: [],
    buildTools: [],
    
    // Features
    autoCorrectMode: true,
    autoTestMode: true,
    screenshotAnalysis: true,
    highPerformanceMode: true,
    autoDebugMode: true,
    autonomousMode: true,
  },
  
  setSettings: (newSettings) => {
    const updatedSettings = { ...get().settings, ...newSettings };
    set({ settings: updatedSettings });
    AsyncStorage.setItem('appfactory_settings', JSON.stringify(updatedSettings));
  },
  
  // AI Provider Management
  addAIProvider: (provider) => {
    const newProvider: APIProvider = {
      ...provider,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };
    const updatedProviders = [...get().settings.aiProviders, newProvider];
    get().setSettings({ 
      aiProviders: updatedProviders,
      activeProviderId: get().settings.activeProviderId || newProvider.id
    });
  },
  
  removeAIProvider: (id) => {
    const updatedProviders = get().settings.aiProviders.filter(p => p.id !== id);
    const activeId = get().settings.activeProviderId === id 
      ? (updatedProviders[0]?.id || null)
      : get().settings.activeProviderId;
    get().setSettings({ aiProviders: updatedProviders, activeProviderId: activeId });
  },
  
  updateAIProvider: (id, updates) => {
    const updatedProviders = get().settings.aiProviders.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    get().setSettings({ aiProviders: updatedProviders });
  },
  
  setActiveAIProvider: (id) => {
    get().setSettings({ activeProviderId: id });
  },
  
  // GitHub Account Management
  addGitHubAccount: (account) => {
    const newAccount: GitHubAccount = {
      ...account,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };
    const updatedAccounts = [...get().settings.githubAccounts, newAccount];
    // Set as default if it's the first one
    if (updatedAccounts.length === 1) {
      newAccount.isDefault = true;
    }
    get().setSettings({ githubAccounts: updatedAccounts });
  },
  
  removeGitHubAccount: (id) => {
    const updatedAccounts = get().settings.githubAccounts.filter(a => a.id !== id);
    // If removed account was default, set first one as default
    if (updatedAccounts.length > 0 && !updatedAccounts.some(a => a.isDefault)) {
      updatedAccounts[0].isDefault = true;
    }
    get().setSettings({ githubAccounts: updatedAccounts });
  },
  
  updateGitHubAccount: (id, updates) => {
    const updatedAccounts = get().settings.githubAccounts.map(a =>
      a.id === id ? { ...a, ...updates } : a
    );
    get().setSettings({ githubAccounts: updatedAccounts });
  },
  
  setDefaultGitHubAccount: (id) => {
    const updatedAccounts = get().settings.githubAccounts.map(a => ({
      ...a,
      isDefault: a.id === id,
    }));
    get().setSettings({ githubAccounts: updatedAccounts });
  },
  
  // Expo Account Management
  addExpoAccount: (account) => {
    const newAccount: ExpoAccount = {
      ...account,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };
    const updatedAccounts = [...get().settings.expoAccounts, newAccount];
    if (updatedAccounts.length === 1) {
      newAccount.isDefault = true;
    }
    get().setSettings({ expoAccounts: updatedAccounts });
  },
  
  removeExpoAccount: (id) => {
    const updatedAccounts = get().settings.expoAccounts.filter(a => a.id !== id);
    if (updatedAccounts.length > 0 && !updatedAccounts.some(a => a.isDefault)) {
      updatedAccounts[0].isDefault = true;
    }
    get().setSettings({ expoAccounts: updatedAccounts });
  },
  
  updateExpoAccount: (id, updates) => {
    const updatedAccounts = get().settings.expoAccounts.map(a =>
      a.id === id ? { ...a, ...updates } : a
    );
    get().setSettings({ expoAccounts: updatedAccounts });
  },
  
  setDefaultExpoAccount: (id) => {
    const updatedAccounts = get().settings.expoAccounts.map(a => ({
      ...a,
      isDefault: a.id === id,
    }));
    get().setSettings({ expoAccounts: updatedAccounts });
  },
  
  // Build Tools Management
  addBuildTool: (tool) => {
    const newTool: BuildToolAccount = {
      ...tool,
      id: generateId(),
      addedAt: new Date().toISOString(),
    };
    const updatedTools = [...get().settings.buildTools, newTool];
    get().setSettings({ buildTools: updatedTools });
  },
  
  removeBuildTool: (id) => {
    const updatedTools = get().settings.buildTools.filter(t => t.id !== id);
    get().setSettings({ buildTools: updatedTools });
  },
  
  updateBuildTool: (id, updates) => {
    const updatedTools = get().settings.buildTools.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    get().setSettings({ buildTools: updatedTools });
  },
  
  // Chat
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    }]
  })),
  clearMessages: () => set({ messages: [] }),
  
  // Projects
  projects: [],
  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  
  // Pending files
  pendingFiles: null,
  setPendingFiles: (files) => set({ pendingFiles: files }),
  
  // GitHub
  linkedRepo: null,
  setLinkedRepo: (repo) => set({ linkedRepo: repo }),
  
  // UI State
  isRecording: false,
  setIsRecording: (value) => set({ isRecording: value }),
  isProcessing: false,
  setIsProcessing: (value) => set({ isProcessing: value }),
}));

// Load settings on app start
export const loadSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem('appfactory_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      useStore.getState().setSettings(parsed);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
};

// Helper to get active AI provider
export const getActiveAIProvider = (): APIProvider | null => {
  const { settings } = useStore.getState();
  if (settings.activeProviderId) {
    return settings.aiProviders.find(p => p.id === settings.activeProviderId) || null;
  }
  return settings.aiProviders.find(p => p.isActive) || settings.aiProviders[0] || null;
};

// Helper to get default GitHub account
export const getDefaultGitHubAccount = (): GitHubAccount | null => {
  const { settings } = useStore.getState();
  return settings.githubAccounts.find(a => a.isDefault) || settings.githubAccounts[0] || null;
};

// Helper to get default Expo account
export const getDefaultExpoAccount = (): ExpoAccount | null => {
  const { settings } = useStore.getState();
  return settings.expoAccounts.find(a => a.isDefault) || settings.expoAccounts[0] || null;
};
