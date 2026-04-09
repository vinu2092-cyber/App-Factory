/**
 * BUILD PROGRESS SERVICE - Real-time Progress Tracking
 * 
 * Features:
 * 1. Real-time progress updates
 * 2. Step-by-step logging
 * 3. Live GitHub push as files are created
 * 4. Progress UI updates
 */

export interface ProgressStep {
  id: string;
  type: 'plan' | 'file_create' | 'file_edit' | 'github_push' | 'build' | 'complete' | 'error';
  status: 'pending' | 'running' | 'done' | 'error';
  title: string;
  detail?: string;
  timestamp: number;
}

export interface BuildProgress {
  projectName: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  steps: ProgressStep[];
  files: Record<string, 'pending' | 'created' | 'pushed'>;
  isComplete: boolean;
  error?: string;
}

type ProgressCallback = (progress: BuildProgress) => void;

class BuildProgressService {
  private progress: BuildProgress | null = null;
  private listeners: ProgressCallback[] = [];
  private githubService: any = null;
  private repoFullName: string | null = null;

  // Initialize new build progress
  startBuild(projectName: string, totalFiles: number): BuildProgress {
    this.progress = {
      projectName,
      totalSteps: totalFiles + 3, // files + plan + github + complete
      completedSteps: 0,
      currentStep: 'Initializing...',
      steps: [],
      files: {},
      isComplete: false,
    };
    
    this.addStep({
      type: 'plan',
      status: 'running',
      title: 'Planning project structure...',
    });
    
    this.notifyListeners();
    return this.progress;
  }

  // Connect GitHub for live push
  connectGitHub(service: any, repoFullName: string) {
    this.githubService = service;
    this.repoFullName = repoFullName;
  }

  // Add a progress step
  addStep(step: Omit<ProgressStep, 'id' | 'timestamp'>): void {
    if (!this.progress) return;
    
    const newStep: ProgressStep = {
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };
    
    this.progress.steps.push(newStep);
    this.progress.currentStep = step.title;
    
    if (step.status === 'done') {
      this.progress.completedSteps++;
    }
    
    this.notifyListeners();
  }

  // Update last step status
  updateLastStep(status: ProgressStep['status'], detail?: string): void {
    if (!this.progress || this.progress.steps.length === 0) return;
    
    const lastStep = this.progress.steps[this.progress.steps.length - 1];
    lastStep.status = status;
    if (detail) lastStep.detail = detail;
    
    if (status === 'done') {
      this.progress.completedSteps++;
    }
    
    this.notifyListeners();
  }

  // File created
  async fileCreated(path: string, content: string): Promise<void> {
    if (!this.progress) return;
    
    this.progress.files[path] = 'created';
    
    this.addStep({
      type: 'file_create',
      status: 'done',
      title: `Created: ${path}`,
      detail: `${content.length} characters`,
    });

    // Live push to GitHub if connected
    if (this.githubService && this.repoFullName) {
      try {
        this.addStep({
          type: 'github_push',
          status: 'running',
          title: `Pushing: ${path}`,
        });
        
        await this.pushSingleFile(path, content);
        this.progress.files[path] = 'pushed';
        this.updateLastStep('done', 'Pushed to GitHub');
      } catch (e: any) {
        this.updateLastStep('error', e.message);
      }
    }
  }

  // Push single file to GitHub
  private async pushSingleFile(path: string, content: string): Promise<void> {
    if (!this.githubService || !this.repoFullName) return;
    
    try {
      // Get current ref
      const ref = await this.githubService.request(`/repos/${this.repoFullName}/git/ref/heads/main`);
      const baseSha = ref.object.sha;
      
      // Get base commit and tree
      const baseCommit = await this.githubService.request(`/repos/${this.repoFullName}/git/commits/${baseSha}`);
      const baseTreeSha = baseCommit.tree.sha;
      
      // Create blob
      const blob = await this.githubService.request(`/repos/${this.repoFullName}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      
      // Create tree with single file
      const newTree = await this.githubService.request(`/repos/${this.repoFullName}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [{ path, mode: '100644', type: 'blob', sha: blob.sha }],
        }),
      });
      
      // Create commit
      const newCommit = await this.githubService.request(`/repos/${this.repoFullName}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: `Add ${path}`,
          tree: newTree.sha,
          parents: [baseSha],
        }),
      });
      
      // Update ref
      await this.githubService.request(`/repos/${this.repoFullName}/git/refs/heads/main`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
      });
    } catch (e) {
      throw e;
    }
  }

  // Mark build complete
  completeBuild(): void {
    if (!this.progress) return;
    
    this.addStep({
      type: 'complete',
      status: 'done',
      title: 'Build complete!',
      detail: `${Object.keys(this.progress.files).length} files created`,
    });
    
    this.progress.isComplete = true;
    this.progress.currentStep = 'Complete!';
    this.notifyListeners();
  }

  // Mark build error
  setBuildError(error: string): void {
    if (!this.progress) return;
    
    this.addStep({
      type: 'error',
      status: 'error',
      title: 'Error occurred',
      detail: error,
    });
    
    this.progress.error = error;
    this.notifyListeners();
  }

  // Get current progress
  getProgress(): BuildProgress | null {
    return this.progress;
  }

  // Subscribe to progress updates
  subscribe(callback: ProgressCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    if (this.progress) {
      this.listeners.forEach(l => l(this.progress!));
    }
  }

  // Reset progress
  reset(): void {
    this.progress = null;
    this.githubService = null;
    this.repoFullName = null;
  }

  // Format progress for chat display
  formatForChat(): string {
    if (!this.progress) return '';
    
    const { steps, completedSteps, totalSteps, projectName } = this.progress;
    
    let output = `**${projectName}** - Progress: ${completedSteps}/${totalSteps}\n\n`;
    
    for (const step of steps.slice(-10)) { // Show last 10 steps
      const icon = step.status === 'done' ? '✓' : 
                   step.status === 'running' ? '→' : 
                   step.status === 'error' ? '✗' : '○';
      output += `${icon} ${step.title}${step.detail ? ` (${step.detail})` : ''}\n`;
    }
    
    return output;
  }
}

// Singleton instance
export const buildProgressService = new BuildProgressService();
export default buildProgressService;
