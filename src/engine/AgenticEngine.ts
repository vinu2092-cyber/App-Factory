/**
 * AGENTIC ENGINE v2 - Enhanced Autonomous System
 * 
 * Features:
 * 1. CI/CD Feedback Loop - Auto fetch logs, analyze, self-heal, re-push
 * 2. Multi-File Context Management - Full project directory mapping
 * 3. Native Module Integration - System Overlays, Foreground Services
 * 4. GitHub Autonomous Operations - Create repos, push, trigger workflows
 * 5. Expo Testing - Validate before build, test on Expo Go
 */

import { getActiveAIProvider, getDefaultGitHubAccount, getDefaultExpoAccount } from '../store/useStore';
import ExpoTestingService, { ExpoTestResult, ExpoCliCommands } from '../services/ExpoTestingService';
import NativeModuleTemplates from '../native/NativeModuleTemplates';

// Base64 decode function (React Native compatible)
const decodeBase64 = (str: string): string => {
  // Remove newlines
  const cleanStr = str.replace(/\n/g, '');
  // Use atob for decoding (available in React Native)
  try {
    return decodeURIComponent(
      atob(cleanStr)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    // Fallback for simple ASCII
    return atob(cleanStr);
  }
};

// ===========================================
// TYPES
// ===========================================

export interface ProjectFile {
  path: string;
  content: string;
}

export interface BuildResult {
  success: boolean;
  runId: number;
  logs: string;
  failedStep?: string;
  artifactUrl?: string;
}

export interface NativeModuleConfig {
  overlayEnabled: boolean;
  foregroundServiceEnabled: boolean;
  customModules: string[];
}

// ===========================================
// FILE SYSTEM MANAGER
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

  deleteFile(path: string): void {
    this.files.delete(path);
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

  getFileCount(): number {
    return this.files.size;
  }

  addDependency(pkg: string): void {
    if (!this.dependencies.includes(pkg)) {
      this.dependencies.push(pkg);
    }
  }

  getDependencies(): string[] {
    return this.dependencies;
  }

  addNativeModule(module: string): void {
    if (!this.nativeModules.includes(module)) {
      this.nativeModules.push(module);
    }
  }

  getNativeModules(): string[] {
    return this.nativeModules;
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

  async createRepository(name: string, description: string): Promise<string> {
    try {
      const repo = await this.request('/user/repos', {
        method: 'POST',
        body: JSON.stringify({ name, description, private: false, auto_init: true }),
      });
      return repo.full_name;
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        return `${this.username}/${name}`;
      }
      throw e;
    }
  }

  async pushFiles(repoFullName: string, files: Record<string, string>, commitMessage: string): Promise<void> {
    const ref = await this.request(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = ref.object.sha;
    
    const baseCommit = await this.request(`/repos/${repoFullName}/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha;

    const treeItems = [];
    for (const [path, content] of Object.entries(files)) {
      const blob = await this.request(`/repos/${repoFullName}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      treeItems.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await this.request(`/repos/${repoFullName}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });

    const newCommit = await this.request(`/repos/${repoFullName}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message: commitMessage, tree: newTree.sha, parents: [baseSha] }),
    });

    await this.request(`/repos/${repoFullName}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });
  }

  async getWorkflowRuns(repoFullName: string): Promise<any[]> {
    const data = await this.request(`/repos/${repoFullName}/actions/runs?per_page=10`);
    return data.workflow_runs || [];
  }

  /**
   * Get all files from a GitHub repo (import)
   */
  async getRepoFiles(repoFullName: string, branch = 'main'): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // Get tree recursively
    const tree = await this.request(`/repos/${repoFullName}/git/trees/${branch}?recursive=1`);
    
    for (const item of tree.tree || []) {
      if (item.type !== 'blob') continue;
      // Skip binary/large files
      if (item.size > 500000) continue;
      const ext = item.path.split('.').pop()?.toLowerCase() || '';
      const textExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'yml', 'yaml', 'xml', 'txt', 'css', 'html', 'java', 'kt', 'gradle'];
      if (!textExts.includes(ext)) continue;
      
      try {
        // Get file content
        const blob = await this.request(`/repos/${repoFullName}/git/blobs/${item.sha}`);
        if (blob.encoding === 'base64') {
          // Decode base64 (React Native compatible)
          const content = decodeBase64(blob.content);
          files[item.path] = content;
        }
      } catch {
        // Skip files that fail to fetch
      }
    }
    
    return files;
  }

  /**
   * List user repos (for import selection)
   */
  async listUserRepos(): Promise<Array<{ name: string; fullName: string; description: string; updatedAt: string }>> {
    const repos = await this.request('/user/repos?sort=updated&per_page=30');
    return repos.map((r: any) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Get repo info
   */
  async getRepoInfo(repoFullName: string): Promise<{ name: string; description: string; defaultBranch: string }> {
    const repo = await this.request(`/repos/${repoFullName}`);
    return {
      name: repo.name,
      description: repo.description || '',
      defaultBranch: repo.default_branch || 'main',
    };
  }

  async getBuildLogs(repoFullName: string, runId: number): Promise<{ logs: string; failedStep: string }> {
    const jobsData = await this.request(`/repos/${repoFullName}/actions/runs/${runId}/jobs`);
    const jobs = jobsData.jobs || [];
    
    let logs = '';
    let failedStep = '';
    
    for (const job of jobs) {
      logs += `\n=== JOB: ${job.name} (${job.conclusion || job.status}) ===\n`;
      
      for (const step of job.steps || []) {
        const icon = step.conclusion === 'success' ? 'OK' : step.conclusion === 'failure' ? 'FAIL' : 'SKIP';
        logs += `  [${icon}] ${step.name}\n`;
        
        if (step.conclusion === 'failure') {
          failedStep = step.name;
          logs += `  >>> FAILED STEP: ${step.name} <<<\n`;
        }
      }
    }

    // Try to fetch detailed logs for the failed job
    for (const job of jobs) {
      if (job.conclusion === 'failure') {
        try {
          const logRes = await fetch(`${this.baseUrl}/repos/${repoFullName}/actions/jobs/${job.id}/logs`, {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          
          if (logRes.ok) {
            const logText = await logRes.text();
            // Extract last 3000 chars of the actual error log
            const errorSection = logText.slice(-3000);
            logs += `\n=== DETAILED ERROR LOG (${job.name}) ===\n${errorSection}\n`;
          }
        } catch {
          // Log fetching failed, continue with basic info
        }
      }
    }

    return { logs, failedStep };
  }

  async waitForBuild(repoFullName: string, maxWaitMs = 600000): Promise<BuildResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 15000));
      
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
// AGENTIC ENGINE v2
// ===========================================

export class AgenticEngine {
  private fileManager: FileSystemManager;
  private githubService: GitHubAutonomousService | null = null;
  private expoService: ExpoTestingService | null = null;
  private repoFullName: string | null = null;
  private projectName: string;
  private projectDescription: string;
  private maxRetries = 3;
  private nativeConfig: NativeModuleConfig = {
    overlayEnabled: false,
    foregroundServiceEnabled: false,
    customModules: [],
  };

  constructor(name: string, description: string) {
    this.projectName = name;
    this.projectDescription = description;
    this.fileManager = new FileSystemManager();
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  connectGitHub(token: string, username: string): void {
    this.githubService = new GitHubAutonomousService(token, username);
  }

  initExpoTesting(): boolean {
    try {
      this.expoService = new ExpoTestingService();
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================
  // FILE MANAGEMENT
  // ===========================================

  loadFiles(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.fileManager.setFile(path, content);
    }
  }

  getFiles(): Record<string, string> {
    return this.fileManager.getAllFiles();
  }

  getFileTree(): string[] {
    return this.fileManager.getFileTree();
  }

  getFileCount(): number {
    return this.fileManager.getFileCount();
  }

  updateFile(path: string, content: string): void {
    this.fileManager.setFile(path, content);
  }

  // ===========================================
  // NATIVE MODULE INTEGRATION
  // ===========================================

  enableOverlay(): void {
    this.nativeConfig.overlayEnabled = true;
    this.fileManager.addNativeModule('overlay');
    
    // Add native files
    this.fileManager.setFile(
      'android/app/src/main/java/com/appfactory/overlay/OverlayService.java',
      NativeModuleTemplates.OverlayServiceJava
    );
    this.fileManager.setFile(
      'src/native/OverlayManager.ts',
      NativeModuleTemplates.NativeModuleBridgeTS
    );
  }

  enableForegroundService(): void {
    this.nativeConfig.foregroundServiceEnabled = true;
    this.fileManager.addNativeModule('foregroundService');
    
    // Add native files
    this.fileManager.setFile(
      'android/app/src/main/java/com/appfactory/services/AppFactoryForegroundService.java',
      NativeModuleTemplates.ForegroundServiceJava
    );
  }

  enableNativeModuleBridge(): void {
    this.fileManager.setFile(
      'android/app/src/main/java/com/appfactory/modules/AppFactoryModule.java',
      NativeModuleTemplates.NativeModuleBridgeJava
    );
    this.fileManager.setFile(
      'android/app/src/main/java/com/appfactory/modules/AppFactoryPackage.java',
      NativeModuleTemplates.NativeModulePackageJava
    );
  }

  getNativeConfig(): NativeModuleConfig {
    return this.nativeConfig;
  }

  // ===========================================
  // EXPO TESTING
  // ===========================================

  /**
   * Validate project before build
   */
  validateProject(): ExpoTestResult {
    if (!this.expoService) {
      this.initExpoTesting();
    }

    if (this.expoService) {
      return this.expoService.fullValidation(this.fileManager.getAllFiles());
    }

    // Fallback validation
    const errors: string[] = [];
    const files = this.fileManager.getAllFiles();
    
    if (!files['app.json']) errors.push('Missing app.json');
    if (!files['package.json']) errors.push('Missing package.json');
    
    return { success: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Get Expo CLI commands for testing
   */
  getExpoCommands(): {
    start: string;
    startAndroid: string;
    prebuild: string;
    easBuild: string;
  } {
    return {
      start: ExpoCliCommands.start(),
      startAndroid: ExpoCliCommands.start('android'),
      prebuild: ExpoCliCommands.prebuild('android', true),
      easBuild: ExpoCliCommands.easBuild('android', 'preview'),
    };
  }

  // ===========================================
  // GITHUB OPERATIONS
  // ===========================================

  async createAndPush(repoName: string): Promise<string> {
    if (!this.githubService) throw new Error('GitHub not connected');

    this.repoFullName = await this.githubService.createRepository(
      repoName,
      this.projectDescription
    );

    await new Promise(r => setTimeout(r, 3000));

    await this.githubService.pushFiles(
      this.repoFullName,
      this.fileManager.getAllFiles(),
      'Initial commit: App Factory generated project'
    );

    return this.repoFullName;
  }

  async pushUpdate(message: string): Promise<void> {
    if (!this.githubService || !this.repoFullName) throw new Error('Not initialized');
    await this.githubService.pushFiles(this.repoFullName, this.fileManager.getAllFiles(), message);
  }

  // ===========================================
  // AUTONOMOUS BUILD WITH SELF-HEALING
  // ===========================================

  async autonomousBuild(
    onStatus: (status: string) => void,
    onComplete: (result: BuildResult) => void
  ): Promise<void> {
    if (!this.githubService || !this.repoFullName) throw new Error('Not initialized');

    // Step 1: Validate project first
    onStatus('Validating project...');
    const validation = this.validateProject();
    
    if (!validation.success) {
      onStatus(`Validation failed: ${validation.errors.join(', ')}`);
      
      // Try to auto-fix validation errors
      const fixed = await this.autoFixValidationErrors(validation.errors);
      if (fixed) {
        onStatus('Auto-fixed validation errors. Pushing update...');
        await this.pushUpdate('Auto-fix: Validation errors');
      } else {
        onComplete({
          success: false,
          runId: 0,
          logs: `Validation errors:\n${validation.errors.join('\n')}`,
        });
        return;
      }
    }

    // Step 2: Build loop with self-healing
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

  /**
   * Re-trigger workflow (for self-healing after fix)
   */
  async retriggerBuild(repoFullName: string): Promise<boolean> {
    if (!this.githubService) return false;
    try {
      // Pushing updated files will auto-trigger the workflow
      await this.githubService.pushFiles(
        repoFullName,
        this.fileManager.getAllFiles(),
        'Auto-fix: Self-healing code update'
      );
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================
  // AUTO-FIX METHODS
  // ===========================================

  private async autoFixValidationErrors(errors: string[]): Promise<boolean> {
    const provider = getActiveAIProvider();
    if (!provider) return false;

    try {
      const prompt = `Fix these validation errors in a React Native Expo project:

ERRORS:
${errors.join('\n')}

CURRENT FILES:
${this.fileManager.getContextSummary()}

Return ONLY the fixed files in JSON:
{"files":{"path/file.tsx":"// complete fixed content"}}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${provider.apiKey}`,
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

  private async selfHeal(errorLogs: string): Promise<boolean> {
    const provider = getActiveAIProvider();
    if (!provider) return false;

    try {
      // Get full file context
      const fileContext = this.fileManager.getContextSummary();
      const fileTree = this.fileManager.getFileTree();
      
      // Extract key error patterns from logs
      const errorPatterns = this.extractErrorPatterns(errorLogs);
      
      // Determine which files need fixing based on error
      const relevantFiles: Record<string, string> = {};
      for (const filePath of fileTree) {
        const content = this.fileManager.getFile(filePath);
        if (content) {
          // Include files mentioned in errors, or key config files
          const isRelevant = errorPatterns.some(p => filePath.includes(p) || content.includes(p))
            || filePath === 'app.json'
            || filePath === 'package.json'
            || filePath.endsWith('_layout.tsx')
            || filePath.includes('build.yml');
          
          if (isRelevant) {
            relevantFiles[filePath] = content;
          }
        }
      }

      const prompt = `You are an expert React Native / Expo build debugger. Fix this build error.

ERROR LOGS:
\`\`\`
${errorLogs.slice(0, 4000)}
\`\`\`

ERROR PATTERNS DETECTED:
${errorPatterns.join('\n')}

RELEVANT FILES IN PROJECT:
${Object.entries(relevantFiles).map(([p, c]) => `--- ${p} ---\n${c.slice(0, 2000)}`).join('\n\n')}

ALL PROJECT FILES:
${fileTree.join('\n')}

NATIVE MODULES: ${this.fileManager.getNativeModules().join(', ') || 'None'}
DEPENDENCIES: ${this.fileManager.getDependencies().join(', ') || 'Standard'}

Instructions:
1. Identify the ROOT CAUSE from the error logs
2. Provide the EXACT fix with complete file content
3. Return ONLY valid JSON

Return format:
{"files":{"path/file.tsx":"// complete fixed content"}, "explanation": "what was wrong and what was fixed"}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${provider.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 16384 },
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
      
      if (fix.files && Object.keys(fix.files).length > 0) {
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

  /**
   * Extract meaningful error patterns from build logs
   */
  private extractErrorPatterns(logs: string): string[] {
    const patterns: string[] = [];
    
    // Common error patterns
    const matchers = [
      /error:\s*(.+)/gi,
      /FAILURE:\s*(.+)/gi,
      /Cannot find module '([^']+)'/gi,
      /Module not found:\s*(.+)/gi,
      /Could not resolve '([^']+)'/gi,
      /undefined is not an object/gi,
      /SyntaxError:\s*(.+)/gi,
      /TypeError:\s*(.+)/gi,
      /Task :app:(\w+) FAILED/gi,
      /Execution failed for task ':app:(\w+)'/gi,
      /error TS\d+:\s*(.+)/gi,
    ];

    for (const matcher of matchers) {
      let match;
      while ((match = matcher.exec(logs)) !== null) {
        const errorText = match[1] || match[0];
        if (errorText.length < 200) {
          patterns.push(errorText.trim());
        }
      }
    }

    // Remove duplicates
    return [...new Set(patterns)].slice(0, 15);
  }

  // ===========================================
  // STATUS
  // ===========================================

  getStatus(): {
    name: string;
    fileCount: number;
    repo: string | null;
    nativeModules: string[];
    validated: boolean;
  } {
    const validation = this.validateProject();
    
    return {
      name: this.projectName,
      fileCount: this.fileManager.getFileCount(),
      repo: this.repoFullName,
      nativeModules: this.fileManager.getNativeModules(),
      validated: validation.success,
    };
  }
}

// Factory function
export const createAgenticEngine = (name: string, description: string): AgenticEngine => {
  return new AgenticEngine(name, description);
};

export default AgenticEngine;
