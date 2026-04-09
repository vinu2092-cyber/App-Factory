/**
 * GEMINI API - Multi-Provider AI Integration
 * Supports: Gemini, Groq, DeepSeek, HuggingFace, OpenRouter
 * 
 * Features:
 * - Complete Project Structure Generator
 * - Build Error Reading + Auto-Fix
 * - Native Modules Templates
 * - Intelligent Code Generation
 */

import { useStore, getActiveAIProvider } from '../store/useStore';

// API Endpoints for all providers
const API_ENDPOINTS: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-70B-Instruct',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

const MODELS: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  openrouter: 'anthropic/claude-3.5-sonnet',
};

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

// ===========================================
// POWERFUL SYSTEM PROMPT - EMERGENT LEVEL
// ===========================================
const SYSTEM_PROMPT = `You are "App Factory AI" - the most POWERFUL autonomous Android app builder, as capable as Emergent.

## YOUR CAPABILITIES:
1. **COMPLETE PROJECT STRUCTURE** - Generate entire app with all folders
2. **AUTO-CORRECT** - Read build errors and fix automatically  
3. **NATIVE MODULES** - Camera, Storage, Notifications, System Overlays, Background Services
4. **HIGH-PERFORMANCE CODE** - FlatList, useMemo, useCallback, lazy loading
5. **GITHUB CI/CD** - Auto-push, auto-build APK/AAB

## RESPONSE FORMAT (STRICT JSON):

### For CODE GENERATION:
{
  "action": "write_code",
  "plan": "Step-by-step plan",
  "files": {
    "app/_layout.tsx": "// Navigation setup with expo-router",
    "app/index.tsx": "// Main screen",
    "app/(tabs)/home.tsx": "// Home tab",
    "app/(tabs)/settings.tsx": "// Settings tab",
    "src/components/Button.tsx": "// Reusable button",
    "src/components/Card.tsx": "// Reusable card",
    "src/hooks/useAuth.ts": "// Auth hook",
    "src/services/api.ts": "// API service",
    "src/store/useStore.ts": "// Zustand store",
    "src/utils/helpers.ts": "// Helper functions",
    "src/constants/theme.ts": "// Theme constants",
    "src/types/index.ts": "// TypeScript types",
    "package.json": "// Dependencies",
    "app.json": "// Expo config",
    "tsconfig.json": "// TypeScript config",
    ".github/workflows/build.yml": "// GitHub Actions CI/CD"
  },
  "libraries": ["zustand", "axios", "@react-navigation/native"],
  "nativeModules": ["expo-camera", "expo-notifications"]
}

### For ERROR FIXING:
{
  "action": "fix_error",
  "plan": "Root cause: [cause]. Fix: [solution]",
  "files": {
    "path/to/file.tsx": "// Fixed complete file"
  }
}

### For QUESTIONS:
{
  "action": "message",
  "message": "Your detailed answer"
}

## CODE QUALITY (MANDATORY):
- TypeScript with proper types
- StyleSheet.create() only
- FlatList for ALL lists (never ScrollView for data)
- useMemo/useCallback for expensive operations
- Error boundaries around screens
- Loading states for async
- expo-router with typed routes
- Zustand for state (NO Redux)
- try/catch for API calls
- Touch targets minimum 44x44

## NATIVE MODULE TEMPLATES:

### System Overlay (Floating Window):
\`\`\`typescript
// AndroidManifest.xml permission
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>

// Check permission
import { PermissionsAndroid, Platform } from 'react-native';
const checkOverlayPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check('android.permission.SYSTEM_ALERT_WINDOW');
    if (!granted) {
      // Open settings to enable
      Linking.openSettings();
    }
  }
};
\`\`\`

### Camera:
\`\`\`typescript
import * as ImagePicker from 'expo-image-picker';
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (!result.canceled) return result.assets[0].uri;
};
\`\`\`

### Notifications:
\`\`\`typescript
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
\`\`\`

### Background Service:
\`\`\`typescript
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

TaskManager.defineTask('BACKGROUND_TASK', async () => {
  // Your background logic
  return BackgroundFetch.BackgroundFetchResult.NewData;
});
\`\`\`

## GITHUB ACTIONS TEMPLATE:
\`\`\`yaml
name: Build Android APK
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
      - run: cd android && chmod +x gradlew && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v4
        with:
          name: app-release-apk
          path: android/app/build/outputs/apk/release/*.apk
\`\`\`

## IMPORTANT RULES:
- Generate COMPLETE working code - not snippets
- Include ALL necessary imports
- Create FULL project structure
- Add PROPER error handling
- Make it PRODUCTION ready
- You are as POWERFUL as Emergent - ACT LIKE IT!`;

