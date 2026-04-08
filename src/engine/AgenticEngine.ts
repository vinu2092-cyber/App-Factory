/**
 * AGENTIC ENGINE - Emergent-Level Autonomous System
 * 
 * Features:
 * 1. Automated CI/CD Feedback Loop - Auto fetch logs, analyze, self-heal, re-push
 * 2. Multi-File Context Management - Full project directory mapping
 * 3. Native Module Integration - System Overlays, Background Services
 * 4. GitHub API Autonomous Operations - Create repos, push, trigger workflows
 */

import { getActiveAIProvider, getDefaultGitHubAccount } from '../store/useStore';

// ===========================================
// TYPES
// ===========================================

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProjectContext {
  name: string;
  description: string;
  files: Map<string, string>;
  dependencies: string[];
  nativeModules: string[];
  buildStatus: 'idle' | 'building' | 'success' | 'failed';
  lastError?: string;
  retryCount: number;
}

export interface BuildResult {
  success: boolean;
  runId: number;
  logs: string;
  failedStep?: string;
  artifactUrl?: string;
}

// ===========================================
// FILE SYSTEM MANAGER - Multi-File Context
// ===========================================

export class FileSystemManager {
  private files: Map<string, string> = new Map();
  private dependencies: string[] = [];
  private nativeModules: string[] = [];

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  getAllFiles(): Record<string, string> {
    const result: Record<string, string> = {};
    this.files.forEach((content, path) => {
      result[path] = content;
    });
    return result;
  }

  getFileTree(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  addDependency(pkg: string): void {
    if (!this.dependencies.includes(pkg)) {
      this.dependencies.push(pkg);
    }
  }

  addNativeModule(module: string): void {
    if (!this.nativeModules.includes(module)) {
      this.nativeModules.push(module);
    }
  }

  getContextSummary(): string {
    return JSON.stringify({
      fileCount: this.files.size,
      fileTree: this.getFileTree(),
      dependencies: this.dependencies,
      nativeModules: this.nativeModules,
    }, null, 2);
  }

  clear(): void {
    this.files.clear();
    this.dependencies = [];
    this.nativeModules = [];
  }
}

// ===========================================
// GITHUB AUTONOMOUS SERVICE
// ===========================================

export class GitHubAutonomousService {
  private token: string;
  private username: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string, username: string) {
    this.token = token;
    this.username = username;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API Error: ${res.status}`);
    }
    
    return res.json();
  }

  // Create new repository
  async createRepository(name: string, description: string): Promise<string> {
    try {
      const repo = await this.request('/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          private: false,
          auto_init: true,
        }),
      });
      return repo.full_name;
    } catch (e: any) {
      // Repo might exist
      if (e.message?.includes('already exists')) {
        return `${this.username}/${name}`;
      }
      throw e;
    }
  }

  // Push multiple files using Git Tree API (efficient batch push)
  async pushFiles(repoFullName: string, files: Record<string, string>, commitMessage: string): Promise<void> {
    // Get current commit
    const ref = await this.request(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = ref.object.sha;
    
    const baseCommit = await this.request(`/repos/${repoFullName}/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha;

    // Create blobs for all files
    const treeItems = [];
    for (const [path, content] of Object.entries(files)) {
      const blob = await this.request(`/repos/${repoFullName}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      treeItems.push({
        path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
    }

    // Create new tree
    const newTree = await this.request(`/repos/${repoFullName}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });

    // Create commit
    const newCommit = await this.request(`/repos/${repoFullName}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });

    // Update ref
    await this.request(`/repos/${repoFullName}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });
  }

  // Get workflow runs
  async getWorkflowRuns(repoFullName: string): Promise<any[]> {
    const data = await this.request(`/repos/${repoFullName}/actions/runs?per_page=10`);
    return data.workflow_runs || [];
  }

  // Get build logs for error analysis
  async getBuildLogs(repoFullName: string, runId: number): Promise<{ logs: string; failedStep: string }> {
    const jobsData = await this.request(`/repos/${repoFullName}/actions/runs/${runId}/jobs`);
    const jobs = jobsData.jobs || [];
    
    let logs = '';
    let failedStep = '';
    
    for (const job of jobs) {
      if (job.conclusion === 'failure') {
        logs += `\n=== JOB FAILED: ${job.name} ===\n`;
        for (const step of job.steps || []) {
          if (step.conclusion === 'failure') {
            failedStep = step.name;
            logs += `\n❌ STEP FAILED: ${step.name}\n`;
          }
        }
      }
    }

    return { logs, failedStep };
  }

  // Wait for build completion
  async waitForBuild(repoFullName: string, maxWaitMs = 600000): Promise<BuildResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 15000)); // Check every 15s
      
      const runs = await this.getWorkflowRuns(repoFullName);
      const latestRun = runs[0];
      
      if (latestRun?.status === 'completed') {
        const { logs, failedStep } = await this.getBuildLogs(repoFullName, latestRun.id);
        
        return {
          success: latestRun.conclusion === 'success',
          runId: latestRun.id,
          logs,
          failedStep,
          artifactUrl: latestRun.conclusion === 'success' 
            ? `https://github.com/${repoFullName}/actions/runs/${latestRun.id}`
            : undefined,
        };
      }
    }
    
    throw new Error('Build timeout - exceeded 10 minutes');
  }
}

// ===========================================
// NATIVE MODULE TEMPLATES
// ===========================================

