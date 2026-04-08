/**
 * EXPO TESTING SERVICE - Real API Integration
 * 
 * Uses Expo account from settings to:
 * 1. Authenticate with Expo/EAS
 * 2. Get projects and builds
 * 3. Trigger EAS builds
 * 4. Validate project structure before build
 * 5. Check runtime errors
 */

import { getDefaultExpoAccount } from '../store/useStore';

export interface ExpoProject {
  id: string;
  name: string;
  slug: string;
  ownerAccount: { name: string };
  sdkVersion?: string;
}

export interface ExpoBuild {
  id: string;
  status: 'new' | 'in-queue' | 'in-progress' | 'pending-cancel' | 'canceled' | 'finished' | 'errored';
  platform: 'ANDROID' | 'IOS';
  distribution: string;
  buildProfile: string;
  artifacts?: {
    buildUrl: string;
    applicationArchiveUrl?: string;
  };
  error?: {
    message: string;
    errorCode: string;
  };
  createdAt: string;
  updatedAt: string;
  logUrl?: string;
}

export interface ExpoTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  screenshots?: string[];
}

// ===========================================
// EXPO REST + GRAPHQL API SERVICE
// ===========================================

export class ExpoTestingService {
  private accessToken: string;
  private username: string;
  private restBaseUrl = 'https://api.expo.dev';
  private graphqlUrl = 'https://api.expo.dev/graphql';

  constructor() {
    const account = getDefaultExpoAccount();
    if (!account) {
      throw new Error('No Expo account configured. Add one in Settings.');
    }
    this.accessToken = account.accessToken || '';
    this.username = account.username;
  }

