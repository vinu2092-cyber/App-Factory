import { useStore, getDefaultGitHubAccount } from '../store/useStore';

const GITHUB_API = 'https://api.github.com';

// Get token from new account system or legacy settings
const getToken = (): string => {
  // First try new account system
  const defaultAccount = getDefaultGitHubAccount();
  if (defaultAccount && defaultAccount.token) {
    return defaultAccount.token;
  }
  
  // Fallback to legacy token
  const { settings } = useStore.getState();
  return settings.githubToken;
};

// Get username
const getUsername = (): string => {
  const defaultAccount = getDefaultGitHubAccount();
  if (defaultAccount) {
    return defaultAccount.username;
  }
  const { settings } = useStore.getState();
  return settings.githubUsername;
};

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  default_branch: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  jobs_url: string;
}

export async function getRepositories(): Promise<Repository[]> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  const response = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=30`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) throw new Error('Failed to fetch repositories');
  return response.json();
}

export async function createRepository(name: string, isPrivate: boolean = true): Promise<Repository> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  const response = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create repository');
  }
  return response.json();
}

export async function pushFiles(
  repoFullName: string,
  files: Record<string, string>,
  commitMessage: string,
  branch: string = 'main'
): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  // Get the current commit SHA
  const refResponse = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/git/ref/heads/${branch}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  let baseSha: string;
  let baseTreeSha: string;
  
  if (refResponse.ok) {
    const refData = await refResponse.json();
    baseSha = refData.object.sha;
    
    const commitResponse = await fetch(
      `${GITHUB_API}/repos/${repoFullName}/git/commits/${baseSha}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const commitData = await commitResponse.json();
    baseTreeSha = commitData.tree.sha;
  } else {
    baseSha = '';
    baseTreeSha = '';
  }

  // Create blobs for each file
  const treeItems = [];
  for (const [path, content] of Object.entries(files)) {
    const blobResponse = await fetch(
      `${GITHUB_API}/repos/${repoFullName}/git/blobs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          encoding: 'utf-8',
        }),
      }
    );
    const blobData = await blobResponse.json();
    treeItems.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // Create tree
  const treeResponse = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/git/trees`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseTreeSha || undefined,
        tree: treeItems,
      }),
    }
  );
  const treeData = await treeResponse.json();

  // Create commit
  const commitBody: any = {
    message: commitMessage,
    tree: treeData.sha,
  };
  if (baseSha) {
    commitBody.parents = [baseSha];
  }

  const newCommitResponse = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/git/commits`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commitBody),
    }
  );
  const newCommitData = await newCommitResponse.json();

  // Update reference
  const updateRefMethod = baseSha ? 'PATCH' : 'POST';
  const updateRefUrl = baseSha
    ? `${GITHUB_API}/repos/${repoFullName}/git/refs/heads/${branch}`
    : `${GITHUB_API}/repos/${repoFullName}/git/refs`;

  await fetch(updateRefUrl, {
    method: updateRefMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      baseSha
        ? { sha: newCommitData.sha, force: true }
        : { ref: `refs/heads/${branch}`, sha: newCommitData.sha }
    ),
  });
}

export async function getWorkflowRuns(repoFullName: string): Promise<WorkflowRun[]> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  const response = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/actions/runs?per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.workflow_runs || [];
}

export async function getWorkflowLogs(repoFullName: string, runId: number): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  // Get jobs for the run
  const jobsResponse = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/actions/runs/${runId}/jobs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!jobsResponse.ok) return 'Failed to fetch logs';
  const jobsData = await jobsResponse.json();

  // Get logs for failed jobs
  let logs = '';
  for (const job of jobsData.jobs || []) {
    if (job.conclusion === 'failure') {
      for (const step of job.steps || []) {
        if (step.conclusion === 'failure') {
          logs += `\n=== FAILED: ${step.name} ===\n`;
        }
      }
    }
  }

  // Try to get full logs
  try {
    const logsResponse = await fetch(
      `${GITHUB_API}/repos/${repoFullName}/actions/runs/${runId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (logsResponse.ok) {
      logs += await logsResponse.text();
    }
  } catch (e) {
    // Logs might not be available
  }

  return logs || 'No detailed logs available';
}

export async function getFileContent(repoFullName: string, path: string): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('GitHub token not configured');

  const response = await fetch(
    `${GITHUB_API}/repos/${repoFullName}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) throw new Error('File not found');
  const data = await response.json();
  return atob(data.content);
}

export async function setupGitHubActionsWorkflow(repoFullName: string): Promise<void> {
  const workflowContent = `name: Build Android APK/AAB

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies
        run: npm install

      - name: Install EAS CLI
        run: npm install -g eas-cli

      - name: Build APK (Debug)
        run: |
          cd android
          ./gradlew assembleDebug
        continue-on-error: true

      - name: Build with Expo (if no android folder)
        if: failure()
        run: |
          npx expo prebuild --platform android
          cd android
          ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: ignore

      - name: Build AAB (Release)
        run: |
          cd android
          ./gradlew bundleRelease
        continue-on-error: true

      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/bundle/release/app-release.aab
          if-no-files-found: ignore

  auto-fix:
    needs: build
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Notify build failure
        run: echo "Build failed - Auto-correction mode will analyze logs"
`;

  await pushFiles(
    repoFullName,
    { '.github/workflows/build-android.yml': workflowContent },
    'Add GitHub Actions workflow for APK/AAB builds'
  );
}

// Export helper to check if GitHub is configured
export const isGitHubConfigured = (): boolean => {
  return !!getToken();
};

// Export current account info
export const getCurrentGitHubInfo = (): { username: string; hasToken: boolean } => {
  return {
    username: getUsername(),
    hasToken: !!getToken(),
  };
};
