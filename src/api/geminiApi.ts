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
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  gemini_backup: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-70B-Instruct',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

const MODELS: Record<string, string> = {
  groq: 'llama-3.1-8b-instant',  // Working! Fast & within free tier limits
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
// POWERFUL SYSTEM PROMPT - OPTIMIZED FOR TOKEN LIMITS
// ===========================================
const SYSTEM_PROMPT = `You are "App Factory AI" - autonomous Android app builder.

RESPONSE FORMAT (STRICT JSON):

For CODE:
{"action":"write_code","plan":"Brief plan","files":{"app/index.tsx":"// code","package.json":"{}"},"libraries":["zustand"]}

For ERRORS:
{"action":"fix_error","files":{"path/file.tsx":"// fixed"}}

For QUESTIONS:
{"action":"message","message":"Answer"}

RULES: TypeScript, StyleSheet.create(), FlatList, expo-router, Zustand, complete working code.`;

// ===========================================
// ERROR ANALYSIS PROMPT
// ===========================================
const ERROR_ANALYSIS_PROMPT = `Debug React Native error. Return JSON:
{"action":"fix_error","plan":"Cause and fix","files":{"path/file.tsx":"// Complete fixed file"}}`;

// ===========================================
// API CALL FUNCTIONS WITH RETRY & FALLBACK
// ===========================================

// Delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isRetryable = 
        e.message?.includes('high demand') ||
        e.message?.includes('overloaded') ||
        e.message?.includes('rate limit') ||
        e.message?.includes('503') ||
        e.message?.includes('429') ||
        e.message?.includes('temporarily');
      
      if (!isRetryable || i === maxRetries - 1) {
        throw e;
      }
      
      const waitTime = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
  
  throw lastError;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  // Try primary model first, then backup
  const models = [API_ENDPOINTS.gemini, API_ENDPOINTS.gemini_backup];
  let lastError: Error = new Error('Unknown error');
  
  for (const modelUrl of models) {
    try {
      return await retryWithBackoff(async () => {
        const url = `${modelUrl}?key=${apiKey}`;
        
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
          
          // Handle high demand / rate limit errors
          if (res.status === 429 || res.status === 503 || 
              errMsg.includes('high demand') || 
              errMsg.includes('overloaded') ||
              errMsg.includes('quota')) {
            throw new Error('Model high demand - retrying automatically...');
          }
          if (res.status === 404 || errMsg.includes('not found')) {
            throw new Error('Model not available. Trying backup...');
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
      }, 2, 2000); // 2 retries per model, 2 second delay
    } catch (e: any) {
      lastError = e;
      console.log(`Model failed: ${e.message}, trying backup...`);
      // Continue to backup model
    }
  }
  
  throw lastError;
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
// MAIN CHAT FUNCTION WITH AUTO-FALLBACK
// ===========================================

export async function chatWithGemini(
  prompt: string,
  context?: {
    errorLogs?: string;
    existingFiles?: Record<string, string>;
    chatHistory?: Array<{ role: string; content: string }>;
    hasPendingFiles?: boolean;
  }
): Promise<AIResponse> {
  const state = useStore.getState();
  const allProviders = state.aiProviders;
  const activeProvider = getActiveAIProvider();
  
  if (!activeProvider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  let fullPrompt = SYSTEM_PROMPT;
  
  if (context?.errorLogs) {
    fullPrompt += `\n\n${ERROR_ANALYSIS_PROMPT}\n\n## BUILD ERROR LOGS:\n\`\`\`\n${context.errorLogs}\n\`\`\``;
  }
  
  if (context?.existingFiles) {
    fullPrompt += `\n\n## EXISTING PROJECT FILES:\n${JSON.stringify(Object.keys(context.existingFiles), null, 2)}`;
  }

  // Add conversation history for context
  if (context?.chatHistory && context.chatHistory.length > 0) {
    // Keep last 10 messages for context
    const recentHistory = context.chatHistory.slice(-10);
    fullPrompt += `\n\n## CONVERSATION HISTORY (maintain context, understand follow-up questions):\n`;
    for (const msg of recentHistory) {
      fullPrompt += `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content.slice(0, 500)}\n`;
    }
  }

  // Tell AI about current state
  if (context?.hasPendingFiles) {
    fullPrompt += `\n\n## CURRENT STATE: User has already generated code files. They are asking a FOLLOW-UP question about those files. Understand their intent - they might want to: push to GitHub, test, modify code, add features, or debug. Do NOT start fresh. Respond in context of what was already built.`;
  }
  
  fullPrompt += `\n\n## USER REQUEST:\n${prompt}`;

  // Try with active provider first, then fallback to others
  const providersToTry = [activeProvider, ...allProviders.filter(p => p.id !== activeProvider.id)];
  let lastError: Error = new Error('No providers available');

  for (const provider of providersToTry) {
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
      lastError = e;
      console.log(`Provider ${provider.type} failed: ${e.message}, trying next...`);
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(`Sabhi AI providers fail ho gaye. Last error: ${lastError.message}\n\nSuggestion: Settings mein ek aur AI provider add karo (Groq ya DeepSeek free hai).`);
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

/**
 * Generate project with real-time progress updates
 */
export async function generateProjectWithProgress(
  description: string,
  onProgress: (message: string, type: 'info' | 'file' | 'success' | 'error') => void,
  githubService?: any,
  repoFullName?: string
): Promise<AIResponse> {
  onProgress('AI project plan bana raha hai...', 'info');
  
  const result = await generateFullProject(description);
  
  if (result.action === 'write_code' && result.files) {
    const files = result.files;
    const fileList = Object.keys(files);
    const totalFiles = fileList.length;
    
    onProgress(`Plan ready! ${totalFiles} files generate hongi`, 'info');
    onProgress(`Libraries: ${result.libraries?.join(', ') || 'Standard'}`, 'info');
    
    // Process each file with progress
    let processedCount = 0;
    
    for (const filePath of fileList) {
      processedCount++;
      const progress = Math.round((processedCount / totalFiles) * 100);
      onProgress(`[${progress}%] Creating: ${filePath}`, 'file');
      
      // Small delay to show progress (simulates streaming)
      await new Promise(r => setTimeout(r, 100));
      
      // Push to GitHub if connected
      if (githubService && repoFullName) {
        try {
          onProgress(`[${progress}%] Pushing: ${filePath}`, 'info');
          await pushFileToGitHub(githubService, repoFullName, filePath, files[filePath]);
          onProgress(`[${progress}%] Pushed: ${filePath}`, 'success');
        } catch (e: any) {
          onProgress(`[${progress}%] Push failed: ${filePath} - ${e.message}`, 'error');
        }
      }
    }
    
    onProgress('All files generated successfully!', 'success');
  }
  
  return result;
}

/**
 * Push single file to GitHub
 */
async function pushFileToGitHub(
  githubService: any,
  repoFullName: string,
  filePath: string,
  content: string
): Promise<void> {
  try {
    // Get current ref
    const ref = await githubService.request(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = ref.object.sha;
    
    // Get base commit and tree
    const baseCommit = await githubService.request(`/repos/${repoFullName}/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha;
    
    // Create blob
    const blob = await githubService.request(`/repos/${repoFullName}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' }),
    });
    
    // Create tree with single file
    const newTree = await githubService.request(`/repos/${repoFullName}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
      }),
    });
    
    // Create commit
    const newCommit = await githubService.request(`/repos/${repoFullName}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `Add ${filePath}`,
        tree: newTree.sha,
        parents: [baseSha],
      }),
    });
    
    // Update ref
    await githubService.request(`/repos/${repoFullName}/git/refs/heads/main`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });
  } catch (e) {
    throw e;
  }
}

export async function autoFixBuildError(errorLogs: string): Promise<AIResponse> {
  return chatWithGemini('Analyze and fix this build error. Return complete fixed files.', { errorLogs });
}

export async function addNativeModule(moduleType: string, projectFiles: Record<string, string>): Promise<AIResponse> {
  return chatWithGemini(`Add ${moduleType} native module to this project. Update necessary files including app.json, package.json, and create any required native code.`, { existingFiles: projectFiles });
}

// ===========================================
// MEDIA ANALYSIS FOR DEBUGGING
// ===========================================

/**
 * Analyze screenshot for UI bugs/errors
 */
export async function analyzeScreenshot(
  base64Image: string,
  context?: string
): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  // Only Gemini supports vision natively
  if (provider.type !== 'gemini') {
    return {
      action: 'message',
      message: 'Screenshot analysis requires Gemini API. Please add a Gemini API key in Settings.',
    };
  }

  const url = `${API_ENDPOINTS.gemini}?key=${provider.apiKey}`;
  
  const prompt = `You are an expert React Native debugger. Analyze this screenshot and identify:
1. Any UI bugs or visual issues
2. Error messages visible on screen
3. Crash screens or error boundaries
4. Layout problems or broken UI
5. Performance indicators (loading states stuck, etc.)

${context ? `Additional context: ${context}` : ''}

Return JSON format:
{
  "action": "analyze",
  "issues": ["issue1", "issue2"],
  "severity": "high|medium|low",
  "message": "Detailed analysis and recommendations",
  "files": { "path/file.tsx": "// Fixed code if applicable" }
}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Vision API Error');
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { action: 'message', message: text };
      }
    }
    return { action: 'message', message: text };
  } catch (e: any) {
    throw new Error(e.message || 'Screenshot analysis failed');
  }
}

/**
 * Analyze video for bug reproduction
 */
export async function analyzeVideo(
  base64Video: string,
  mimeType: string = 'video/mp4',
  context?: string
): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  if (provider.type !== 'gemini') {
    return {
      action: 'message',
      message: 'Video analysis requires Gemini API. Please add a Gemini API key in Settings.',
    };
  }

  const url = `${API_ENDPOINTS.gemini}?key=${provider.apiKey}`;
  
  const prompt = `You are an expert React Native debugger. Analyze this video recording of app usage and identify:
1. Steps to reproduce any bugs shown
2. UI glitches or animation issues
3. Error screens or crashes
4. User flow problems
5. Performance issues (lag, freezes)

${context ? `Additional context: ${context}` : ''}

Return JSON format:
{
  "action": "analyze",
  "steps_to_reproduce": ["step1", "step2"],
  "issues": ["issue1", "issue2"],
  "severity": "high|medium|low",
  "message": "Detailed analysis with fix recommendations",
  "files": { "path/file.tsx": "// Fixed code if applicable" }
}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Video,
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Video API Error');
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { action: 'message', message: text };
      }
    }
    return { action: 'message', message: text };
  } catch (e: any) {
    throw new Error(e.message || 'Video analysis failed');
  }
}

