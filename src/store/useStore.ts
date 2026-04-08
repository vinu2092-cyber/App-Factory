import { create } from 'zustand';

export interface APIProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
}

export interface GitHubAccount {
  id: string;
  username: string;
  token: string;
  isDefault: boolean;
}

export interface ExpoAccount {
  id: string;
  username: string;
  password: string;
  accessToken?: string;
  isDefault: boolean;
}

export interface BuildTool {
  id: string;
  name: string;
  type: string;
  credentials: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface AppState {
  // AI Providers (Gemini, Groq, DeepSeek, HuggingFace, OpenRouter)
  aiProviders: APIProvider[];
  activeProviderId: string | null;
  addAIProvider: (provider: Omit<APIProvider, 'id'>) => void;
  removeAIProvider: (id: string) => void;
  setActiveAIProvider: (id: string) => void;
  
  // GitHub Accounts
  githubAccounts: GitHubAccount[];
  addGitHubAccount: (account: Omit<GitHubAccount, 'id'>) => void;
  removeGitHubAccount: (id: string) => void;
  setDefaultGitHubAccount: (id: string) => void;
  
  // Expo Accounts
  expoAccounts: ExpoAccount[];
  addExpoAccount: (account: Omit<ExpoAccount, 'id'>) => void;
  removeExpoAccount: (id: string) => void;
  setDefaultExpoAccount: (id: string) => void;
  
  // Build Tools (Firebase, Play Store, etc.)
  buildTools: BuildTool[];
  addBuildTool: (tool: Omit<BuildTool, 'id'>) => void;
  removeBuildTool: (id: string) => void;
  
  // Chat Messages
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  
  // Project State
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  linkedRepo: string | null;
  setLinkedRepo: (repo: string | null) => void;
  pendingFiles: Record<string, string> | null;
  setPendingFiles: (files: Record<string, string> | null) => void;
  
  // AI Agent Settings
  autonomousMode: boolean;
  autoTestMode: boolean;
  autoDebugMode: boolean;
  screenshotAnalysis: boolean;
  selfHealingEnabled: boolean;
  setSettings: (s: Partial<{
    autonomousMode: boolean;
    autoTestMode: boolean;
    autoDebugMode: boolean;
    screenshotAnalysis: boolean;
    selfHealingEnabled: boolean;
  }>) => void;
}

const genId = () => Math.random().toString(36).substr(2, 9);

export const useStore = create<AppState>((set, get) => ({
  // AI Providers
  aiProviders: [],
  activeProviderId: null,
  addAIProvider: (provider) => {
    const newProvider = { ...provider, id: genId() };
    set((s) => ({
      aiProviders: [...s.aiProviders, newProvider],
      activeProviderId: s.activeProviderId || newProvider.id,
    }));
  },
  removeAIProvider: (id) => {
    set((s) => {
      const updated = s.aiProviders.filter((p) => p.id !== id);
      return {
        aiProviders: updated,
        activeProviderId: s.activeProviderId === id ? (updated[0]?.id || null) : s.activeProviderId,
      };
    });
  },
  setActiveAIProvider: (id) => set({ activeProviderId: id }),
  
  // GitHub Accounts
  githubAccounts: [],
  addGitHubAccount: (account) => {
    const isFirst = get().githubAccounts.length === 0;
    set((s) => ({
      githubAccounts: [...s.githubAccounts, { ...account, id: genId(), isDefault: isFirst }],
    }));
  },
  removeGitHubAccount: (id) => {
    set((s) => {
      const updated = s.githubAccounts.filter((a) => a.id !== id);
      if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
        updated[0].isDefault = true;
      }
      return { githubAccounts: updated };
    });
  },
  setDefaultGitHubAccount: (id) => {
    set((s) => ({
      githubAccounts: s.githubAccounts.map((a) => ({ ...a, isDefault: a.id === id })),
    }));
  },
  
  // Expo Accounts
  expoAccounts: [],
  addExpoAccount: (account) => {
    const isFirst = get().expoAccounts.length === 0;
    set((s) => ({
      expoAccounts: [...s.expoAccounts, { ...account, id: genId(), isDefault: isFirst }],
    }));
  },
  removeExpoAccount: (id) => {
    set((s) => {
      const updated = s.expoAccounts.filter((a) => a.id !== id);
      if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
        updated[0].isDefault = true;
      }
      return { expoAccounts: updated };
    });
  },
  setDefaultExpoAccount: (id) => {
    set((s) => ({
      expoAccounts: s.expoAccounts.map((a) => ({ ...a, isDefault: a.id === id })),
    }));
  },
  
  // Build Tools
  buildTools: [],
  addBuildTool: (tool) => {
    set((s) => ({
      buildTools: [...s.buildTools, { ...tool, id: genId() }],
    }));
  },
  removeBuildTool: (id) => {
    set((s) => ({
      buildTools: s.buildTools.filter((t) => t.id !== id),
    }));
  },
  
  // Chat
  messages: [],
  addMessage: (msg) => {
    set((s) => ({
      messages: [...s.messages, { ...msg, id: genId(), timestamp: new Date().toISOString() }],
    }));
  },
  clearMessages: () => set({ messages: [] }),
  
  // Project
  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
  linkedRepo: null,
  setLinkedRepo: (repo) => set({ linkedRepo: repo }),
  pendingFiles: null,
  setPendingFiles: (files) => set({ pendingFiles: files }),
  
  // AI Agent Settings
  autonomousMode: true,
  autoTestMode: true,
  autoDebugMode: true,
  screenshotAnalysis: true,
  selfHealingEnabled: true,
  setSettings: (s) => set(s),
}));

// Helper Functions
export const getActiveAIProvider = (): APIProvider | null => {
  const state = useStore.getState();
  if (state.activeProviderId) {
    return state.aiProviders.find((p) => p.id === state.activeProviderId) || null;
  }
  return state.aiProviders[0] || null;
};

export const getDefaultGitHubAccount = (): GitHubAccount | null => {
  const state = useStore.getState();
  return state.githubAccounts.find((a) => a.isDefault) || state.githubAccounts[0] || null;
};

export const getDefaultExpoAccount = (): ExpoAccount | null => {
  const state = useStore.getState();
  return state.expoAccounts.find((a) => a.isDefault) || state.expoAccounts[0] || null;
};