export const NativeModuleTemplates = {
  // System Overlay for Floating Windows
  systemOverlay: {
    permissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    appJsonPlugin: null,
    code: `
// OverlayManager.ts
import { NativeModules, Platform, Linking, Alert } from 'react-native';

export const OverlayManager = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    Alert.alert(
      'Permission Required',
      'Please enable "Display over other apps" permission',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  },
};`,
  },

  // Camera & Image Picker
  camera: {
    permissions: ['android.permission.CAMERA'],
    appJsonPlugin: ['expo-image-picker', { photosPermission: 'Access photos', cameraPermission: 'Access camera' }],
    code: `
// CameraService.ts
import * as ImagePicker from 'expo-image-picker';

export const CameraService = {
  async pickImage(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    return result.canceled ? null : result.assets[0].uri;
  },
  
  async takePhoto(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
    
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    return result.canceled ? null : result.assets[0].uri;
  },
};`,
  },

  // Push Notifications
  notifications: {
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    appJsonPlugin: ['expo-notifications', { icon: './assets/notification.png', color: '#A78BFA' }],
    code: `
// NotificationService.ts
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },
  
  async scheduleNotification(title: string, body: string, seconds = 1): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { seconds },
    });
  },
};`,
  },

  // Background Tasks
  backgroundTask: {
    permissions: [],
    appJsonPlugin: null,
    code: `
// BackgroundService.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const TASK_NAME = 'BACKGROUND_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Your background logic here
    console.log('Background task executed');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const BackgroundService = {
  async register(): Promise<void> {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  },
};`,
  },
};

// ===========================================
// AGENTIC ENGINE - Main Controller
// ===========================================

export class AgenticEngine {
  private fileManager: FileSystemManager;
  private githubService: GitHubAutonomousService | null = null;
  private repoFullName: string | null = null;
  private projectName: string;
  private projectDescription: string;
  private maxRetries = 3;

  constructor(name: string, description: string) {
    this.projectName = name;
    this.projectDescription = description;
    this.fileManager = new FileSystemManager();
  }

  // Connect GitHub account
  connectGitHub(token: string, username: string): void {
    this.githubService = new GitHubAutonomousService(token, username);
  }

  // Load AI-generated files
  loadFiles(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.fileManager.setFile(path, content);
    }
  }

  // Get all files
  getFiles(): Record<string, string> {
    return this.fileManager.getAllFiles();
  }

  // Get file tree
  getFileTree(): string[] {
    return this.fileManager.getFileTree();
  }

  // Create repo and push
  async createAndPush(repoName: string): Promise<string> {
    if (!this.githubService) throw new Error('GitHub not connected');

    this.repoFullName = await this.githubService.createRepository(
      repoName,
      this.projectDescription
    );

    await new Promise(r => setTimeout(r, 3000)); // Wait for repo init

    await this.githubService.pushFiles(
      this.repoFullName,
      this.fileManager.getAllFiles(),
      'Initial commit: App Factory generated project'
    );

    return this.repoFullName;
  }

  // Push update
  async pushUpdate(message: string): Promise<void> {
    if (!this.githubService || !this.repoFullName) throw new Error('Not initialized');
    await this.githubService.pushFiles(this.repoFullName, this.fileManager.getAllFiles(), message);
  }

  // AUTONOMOUS BUILD WITH SELF-HEALING
  async autonomousBuild(
    onStatus: (status: string) => void,
    onComplete: (result: BuildResult) => void
  ): Promise<void> {
    if (!this.githubService || !this.repoFullName) throw new Error('Not initialized');

    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      onStatus(`Build attempt ${retryCount + 1}/${this.maxRetries}...`);

      try {
        const result = await this.githubService.waitForBuild(this.repoFullName);

        if (result.success) {
          onStatus('BUILD SUCCESS!');
          onComplete(result);
          return;
        }

        // Build failed - try self-healing
        onStatus(`Build failed: ${result.failedStep}. Analyzing...`);
        
        const fixed = await this.selfHeal(result.logs);
        
        if (fixed) {
          onStatus('Fix applied. Pushing update...');
          await this.pushUpdate(`Auto-fix: ${result.failedStep}`);
          retryCount++;
        } else {
          onStatus('Could not auto-fix');
          onComplete(result);
          return;
        }
      } catch (e: any) {
        onStatus(`Error: ${e.message}`);
        retryCount++;
      }
    }

    onComplete({ success: false, runId: 0, logs: 'Max retries exceeded' });
  }

  // Self-healing: AI analyzes error and fixes
  private async selfHeal(errorLogs: string): Promise<boolean> {
    const provider = getActiveAIProvider();
    if (!provider) return false;

    try {
      const prompt = `You are fixing a React Native build error.

ERROR LOGS:
\`\`\`
${errorLogs.slice(0, 3000)}
\`\`\`

CURRENT FILES:
${this.fileManager.getContextSummary()}

Return ONLY the fixed files in JSON format:
{"action":"fix_error","files":{"path/file.tsx":"// complete fixed content"}}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${provider.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
          }),
        }
      );

      if (!res.ok) return false;

      const data = await res.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return false;

      const fix = JSON.parse(jsonMatch[0]);
      
      if (fix.files) {
        for (const [path, content] of Object.entries(fix.files)) {
          this.fileManager.setFile(path, content as string);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Add native module
  addNativeModule(moduleType: keyof typeof NativeModuleTemplates): void {
    const template = NativeModuleTemplates[moduleType];
    if (!template) return;
    
    this.fileManager.addNativeModule(moduleType);
    
    // Add the code file
    this.fileManager.setFile(`src/services/${moduleType}.ts`, template.code);
  }

  // Get status
  getStatus(): { name: string; fileCount: number; repo: string | null } {
    return {
      name: this.projectName,
      fileCount: this.fileManager.getFileTree().length,
      repo: this.repoFullName,
    };
  }
}

// Factory function
export const createAgenticEngine = (name: string, description: string): AgenticEngine => {
  return new AgenticEngine(name, description);
};
