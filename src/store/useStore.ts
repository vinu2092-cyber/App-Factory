import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface APIProvider {
  id: string;
  name: string;
  type: 'gemini' | 'groq' | 'deepseek' | 'huggingface' | 'openrouter';
  apiKey: string;
  isActive: boolean;
  addedAt: string;
}

export interface GitHubAccount {
  id: string;
  username: string;
  token: string;
  isDefault: boolean;
  addedAt: string;
}

export interface ExpoAccount {
  id: string;
  username: string;
  password: string;
  accessToken?: string;
  isDefault: boolean;
  addedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string | any;
  image?: string;
  video?: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  repoName: string;
  status: 'idle' | 'building' | 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface AppSettings {
  geminiKeys: string[];
  githubToken: string;
  githubUsername: string;
  expoUsername: string;
  expoPassword: string;
  currentKeyIndex: number;
  aiProviders: APIProvider[];
  activeProviderId: string | null;
  githubAccounts: GitHubAccount[];
  expoAccounts: ExpoAccount[];
  autoCorrectMode: boolean;
  autoTestMode: boolean;
  screenshotAnalysis: boolean;
  highPerformanceMode: boolean;
  autoDebugMode: boolean;
  autonomousMode: boolean;
}

interface AppState {
  settings: AppSettings;
  messages: Message[];
  projects: Project[];
  pendingFiles: Record<string, string> | null;
  linkedRepo: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  
  // Actions
  setSettings: (settings: Partial<AppSettings>) => void;
  addAIProvider: (provider: Omit<APIProvider, 'id' | 'addedAt'>) => void;
  removeAIProvider: (id: string) => void;
  setActiveAIProvider: (id: string) => void;
  addGitHubAccount: (account: Omit<GitHubAccount, 'id' | 'addedAt'>) => void;
  removeGitHubAccount: (id: string) => void;
  setDefaultGitHubAccount: (id: string) => void;
  addExpoAccount: (account: Omit<ExpoAccount, 'id' | 'addedAt'>) => void;
  removeExpoAccount: (id: string) => void;
  setDefaultExpoAccount: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setPendingFiles: (files: Record<string, string> | null) => void;
  setLinkedRepo: (repo: string | null) => void;
  setIsRecording: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const defaultSettings: AppSettings = {
  geminiKeys: [''],
  githubToken: '',
  githubUsername: '',
  expoUsername: '',
  expoPassword: '',
  currentKeyIndex: 0,
  aiProviders: [],
  activeProviderId: null,
  githubAccounts: [],
  expoAccounts: [],
  autoCorrectMode: true,
  autoTestMode: true,
  screenshotAnalysis: true,
  highPerformanceMode: true,
  autoDebugMode: true,
  autonomousMode: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      messages: [],
      projects: [],
      pendingFiles: null,
      linkedRepo: null,
      isRecording: false,
      isProcessing: false,

      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      addAIProvider: (provider) => {
        const newProvider: APIProvider = {
          ...provider,
          id: generateId(),
          addedAt: new Date().toISOString(),
        };
        set((state) => ({
          settings: {
            ...state.settings,
            aiProviders: [...state.settings.aiProviders, newProvider],
            activeProviderId: state.settings.activeProviderId || newProvider.id,
          },
        }));
      },

      removeAIProvider: (id) => {
        set((state) => {
          const updatedProviders = state.settings.aiProviders.filter((p) => p.id !== id);
          return {
            settings: {
              ...state.settings,
              aiProviders: updatedProviders,
              activeProviderId:
                state.settings.activeProviderId === id
                  ? updatedProviders[0]?.id || null
                  : state.settings.activeProviderId,
            },
          };
        });
      },

      setActiveAIProvider: (id) => {
        set((state) => ({
          settings: { ...state.settings, activeProviderId: id },
        }));
      },

      addGitHubAccount: (account) => {
        const newAccount: GitHubAccount = {
          ...account,
          id: generateId(),
          addedAt: new Date().toISOString(),
          isDefault: get().settings.githubAccounts.length === 0,
        };
        set((state) => ({
          settings: {
            ...state.settings,
            githubAccounts: [...state.settings.githubAccounts, newAccount],
          },
        }));
      },

      removeGitHubAccount: (id) => {
        set((state) => {
          const updated = state.settings.githubAccounts.filter((a) => a.id !== id);
          if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
            updated[0].isDefault = true;
          }
          return {
            settings: { ...state.settings, githubAccounts: updated },
          };
        });
      },

      setDefaultGitHubAccount: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            githubAccounts: state.settings.githubAccounts.map((a) => ({
              ...a,
              isDefault: a.id === id,
            })),
          },
        }));
      },

      addExpoAccount: (account) => {
        const newAccount: ExpoAccount = {
          ...account,
          id: generateId(),
          addedAt: new Date().toISOString(),
          isDefault: get().settings.expoAccounts.length === 0,
        };
        set((state) => ({
          settings: {
            ...state.settings,
            expoAccounts: [...state.settings.expoAccounts, newAccount],
          },
        }));
      },

      removeExpoAccount: (id) => {
        set((state) => {
          const updated = state.settings.expoAccounts.filter((a) => a.id !== id);
          if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
            updated[0].isDefault = true;
          }
          return {
            settings: { ...state.settings, expoAccounts: updated },
          };
        });
      },

      setDefaultExpoAccount: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            expoAccounts: state.settings.expoAccounts.map((a) => ({
              ...a,
              isDefault: a.id === id,
            })),
          },
        }));
      },

      addMessage: (message) => {
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date().toISOString(),
            },
          ],
        }));
      },

      clearMessages: () => set({ messages: [] }),
      setPendingFiles: (files) => set({ pendingFiles: files }),
      setLinkedRepo: (repo) => set({ linkedRepo: repo }),
      setIsRecording: (value) => set({ isRecording: value }),
      setIsProcessing: (value) => set({ isProcessing: value }),
    }),
    {
      name: 'app-factory-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        projects: state.projects,
      }),
    }
  )
);

// Helper functions
export const getActiveAIProvider = (): APIProvider | null => {
  const { settings } = useStore.getState();
  if (settings.activeProviderId) {
    return settings.aiProviders.find((p) => p.id === settings.activeProviderId) || null;
  }
  return settings.aiProviders[0] || null;
};

export const getDefaultGitHubAccount = (): GitHubAccount | null => {
  const { settings } = useStore.getState();
  return settings.githubAccounts.find((a) => a.isDefault) || settings.githubAccounts[0] || null;
};

export const getDefaultExpoAccount = (): ExpoAccount | null => {
  const { settings } = useStore.getState();
  return settings.expoAccounts.find((a) => a.isDefault) || settings.expoAccounts[0] || null;
};
