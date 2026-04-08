/**
 * AGENTIC ENGINE - Emergent-Level Autonomous System
 * 
 * Core capabilities:
 * 1. Multi-file context management
 * 2. Self-healing build system
 * 3. GitHub autonomous operations
 * 4. Native module configuration
 */

import { getActiveAIProvider } from '../store/useStore';

// ============================================
// TYPES
// ============================================

export interface ProjectFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'json' | 'yml' | 'xml' | 'java' | 'kt';
}

export interface ProjectContext {
  name: string;
  description: string;
  files: Map<string, ProjectFile>;
  dependencies: string[];
  nativeModules: string[];
  androidPermissions: string[];
  buildStatus: 'idle' | 'building' | 'success' | 'failed';
  lastError?: string;
}

export interface BuildLog {
  jobId: number;
  runId: number;
  status: string;
  conclusion: string | null;
  logs: string;
  failedStep?: string;
}

export interface AgentAction {
  type: 'create_file' | 'update_file' | 'delete_file' | 'push_github' | 'fix_error' | 'add_native_module';
  payload: any;
}

// ============================================
// FILE SYSTEM MANAGER - Multi-File Context
// ============================================

export class FileSystemManager {
  private context: ProjectContext;

  constructor(name: string, description: string) {
    this.context = {
      name,
      description,
      files: new Map(),
      dependencies: [],
      nativeModules: [],
      androidPermissions: [],
      buildStatus: 'idle',
    };
  }

  // Add or update a file
  setFile(path: string, content: string): void {
    const type = this.getFileType(path);
    this.context.files.set(path, { path, content, type });
  }

  // Get file content
  getFile(path: string): ProjectFile | undefined {
    return this.context.files.get(path);
  }

  // Get all files
  getAllFiles(): Record<string, string> {
    const files: Record<string, string> = {};
    this.context.files.forEach((file, path) => {
      files[path] = file.content;
    });
    return files;
  }

  // Get file tree for context
  getFileTree(): string[] {
    return Array.from(this.context.files.keys()).sort();
  }

  // Add dependency
  addDependency(pkg: string): void {
    if (!this.context.dependencies.includes(pkg)) {
      this.context.dependencies.push(pkg);
    }
  }

  // Add native module
  addNativeModule(module: string): void {
    if (!this.context.nativeModules.includes(module)) {
      this.context.nativeModules.push(module);
    }
  }

  // Add Android permission
  addPermission(permission: string): void {
    if (!this.context.androidPermissions.includes(permission)) {
      this.context.androidPermissions.push(permission);
    }
  }

  // Get context summary for AI
  getContextSummary(): string {
    return JSON.stringify({
      name: this.context.name,
      description: this.context.description,
      fileTree: this.getFileTree(),
      dependencies: this.context.dependencies,
      nativeModules: this.context.nativeModules,
      androidPermissions: this.context.androidPermissions,
    }, null, 2);
  }

  private getFileType(path: string): ProjectFile['type'] {
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.ts')) return 'ts';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yml';
    if (path.endsWith('.xml')) return 'xml';
    if (path.endsWith('.java')) return 'java';
    if (path.endsWith('.kt')) return 'kt';
    return 'ts';
  }

  getContext(): ProjectContext {
    return this.context;
  }

  setBuildStatus(status: ProjectContext['buildStatus'], error?: string): void {
    this.context.buildStatus = status;
    this.context.lastError = error;
  }
}