/**
 * Transcribe and analyze voice message
 */
export async function analyzeVoice(
  base64Audio: string,
  mimeType: string = 'audio/mpeg',
  context?: string
): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  if (provider.type !== 'gemini') {
    return {
      action: 'message',
      message: 'Voice analysis requires Gemini API. Please add a Gemini API key in Settings.',
    };
  }

  const url = `${API_ENDPOINTS.gemini}?key=${provider.apiKey}`;
  
  const prompt = `You are App Factory AI. Listen to this voice message and understand what the user wants.

The user might be:
1. Describing an app they want to build
2. Explaining a bug or error
3. Asking for help with code
4. Requesting modifications to existing code

${context ? `Current context: ${context}` : ''}

First transcribe what they said, then respond appropriately.

Return JSON format:
{
  "action": "write_code" | "fix_error" | "message" | "analyze",
  "transcription": "What the user said",
  "message": "Your response",
  "files": { "path/file.tsx": "// Code if needed" }
}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio,
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Audio API Error');
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { action: 'message', message: text };
      }
    }
    return { action: 'message', message: text };
  } catch (e: any) {
    throw new Error(e.message || 'Voice analysis failed');
  }
}

/**
 * Multi-modal analysis - Screenshot + Description
 */
export async function analyzeWithMedia(
  prompt: string,
  media: { type: string; data: string; mimeType: string }
): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key configured. Add one in Settings.');
  }

  if (provider.type !== 'gemini') {
    // For non-Gemini providers, just use text
    return chatWithGemini(`${prompt}\n\n[User attached a ${media.type} file but vision is only available with Gemini]`);
  }

  const url = `${API_ENDPOINTS.gemini}?key=${provider.apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n## USER REQUEST (with attached ${media.type}):\n${prompt}` },
            {
              inline_data: {
                mime_type: media.mimeType,
                data: media.data,
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Vision API Error');
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { action: 'message', message: text };
      }
    }
    return { action: 'message', message: text };
  } catch (e: any) {
    throw new Error(e.message || 'Media analysis failed');
  }
}