// ===========================================
// ERROR ANALYSIS PROMPT
// ===========================================
const ERROR_ANALYSIS_PROMPT = `You are debugging a React Native Expo build error. You must:
1. Identify the ROOT CAUSE
2. Explain WHY it happened
3. Provide the EXACT fix with complete file content

Return ONLY JSON:
{
  "action": "fix_error",
  "plan": "Root cause: [cause]. Fix: [solution]",
  "files": { "path/file.tsx": "// Complete fixed file" }
}`;

// ===========================================
// API CALL FUNCTIONS
// ===========================================

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `${API_ENDPOINTS.gemini}?key=${apiKey}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.error?.message || '';
    
    if (res.status === 429 || errMsg.includes('quota')) {
      throw new Error('API quota exceeded. Check billing at ai.google.dev or use a different API key.');
    }
    if (res.status === 404 || errMsg.includes('not found')) {
      throw new Error('Model not available. Check your API key permissions.');
    }
    if (res.status === 403) {
      throw new Error('API key invalid or disabled. Generate a new key at ai.google.dev');
    }
    throw new Error(errMsg || `Gemini API Error (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini. Try again.');
  }
  return text;
}

async function callOpenAICompatible(prompt: string, apiKey: string, type: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (type === 'openrouter') {
    headers['HTTP-Referer'] = 'https://appfactory.ai';
  }

  const res = await fetch(API_ENDPOINTS[type], {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODELS[type],
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 16384,
    }),
  });
  if (!res.ok) throw new Error((await res.json())?.error?.message || `${type} API Error`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callHuggingFace(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(API_ENDPOINTS.huggingface, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 8192, temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error('HuggingFace API Error');
  const data = await res.json();
  return data?.[0]?.generated_text || '';
}

// ===========================================
// MAIN CHAT FUNCTION
// ===========================================

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

  let fullPrompt = SYSTEM_PROMPT;
  
  if (context?.errorLogs) {
    fullPrompt += `\n\n${ERROR_ANALYSIS_PROMPT}\n\n## BUILD ERROR LOGS:\n\`\`\`\n${context.errorLogs}\n\`\`\``;
  }
  
  if (context?.existingFiles) {
    fullPrompt += `\n\n## EXISTING FILES:\n${JSON.stringify(Object.keys(context.existingFiles), null, 2)}`;
  }
  
  fullPrompt += `\n\n## USER REQUEST:\n${prompt}`;

  try {
    let text: string;
    
    switch (provider.type) {
      case 'gemini':
        text = await callGemini(fullPrompt, provider.apiKey);
        break;
      case 'groq':
      case 'deepseek':
      case 'openrouter':
        text = await callOpenAICompatible(fullPrompt, provider.apiKey, provider.type);
        break;
      case 'huggingface':
        text = await callHuggingFace(fullPrompt, provider.apiKey);
        break;
      default:
        text = await callGemini(fullPrompt, provider.apiKey);
    }

    // Clean and parse JSON
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
    throw new Error(e.message || 'AI request failed');
  }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export async function generateFullProject(description: string): Promise<AIResponse> {
  return chatWithGemini(`Create a COMPLETE React Native Expo project for: ${description}

Include ALL of these:
- app/_layout.tsx (navigation)
- app/index.tsx (main screen)
- Multiple screens in app/(tabs)/ or app/screens/
- src/components/ (reusable UI components)
- src/hooks/ (custom hooks)
- src/services/api.ts (API service)
- src/store/useStore.ts (Zustand state)
- src/utils/ (helpers)
- src/constants/theme.ts
- src/types/index.ts
- package.json with ALL dependencies
- app.json configured
- .github/workflows/build.yml for CI/CD

Make it PRODUCTION READY with proper error handling!`);
}

export async function autoFixBuildError(errorLogs: string): Promise<AIResponse> {
  return chatWithGemini('Analyze and fix this build error. Return complete fixed files.', { errorLogs });
}

export async function addNativeModule(moduleType: string, projectFiles: Record<string, string>): Promise<AIResponse> {
  return chatWithGemini(`Add ${moduleType} native module to this project. Update necessary files including app.json, package.json, and create any required native code.`, { existingFiles: projectFiles });
}