// ============================================
// GITHUB AUTONOMOUS SERVICE
// ============================================

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
      const error = await res.json();
      throw new Error(error.message || `GitHub API Error: ${res.status}`);
    }
    
    return res.json();
  }

  // Create new repository
  async createRepository(name: string, description: string, isPrivate = false): Promise<string> {
    const repo = await this.request('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      }),
    });
    return repo.full_name;
  }

  // Push multiple files at once (Tree API)
  async pushFiles(
    repoFullName: string,
    files: Record<string, string>,
    commitMessage: string,
    branch = 'main'
  ): Promise<void> {
    // Get current commit SHA
    const ref = await this.request(`/repos/${repoFullName}/git/ref/heads/${branch}`);
    const baseSha = ref.object.sha;
    
    // Get base tree
    const baseCommit = await this.request(`/repos/${repoFullName}/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha;

    // Create blobs for all files
    const treeItems = [];
    for (const [path, content] of Object.entries(files)) {
      const blob = await this.request(`/repos/${repoFullName}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: content,
          encoding: 'utf-8',
        }),
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
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
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

    // Update reference
    await this.request(`/repos/${repoFullName}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: true,
      }),
    });
  }

  // Get workflow runs
  async getWorkflowRuns(repoFullName: string): Promise<any[]> {
    const data = await this.request(`/repos/${repoFullName}/actions/runs?per_page=5`);
    return data.workflow_runs || [];
  }

  // Get workflow run logs
  async getWorkflowLogs(repoFullName: string, runId: number): Promise<BuildLog> {
    // Get run details
    const run = await this.request(`/repos/${repoFullName}/actions/runs/${runId}`);
    
    // Get jobs
    const jobsData = await this.request(`/repos/${repoFullName}/actions/runs/${runId}/jobs`);
    const jobs = jobsData.jobs || [];
    
    let logs = '';
    let failedStep = '';
    
    for (const job of jobs) {
      if (job.conclusion === 'failure') {
        logs += `\n=== JOB: ${job.name} (FAILED) ===\n`;
        for (const step of job.steps || []) {
          if (step.conclusion === 'failure') {
            failedStep = step.name;
            logs += `\n❌ FAILED STEP: ${step.name}\n`;
          }
        }
      }
    }

    // Try to get detailed logs
    try {
      const logsRes = await fetch(
        `${this.baseUrl}/repos/${repoFullName}/actions/runs/${runId}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      if (logsRes.ok) {
        logs += await logsRes.text();
      }
    } catch (e) {
      // Logs might not be available
    }

    return {
      jobId: jobs[0]?.id || 0,
      runId,
      status: run.status,
      conclusion: run.conclusion,
      logs,
      failedStep,
    };
  }

  // Trigger workflow
  async triggerWorkflow(repoFullName: string, workflowFile = 'build.yml', branch = 'main'): Promise<void> {
    await this.request(`/repos/${repoFullName}/actions/workflows/${workflowFile}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: branch }),
    });
  }

  // Check if build is complete
  async waitForBuild(repoFullName: string, timeoutMs = 600000): Promise<BuildLog> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const runs = await this.getWorkflowRuns(repoFullName);
      const latestRun = runs[0];
      
      if (latestRun && latestRun.status === 'completed') {
        return this.getWorkflowLogs(repoFullName, latestRun.id);
      }
      
      // Wait 10 seconds before checking again
      await new Promise(r => setTimeout(r, 10000));
    }
    
    throw new Error('Build timeout');
  }
}

// ============================================
// NATIVE MODULE TEMPLATES
// ============================================

export const NativeModuleTemplates = {
  // System Overlay (Floating Window)
  systemOverlay: {
    androidManifest: `
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    <uses-permission android:name="android.permission.ACTION_MANAGE_OVERLAY_PERMISSION"/>
    `,
    javaService: `
package com.appfactory.overlay;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

public class OverlayService extends Service {
    private WindowManager windowManager;
    private View overlayView;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 100;

        overlayView = new TextView(this);
        ((TextView) overlayView).setText("Floating Scoreboard");
        ((TextView) overlayView).setTextSize(20);
        ((TextView) overlayView).setBackgroundColor(0xFF000000);
        ((TextView) overlayView).setTextColor(0xFFFFFFFF);
        ((TextView) overlayView).setPadding(20, 20, 20, 20);

        windowManager.addView(overlayView, params);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) {
            windowManager.removeView(overlayView);
        }
    }
}`,
    reactNativeModule: `
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

