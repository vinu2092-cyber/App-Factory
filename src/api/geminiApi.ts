import { useStore, getActiveAIProvider } from '../store/useStore';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface AIResponse {
  action: 'write_code' | 'fix_error' | 'message' | 'analyze';
  plan?: string;
  files?: Record<string, string>;
  message?: string;
  libraries?: string[];
  nativeModules?: string[];
}

export const isAIConfigured = (): boolean => {
  return useStore.getState().aiProviders.length > 0;
};

export const getActiveProviderInfo = () => {
  const provider = getActiveAIProvider();
  return provider ? { name: provider.name, type: provider.type } : null;
};

// POWERFUL SYSTEM PROMPT - Like Emergent
const SYSTEM_PROMPT = `You are "App Factory AI" - the most powerful autonomous Android app builder agent.

## YOUR CAPABILITIES (EMERGENT-LEVEL):
1. **FULL PROJECT STRUCTURE** - Generate complete app with all folders and files
2. **AUTO-CORRECT** - Read build errors and fix automatically
3. **NATIVE MODULES** - Camera, Storage, Notifications, Background Services
4. **HIGH-PERFORMANCE CODE** - FlatList, useMemo, useCallback, lazy loading
5. **GITHUB INTEGRATION** - Code ready for GitHub Actions build

## RESPONSE FORMAT (STRICT JSON):

### For CODE GENERATION:
{
  "action": "write_code",
  "plan": "Step-by-step plan of what you're building",
  "files": {
    "app/_layout.tsx": "// Complete layout code",
    "app/index.tsx": "// Main screen code",
    "app/screens/Home.tsx": "// Home screen",
    "app/screens/Settings.tsx": "// Settings screen",
    "app/components/Button.tsx": "// Reusable button",
    "app/components/Card.tsx": "// Reusable card",
    "app/hooks/useAuth.ts": "// Auth hook",
    "app/services/api.ts": "// API service",
    "app/store/useStore.ts": "// Zustand store",
    "app/utils/helpers.ts": "// Helper functions",
    "app/constants/theme.ts": "// Theme constants",
    "package.json": "// With all dependencies",
    "app.json": "// Expo config",
    ".github/workflows/build.yml": "// GitHub Actions"
  },
  "libraries": ["zustand", "axios", "react-native-reanimated"],
  "nativeModules": ["expo-camera", "expo-notifications"]
}

### For ERROR FIXING:
{
  "action": "fix_error",
  "plan": "Root cause analysis and fix strategy",
  "files": {
    "path/to/fixed/file.tsx": "// Fixed code"
  }
}

### For QUESTIONS:
{
  "action": "message",
  "message": "Your detailed answer"
}

## CODE QUALITY RULES:
1. TypeScript ONLY - proper types everywhere
2. StyleSheet.create() - no inline styles
3. FlatList for ALL lists - never ScrollView for data
4. useMemo/useCallback - for expensive operations
5. Error boundaries - wrap screens
6. Loading states - for all async operations
7. Proper navigation - expo-router with typed routes
8. State management - Zustand (no Redux)
9. API calls - try/catch with proper error handling
10. Touch targets - minimum 44x44 pixels

## NATIVE MODULE TEMPLATES:

### Camera:
import * as ImagePicker from 'expo-image-picker';
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (!result.canceled) return result.assets[0].uri;
};

### Notifications:
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

### Storage:
import AsyncStorage from '@react-native-async-storage/async-storage';
const save = async (key, value) => await AsyncStorage.setItem(key, JSON.stringify(value));
const load = async (key) => JSON.parse(await AsyncStorage.getItem(key) || 'null');

## GITHUB ACTIONS TEMPLATE:
name: Build APK
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: npm install
      - run: npx expo prebuild --platform android
      - run: cd android && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/*.apk

## IMPORTANT:
- Generate COMPLETE working code - not snippets
- Include ALL imports
- Create FULL project structure
- Add PROPER error handling
- Make it PRODUCTION ready
- You are as POWERFUL as Emergent - ACT LIKE IT!`;

// Error Analysis Prompt
const ERROR_ANALYSIS_PROMPT = `You are debugging a React Native Expo app build error.

Analyze the error logs and provide a fix:
1. Identify the ROOT CAUSE
2. Explain WHY it happened
3. Provide the EXACT fix
4. Return fixed files in JSON format

Common issues:
- Missing imports → Add the import
- Type errors → Fix the type
- Missing dependencies → Add to package.json
- Gradle errors → Check android/build.gradle
- Metro errors → Clear cache, check imports`;

export async function chatWithGemini(
  prompt: string,
  context?: {
    errorLogs?: string;
    existingFiles?: Record<string, string>;
  }
): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  try {
    let fullPrompt = SYSTEM_PROMPT;
    
    // Add error context for auto-fix
    if (context?.errorLogs) {
      fullPrompt += `\n\n${ERROR_ANALYSIS_PROMPT}\n\n## BUILD ERROR LOGS:\n\`\`\`\n${context.errorLogs}\n\`\`\``;
    }
    
    // Add existing files context
    if (context?.existingFiles) {
      fullPrompt += `\n\n## EXISTING PROJECT FILES:\n${JSON.stringify(context.existingFiles, null, 2)}`;
    }
    
    fullPrompt += `\n\n## USER REQUEST:\n${prompt}`;

    const res = await fetch(`${GEMINI_URL}?key=${provider.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { 
          temperature: 0.3, // Lower for more consistent code
          maxOutputTokens: 16384, // Max for complete projects
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'API Error');
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean JSON response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { action: 'message', message: text };
      }
    }
    
    return { action: 'message', message: text };
  } catch (e: any) {
    console.error('AI Error:', e);
    throw new Error(e.message || 'Failed to connect to AI');
  }
}

// Auto-fix build errors
export async function autoFixBuildError(errorLogs: string): Promise<AIResponse> {
  return chatWithGemini(
    'Analyze this build error and provide the exact fix. Return only the files that need to be changed.',
    { errorLogs }
  );
}

// Generate complete project
export async function generateFullProject(appDescription: string): Promise<AIResponse> {
  return chatWithGemini(
    `Create a COMPLETE React Native Expo project for: ${appDescription}
    
    Include:
    - All screens and navigation
    - Components folder with reusable UI
    - Hooks folder
    - Services folder for API
    - Store with Zustand
    - Utils and helpers
    - Theme and constants
    - GitHub Actions workflow
    - Complete package.json with all dependencies
    - app.json with proper config
    
    Make it PRODUCTION READY!`
  );
}
