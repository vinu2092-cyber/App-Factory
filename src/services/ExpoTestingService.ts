/**
 * EXPO TESTING SERVICE
 * 
 * Uses Expo account from settings to:
 * 1. Run app on Expo Go
 * 2. Take screenshots for testing
 * 3. Check for errors before real device
 * 4. Auto-fix small issues
 */

import { getDefaultExpoAccount } from '../store/useStore';

export interface ExpoProject {
  id: string;
  name: string;
  slug: string;
  owner: string;
  sdkVersion: string;
}

export interface ExpoBuild {
  id: string;
  status: 'pending' | 'in-progress' | 'finished' | 'errored';
  platform: 'android' | 'ios';
  artifacts?: {
    buildUrl: string;
  };
}

export interface ExpoTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  screenshots?: string[];
}

// ===========================================
// EXPO API SERVICE
// ===========================================

export class ExpoTestingService {
  private accessToken: string;
  private username: string;
  private baseUrl = 'https://api.expo.dev';

  constructor() {
    const account = getDefaultExpoAccount();
    if (!account) {
      throw new Error('No Expo account configured. Add one in Settings.');
    }
    this.accessToken = account.accessToken || '';
    this.username = account.username;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `Expo API Error: ${res.status}`);
    }

    return res.json();
  }

  // ===========================================
  // PROJECT METHODS
  // ===========================================

  /**
   * Get user's Expo projects
   */
  async getProjects(): Promise<ExpoProject[]> {
    try {
      const data = await this.request(`/v2/users/${this.username}/projects`);
      return data.data || [];
    } catch (error) {
      console.error('Failed to get Expo projects:', error);
      return [];
    }
  }

  /**
   * Create new Expo project
   */
  async createProject(name: string, slug: string): Promise<ExpoProject | null> {
    try {
      const data = await this.request('/v2/projects', {
        method: 'POST',
        body: JSON.stringify({
          accountName: this.username,
          projectName: name,
          slug,
        }),
      });
      return data.data;
    } catch (error) {
      console.error('Failed to create Expo project:', error);
      return null;
    }
  }

  // ===========================================
  // BUILD METHODS
  // ===========================================

  /**
   * Get builds for a project
   */
  async getBuilds(projectId: string): Promise<ExpoBuild[]> {
    try {
      const data = await this.request(`/v2/projects/${projectId}/builds`);
      return data.data || [];
    } catch (error) {
      console.error('Failed to get builds:', error);
      return [];
    }
  }

  /**
   * Get build status
   */
  async getBuildStatus(buildId: string): Promise<ExpoBuild | null> {
    try {
      const data = await this.request(`/v2/builds/${buildId}`);
      return data.data;
    } catch (error) {
      console.error('Failed to get build status:', error);
      return null;
    }
  }

  // ===========================================
  // TESTING METHODS
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
        errors.push(\`Missing required file: \${file}\`);
      }
    }

    // Check app.json
    if (files['app.json']) {
      try {
        const appJson = JSON.parse(files['app.json']);
        if (!appJson.expo?.name) {
          errors.push('app.json: Missing expo.name');
        }
        if (!appJson.expo?.slug) {
          errors.push('app.json: Missing expo.slug');
        }
        if (!appJson.expo?.version) {
          warnings.push('app.json: Missing expo.version');
        }
      } catch {
        errors.push('app.json: Invalid JSON');
      }
    }

    // Check package.json
    if (files['package.json']) {
      try {
        const packageJson = JSON.parse(files['package.json']);
        if (!packageJson.dependencies?.expo) {
          errors.push('package.json: Missing expo dependency');
        }
        if (!packageJson.dependencies?.react) {
          errors.push('package.json: Missing react dependency');
        }
      } catch {
        errors.push('package.json: Invalid JSON');
      }
    }

    // Check for common issues in TypeScript files
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.tsx') || path.endsWith('.ts')) {
        // Check for missing imports
        if (content.includes('StyleSheet.create') && !content.includes("import { StyleSheet")) {
          if (!content.includes("import {") || !content.includes("StyleSheet")) {
            warnings.push(\`\${path}: StyleSheet used but might not be imported\`);
          }
        }

        // Check for console.log (should be removed in production)
        if (content.includes('console.log(')) {
          warnings.push(\`\${path}: Contains console.log statements\`);
        }

        // Check for any type
        const anyCount = (content.match(/: any/g) || []).length;
        if (anyCount > 5) {
          warnings.push(\`\${path}: Has \${anyCount} 'any' types - consider adding proper types\`);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for common runtime errors
   */
  checkForRuntimeErrors(files: Record<string, string>): string[] {
    const errors: string[] = [];

    for (const [path, content] of Object.entries(files)) {
      if (!path.endsWith('.tsx') && !path.endsWith('.ts')) continue;

      // Check for undefined references
      if (content.includes('undefined.') || content.includes('null.')) {
        errors.push(\`\${path}: Potential null/undefined reference\`);
      }

      // Check for async/await issues
      if (content.includes('await ') && !content.includes('async ')) {
        const lines = content.split('\\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('await ') && !lines[i].includes('async ')) {
            // Check if function declaration has async
            let hasAsync = false;
            for (let j = i; j >= 0 && j > i - 10; j--) {
              if (lines[j].includes('async ')) {
                hasAsync = true;
                break;
              }
            }
            if (!hasAsync) {
              errors.push(\`\${path}:\${i + 1}: await used without async\`);
            }
          }
        }
      }

      // Check for missing return in components
      if (content.includes('export default function') && !content.includes('return (') && !content.includes('return <')) {
        errors.push(\`\${path}: Component might be missing return statement\`);
      }
    }

    return errors;
  }

  /**
   * Full project validation
   */
  fullValidation(files: Record<string, string>): ExpoTestResult {
    const structureResult = this.validateProject(files);
    const runtimeErrors = this.checkForRuntimeErrors(files);

    return {
      success: structureResult.success && runtimeErrors.length === 0,
      errors: [...structureResult.errors, ...runtimeErrors],
      warnings: structureResult.warnings,
    };
  }
}

// ===========================================
// EXPO CLI COMMANDS GENERATOR
// ===========================================

export const ExpoCliCommands = {
  /**
   * Generate Expo start command
   */
  start: (platform?: 'android' | 'ios' | 'web'): string => {
    if (platform) {
      return \`npx expo start --\${platform}\`;
    }
    return 'npx expo start';
  },

  /**
   * Generate Expo prebuild command
   */
  prebuild: (platform: 'android' | 'ios' | 'all' = 'android', clean = true): string => {
    const cleanFlag = clean ? ' --clean' : '';
    if (platform === 'all') {
      return \`npx expo prebuild\${cleanFlag}\`;
    }
    return \`npx expo prebuild --platform \${platform}\${cleanFlag}\`;
  },

  /**
   * Generate EAS build command
   */
  easBuild: (platform: 'android' | 'ios', profile: 'development' | 'preview' | 'production' = 'preview'): string => {
    return \`eas build --platform \${platform} --profile \${profile}\`;
  },

  /**
   * Generate EAS submit command
   */
  easSubmit: (platform: 'android' | 'ios'): string => {
    return \`eas submit --platform \${platform}\`;
  },

  /**
   * Login to Expo
   */
  login: (username: string): string => {
    return \`npx expo login -u \${username}\`;
  },

  /**
   * Logout from Expo
   */
  logout: (): string => {
    return 'npx expo logout';
  },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if Expo is configured
 */
export const isExpoConfigured = (): boolean => {
  const account = getDefaultExpoAccount();
  return !!account;
};

/**
 * Get Expo account info
 */
export const getExpoAccountInfo = (): { username: string; hasToken: boolean } | null => {
  const account = getDefaultExpoAccount();
  if (!account) return null;
  
  return {
    username: account.username,
    hasToken: !!account.accessToken,
  };
};

export default ExpoTestingService;