export const OverlayManager = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      const granted = await PermissionsAndroid.request(
        'android.permission.SYSTEM_ALERT_WINDOW'
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  },
  
  startOverlay(text: string): void {
    NativeModules.OverlayModule?.startOverlay(text);
  },
  
  stopOverlay(): void {
    NativeModules.OverlayModule?.stopOverlay();
  },
  
  updateOverlay(text: string): void {
    NativeModules.OverlayModule?.updateOverlay(text);
  },
};`,
  },

  // Background Service
  backgroundService: {
    androidManifest: `
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    
    <service
        android:name=".BackgroundTaskService"
        android:enabled="true"
        android:exported="false"
        android:foregroundServiceType="dataSync"/>
    `,
  },

  // Camera & Media
  cameraMedia: {
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    expoConfig: {
      plugins: [
        ['expo-image-picker', {
          photosPermission: 'Allow access to photos',
          cameraPermission: 'Allow access to camera',
        }],
        ['expo-camera', {
          cameraPermission: 'Allow camera access',
        }],
      ],
    },
  },

  // Push Notifications
  notifications: {
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
    ],
    expoConfig: {
      plugins: [
        ['expo-notifications', {
          icon: './assets/notification-icon.png',
          color: '#A78BFA',
        }],
      ],
    },
  },
};

// ============================================
// AGENTIC ENGINE - Main Controller
// ============================================

export class AgenticEngine {
  private fileManager: FileSystemManager;
  private githubService: GitHubAutonomousService | null = null;
  private repoFullName: string | null = null;
  private maxRetries = 3;
  private retryCount = 0;

  constructor(projectName: string, projectDescription: string) {
    this.fileManager = new FileSystemManager(projectName, projectDescription);
  }

  // Initialize GitHub connection
  connectGitHub(token: string, username: string): void {
    this.githubService = new GitHubAutonomousService(token, username);
  }

  // Get file manager
  getFileManager(): FileSystemManager {
    return this.fileManager;
  }

  // Load AI-generated files into context
  loadGeneratedFiles(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.fileManager.setFile(path, content);
    }
  }

  // Create repository and push all files
  async createAndPush(repoName: string): Promise<string> {
    if (!this.githubService) {
      throw new Error('GitHub not connected');
    }

    // Create repo
    this.repoFullName = await this.githubService.createRepository(
      repoName,
      this.fileManager.getContext().description
    );

    // Wait for repo initialization
    await new Promise(r => setTimeout(r, 3000));

    // Push all files
    await this.githubService.pushFiles(
      this.repoFullName,
      this.fileManager.getAllFiles(),
      'Initial commit: App Factory generated project'
    );

    return this.repoFullName;
  }

  // Push updates
  async pushUpdate(commitMessage: string): Promise<void> {
    if (!this.githubService || !this.repoFullName) {
      throw new Error('Repository not initialized');
    }

    await this.githubService.pushFiles(
      this.repoFullName,
      this.fileManager.getAllFiles(),
      commitMessage
    );
  }

  // AUTONOMOUS BUILD & SELF-HEAL LOOP
  async autonomousBuildLoop(
    onStatus: (status: string) => void,
    onComplete: (success: boolean, artifacts?: any) => void
  ): Promise<void> {
    if (!this.githubService || !this.repoFullName) {
      throw new Error('Repository not initialized');
    }

    this.retryCount = 0;
    this.fileManager.setBuildStatus('building');

    while (this.retryCount < this.maxRetries) {
      onStatus(`Build attempt ${this.retryCount + 1}/${this.maxRetries}...`);

      try {
        // Wait for build
        const buildLog = await this.githubService.waitForBuild(this.repoFullName);

        if (buildLog.conclusion === 'success') {
          this.fileManager.setBuildStatus('success');
          onStatus('Build successful!');
          onComplete(true);
          return;
        }

        // Build failed - attempt self-heal
        onStatus(`Build failed at: ${buildLog.failedStep}. Analyzing...`);
        
        const fixed = await this.selfHeal(buildLog.logs);
        
        if (fixed) {
          onStatus('Fix applied. Pushing update...');
          await this.pushUpdate(`Auto-fix: ${buildLog.failedStep}`);
          this.retryCount++;
        } else {
          throw new Error('Could not auto-fix the error');
        }

      } catch (e: any) {
        onStatus(`Error: ${e.message}`);
        this.retryCount++;
      }
    }

    this.fileManager.setBuildStatus('failed', 'Max retries exceeded');
    onComplete(false);
  }

  // Self-healing: Analyze error and fix
  private async selfHeal(errorLogs: string): Promise<boolean> {
    const provider = getActiveAIProvider();
    if (!provider) return false;

    try {
      const prompt = `You are debugging a React Native Expo build error.

ERROR LOGS:
\`\`\`
${errorLogs.slice(0, 4000)}
\`\`\`

CURRENT PROJECT FILES:
${this.fileManager.getContextSummary()}

Analyze the error and return ONLY the files that need to be fixed in this JSON format:
{
  "action": "fix_error",
  "analysis": "What caused the error",
  "files": {
    "path/to/file.tsx": "// Fixed complete file content"
  }
}`;

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
    } catch (e) {
      console.error('Self-heal error:', e);
      return false;
    }
  }

  // Add native module to project
  addNativeModule(moduleType: keyof typeof NativeModuleTemplates): void {
    const template = NativeModuleTemplates[moduleType];
    if (!template) return;

    this.fileManager.addNativeModule(moduleType);

    // Add permissions if defined
    if ('permissions' in template) {
      for (const perm of template.permissions) {
        this.fileManager.addPermission(perm);
      }
    }
  }

  // Get current project status
  getStatus(): ProjectContext {
    return this.fileManager.getContext();
  }
}

// Export singleton factory
export const createAgenticEngine = (name: string, description: string): AgenticEngine => {
  return new AgenticEngine(name, description);
};