  // ===========================================
  // HTTP HELPERS
  // ===========================================

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async restRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.restBaseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(error.errors?.[0]?.message || error.message || `Expo API Error: ${res.status}`);
    }

    return res.json();
  }

  private async graphqlRequest(query: string, variables: Record<string, any> = {}): Promise<any> {
    const res = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Expo GraphQL Error: ${res.status}`);
    }

    const data = await res.json();
    if (data.errors?.length) {
      throw new Error(data.errors[0].message);
    }
    return data.data;
  }

  // ===========================================
  // AUTHENTICATION
  // ===========================================

  /**
   * Verify that the stored token is valid
   */
  async verifyAuth(): Promise<{ authenticated: boolean; username: string }> {
    try {
      const data = await this.graphqlRequest(`
        query CurrentUser {
          meActor {
            __typename
            id
            ... on User {
              username
            }
            ... on Robot {
              firstName
            }
          }
        }
      `);
      
      const actor = data.meActor;
      return {
        authenticated: !!actor,
        username: actor?.username || actor?.firstName || 'unknown',
      };
    } catch {
      return { authenticated: false, username: '' };
    }
  }

  /**
   * Login with username/password and get session token
   */
  async loginWithPassword(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.restBaseUrl}/v2/auth/loginAsync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.errors?.[0]?.message || 'Login failed');
      }

      const data = await res.json();
      const sessionSecret = data.data?.sessionSecret;
      if (sessionSecret) {
        this.accessToken = sessionSecret;
      }
      return sessionSecret || null;
    } catch (error: any) {
      console.error('Expo login failed:', error.message);
      return null;
    }
  }

  // ===========================================
  // PROJECT METHODS
  // ===========================================

  /**
   * Get user's Expo projects via GraphQL
   */
  async getProjects(limit = 15): Promise<ExpoProject[]> {
    try {
      const data = await this.graphqlRequest(`
        query GetProjects($username: String!, $limit: Int!) {
          account {
            byName(accountName: $username) {
              apps(limit: $limit, offset: 0) {
                id
                name
                slug
                ownerAccount { name }
              }
            }
          }
        }
      `, { username: this.username, limit });

      return data.account?.byName?.apps || [];
    } catch (error: any) {
      console.error('Failed to get Expo projects:', error.message);
      return [];
    }
  }

  /**
   * Get project by slug
   */
  async getProjectBySlug(slug: string): Promise<ExpoProject | null> {
    try {
      const data = await this.graphqlRequest(`
        query GetApp($fullName: String!) {
          app {
            byFullName(fullName: $fullName) {
              id
              name
              slug
              ownerAccount { name }
            }
          }
        }
      `, { fullName: `@${this.username}/${slug}` });

      return data.app?.byFullName || null;
    } catch {
      return null;
    }
  }

  // ===========================================
  // EAS BUILD METHODS
  // ===========================================

  /**
   * Get builds for a project via GraphQL
   */
  async getBuilds(appId: string, limit = 10): Promise<ExpoBuild[]> {
    try {
      const data = await this.graphqlRequest(`
        query GetBuilds($appId: String!, $limit: Int!) {
          builds {
            byAppId(appId: $appId, limit: $limit) {
              id
              status
              platform
              distribution
              buildProfile
              artifacts {
                buildUrl
                applicationArchiveUrl
              }
              error {
                message
                errorCode
              }
              createdAt
              updatedAt
            }
          }
        }
      `, { appId, limit });

      return data.builds?.byAppId || [];
    } catch (error: any) {
      console.error('Failed to get builds:', error.message);
      return [];
    }
  }

  /**
   * Get single build status
   */
  async getBuildStatus(buildId: string): Promise<ExpoBuild | null> {
    try {
      const data = await this.graphqlRequest(`
        query GetBuild($buildId: ID!) {
          builds {
            byId(buildId: $buildId) {
              id
              status
              platform
              distribution
              buildProfile
              artifacts {
                buildUrl
                applicationArchiveUrl
              }
              error {
                message
                errorCode
              }
              createdAt
              updatedAt
            }
          }
        }
      `, { buildId });

      return data.builds?.byId || null;
    } catch {
      return null;
    }
  }

  /**
   * Wait for a build to complete (polls every 15s)
   */
  async waitForBuild(buildId: string, maxWaitMs = 600000): Promise<ExpoBuild | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const build = await this.getBuildStatus(buildId);
      if (!build) return null;

      if (build.status === 'finished' || build.status === 'errored' || build.status === 'canceled') {
        return build;
      }

      // Wait 15 seconds before polling again
      await new Promise(r => setTimeout(r, 15000));
    }

    return null; // Timeout
  }

  /**
   * Get build logs URL
   */
  async getBuildLogs(buildId: string): Promise<string> {
    try {
      const data = await this.graphqlRequest(`
        query GetBuildLogs($buildId: ID!) {
          builds {
            byId(buildId: $buildId) {
              logFiles {
                url
              }
            }
          }
        }
      `, { buildId });

      return data.builds?.byId?.logFiles?.[0]?.url || '';
    } catch {
      return '';
    }
  }

  // ===========================================
  // VALIDATION METHODS
  // ===========================================

  /**
   * Validate project files before build
   */
  validateProject(files: Record<string, string>): ExpoTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required files
    const requiredFiles = ['app.json', 'package.json'];
    for (const file of requiredFiles) {
      if (!files[file]) {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // Validate app.json
    if (files['app.json']) {
      try {
        const appJson = JSON.parse(files['app.json']);
        const expo = appJson.expo || appJson;
        
        if (!expo.name) errors.push('app.json: Missing expo.name');
        if (!expo.slug) errors.push('app.json: Missing expo.slug');
        if (!expo.version) warnings.push('app.json: Missing expo.version');
        
        // Android specific
        if (!expo.android?.package) {
          warnings.push('app.json: Missing android.package (needed for APK builds)');
        }

        // Check for SDK version compatibility
        if (expo.sdkVersion) {
          const sdkNum = parseInt(expo.sdkVersion);
          if (sdkNum < 49) {
            warnings.push(`app.json: SDK ${expo.sdkVersion} is outdated. Consider upgrading.`);
          }
        }
      } catch {
        errors.push('app.json: Invalid JSON format');
      }
    }

    // Validate package.json
    if (files['package.json']) {
      try {
        const pkg = JSON.parse(files['package.json']);
        if (!pkg.dependencies?.expo) errors.push('package.json: Missing expo dependency');
        if (!pkg.dependencies?.react) errors.push('package.json: Missing react dependency');
        if (!pkg.dependencies?.['react-native']) errors.push('package.json: Missing react-native dependency');
        
        // Check main entry
        if (pkg.main !== 'expo-router/entry' && !pkg.main?.includes('index')) {
          warnings.push('package.json: Unusual main entry point');
        }
      } catch {
        errors.push('package.json: Invalid JSON format');
      }
    }

    // Check TypeScript files
    for (const [path, content] of Object.entries(files)) {
      if (!path.endsWith('.tsx') && !path.endsWith('.ts')) continue;

      // Missing imports
      if (content.includes('StyleSheet.create') && !content.includes('StyleSheet')) {
        warnings.push(`${path}: StyleSheet used but might not be imported`);
      }

      // Console.log in production
      const consoleCount = (content.match(/console\.log\(/g) || []).length;
      if (consoleCount > 3) {
        warnings.push(`${path}: Has ${consoleCount} console.log statements`);
      }

      // Too many 'any' types
      const anyCount = (content.match(/: any/g) || []).length;
      if (anyCount > 5) {
        warnings.push(`${path}: Has ${anyCount} 'any' types`);
      }
    }

    return { success: errors.length === 0, errors, warnings };
  }

  /**
   * Check for runtime errors in code
   */
  checkForRuntimeErrors(files: Record<string, string>): string[] {
    const errors: string[] = [];

    for (const [path, content] of Object.entries(files)) {
      if (!path.endsWith('.tsx') && !path.endsWith('.ts')) continue;

      // Null/undefined access
      if (content.includes('undefined.') || content.includes('null.')) {
        errors.push(`${path}: Potential null/undefined reference`);
      }

      // await without async
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('await ') && !lines[i].includes('async ')) {
          let hasAsync = false;
          for (let j = i; j >= 0 && j > i - 15; j--) {
            if (lines[j].includes('async ')) { hasAsync = true; break; }
          }
          if (!hasAsync) {
            errors.push(`${path}:${i + 1}: await used without async`);
          }
        }
      }

      // Missing return in components
      if (content.includes('export default function') && !content.includes('return (') && !content.includes('return <') && !content.includes('return null')) {
        errors.push(`${path}: Component might be missing return statement`);
      }
    }

    return errors;
  }

  /**
   * Full validation
   */
  fullValidation(files: Record<string, string>): ExpoTestResult {
    const structure = this.validateProject(files);
    const runtime = this.checkForRuntimeErrors(files);

    return {
      success: structure.success && runtime.length === 0,
      errors: [...structure.errors, ...runtime],
      warnings: structure.warnings,
    };
  }
}

// ===========================================
// EXPO CLI COMMANDS GENERATOR
// ===========================================

export const ExpoCliCommands = {
  start: (platform?: 'android' | 'ios' | 'web'): string => {
    return platform ? `npx expo start --${platform}` : 'npx expo start';
  },

  prebuild: (platform: 'android' | 'ios' | 'all' = 'android', clean = true): string => {
    const cleanFlag = clean ? ' --clean' : '';
    return platform === 'all'
      ? `npx expo prebuild${cleanFlag}`
      : `npx expo prebuild --platform ${platform}${cleanFlag}`;
  },

  easBuild: (platform: 'android' | 'ios', profile: 'development' | 'preview' | 'production' = 'preview'): string => {
    return `eas build --platform ${platform} --profile ${profile}`;
  },

  easSubmit: (platform: 'android' | 'ios'): string => {
    return `eas submit --platform ${platform}`;
  },

  login: (username: string): string => {
    return `npx expo login -u ${username}`;
  },

  logout: (): string => 'npx expo logout',
};

// ===========================================
// HELPERS
// ===========================================

export const isExpoConfigured = (): boolean => {
  return !!getDefaultExpoAccount();
};

export const getExpoAccountInfo = (): { username: string; hasToken: boolean } | null => {
  const account = getDefaultExpoAccount();
  if (!account) return null;
  return { username: account.username, hasToken: !!account.accessToken };
};

export default ExpoTestingService;
