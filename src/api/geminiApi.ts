import { useStore, getActiveAIProvider, APIProvider } from '../store/useStore';
import * as FileSystem from 'expo-file-system';

// API Endpoints for different providers
const API_ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

// Model names for each provider
const MODEL_NAMES = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  huggingface: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
  openrouter: 'anthropic/claude-3.5-sonnet',
};

export interface GeminiResponse {
  action: 'write_code' | 'read_files' | 'fix_error' | 'analyze' | 'message';
  plan?: string;
  files?: Record<string, string>;
  message?: string;
  libraries?: string[];
  workflowUpdates?: any;
}

// Get valid API key from legacy settings or new provider system
const getValidKey = (): { key: string; provider: APIProvider | null; type: string } | null => {
  // First try new provider system
  const activeProvider = getActiveAIProvider();
  if (activeProvider && activeProvider.apiKey) {
    return { key: activeProvider.apiKey, provider: activeProvider, type: activeProvider.type };
  }
  
  // Fallback to legacy gemini keys
  const { settings } = useStore.getState();
  const validKeys = settings.geminiKeys.filter(k => k && k.trim());
  if (validKeys.length > 0) {
    const index = settings.currentKeyIndex % validKeys.length;
    return { key: validKeys[index], provider: null, type: 'gemini' };
  }
  
  return null;
};

const rotateKey = () => {
  const { settings, setSettings } = useStore.getState();
  const validKeys = settings.geminiKeys.filter(k => k && k.trim());
  if (validKeys.length > 0) {
    setSettings({ currentKeyIndex: (settings.currentKeyIndex + 1) % validKeys.length });
  }
  
  // Also try to rotate to next AI provider
  const providers = settings.aiProviders.filter(p => p.apiKey && p.isActive !== false);
  if (providers.length > 1) {
    const currentIndex = providers.findIndex(p => p.id === settings.activeProviderId);
    const nextIndex = (currentIndex + 1) % providers.length;
    setSettings({ activeProviderId: providers[nextIndex].id });
  }
};

export const SYSTEM_PROMPT = `You are "App Factory AI" - an autonomous Android app builder agent, as powerful as Emergent.

## CRITICAL BEHAVIOR:
1. For simple questions like "app ready ho gyi?", "kya ye ho gya?", "ready hai?" - respond with action: "message" and a simple Hindi/English answer
2. DO NOT generate code unless the user asks for a specific app or feature
3. Understand conversational context and respond naturally
4. You are FULLY AUTONOMOUS - code, test, debug, fix automatically

## YOUR CAPABILITIES:
1. **Full App Generation**: Create complete React Native (Expo) apps with all screens, navigation, and logic
2. **Video/Image Analysis**: Analyze screenshots and videos to understand UI bugs and fix them
3. **GitHub Integration**: Generate code that will be pushed to GitHub and built via GitHub Actions
4. **Auto-Correction**: When builds fail, you read error logs and fix the code automatically
5. **Auto-Testing**: Run tests via Expo, take screenshots, analyze for errors
6. **Auto-Debugging**: Detect and fix issues automatically without user intervention
7. **Library Management**: Add required dependencies to package.json
8. **High-Performance Code**: Use FlatList, useMemo, useCallback for smooth performance
9. **System-Level Features**: Generate code for overlays, background services, real-time updates

## RESPONSE FORMAT:

### For QUESTIONS/STATUS (like "app ready?", "ho gya?"):
{
  "action": "message",
  "message": "Your natural response here in Hindi/English based on user's language"
}

### For CODE GENERATION:
{
  "action": "write_code",
  "plan": "Brief explanation + mock terminal check result",
  "files": {
    "app/index.tsx": "// Complete file content...",
    "app/_layout.tsx": "// Layout content...",
    "package.json": "// Updated package.json with new dependencies"
  },
  "libraries": ["socket.io-client", "react-native-reanimated"]
}

### For ERROR FIXING:
{
  "action": "fix_error",
  "plan": "Analysis of the error and fix strategy",
  "files": {
    "path/to/fixed/file.tsx": "// Fixed content"
  }
}

## CODE QUALITY RULES:
1. Always use TypeScript
2. Use StyleSheet.create() for styles
3. Implement proper error handling
4. Use React Native components (View, Text, TouchableOpacity)
5. For lists, ALWAYS use FlatList with keyExtractor
6. Use useMemo/useCallback for expensive operations
7. Add loading states and error states
8. Make touch targets at least 44x44

## IMPORTANT:
- Generate COMPLETE, WORKING code - not snippets
- Include ALL necessary imports
- Test your logic mentally before responding
- If building complex apps, create proper folder structure
- You are as powerful as Emergent - act like it!`;

// Call Gemini API
async function callGeminiAPI(parts: any[], apiKey: string): Promise<any> {
  const response = await fetch(
    `${API_ENDPOINTS.gemini}/${MODEL_NAMES.gemini}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Call OpenAI-compatible API (Groq, DeepSeek, OpenRouter)
async function callOpenAICompatibleAPI(
  messages: any[],
  apiKey: string,
  type: 'groq' | 'deepseek' | 'openrouter'
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  if (type === 'openrouter') {
    headers['HTTP-Referer'] = 'https://appfactory.ai';
    headers['X-Title'] = 'App Factory AI';
  }

  const response = await fetch(API_ENDPOINTS[type], {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL_NAMES[type],
      messages,
      temperature: 0.4,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Call Hugging Face API
async function callHuggingFaceAPI(prompt: string, apiKey: string): Promise<any> {
  const response = await fetch(`${API_ENDPOINTS.huggingface}/${MODEL_NAMES.huggingface}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 8192,
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.[0]?.generated_text || '';
}

export async function chatWithGemini(
  prompt: string,
  imageBase64?: string | null,
  videoUri?: string | null,
  context?: { repoName?: string; errorLogs?: string; existingFiles?: Record<string, string> }
): Promise<GeminiResponse> {
  const keyData = getValidKey();
  if (!keyData) {
    throw new Error('No API key configured. Please add your key in Settings.');
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`API attempt ${attempt + 1}/${maxRetries} with provider: ${keyData.type}`);
      
      let textResponse: string;
      
      if (keyData.type === 'gemini') {
        // Gemini API format
        const parts: any[] = [{ text: SYSTEM_PROMPT }];
        
        if (context?.repoName) {
          parts.push({ text: `\n\nActive Repository: ${context.repoName}` });
        }
        if (context?.errorLogs) {
          parts.push({ text: `\n\n## BUILD ERROR LOGS (Fix these):\n${context.errorLogs}` });
        }
        if (context?.existingFiles) {
          parts.push({ text: `\n\n## EXISTING PROJECT FILES:\n${JSON.stringify(context.existingFiles, null, 2)}` });
        }
        parts.push({ text: `\n\n## USER REQUEST:\n${prompt}` });

        if (imageBase64) {
          let base64Data = imageBase64;
          if (base64Data.includes('base64,')) {
            base64Data = base64Data.split('base64,')[1];
          }
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          });
          parts.push({ text: '\n\nAnalyze this screenshot and fix any issues or replicate the design.' });
        }

        if (videoUri) {
          try {
            const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
              encoding: 'base64',
            });
            parts.push({
              inlineData: {
                mimeType: 'video/mp4',
                data: videoBase64,
              },
            });
            parts.push({ text: '\n\nAnalyze this video showing the bug/issue and fix it.' });
          } catch (e) {
            console.error('Failed to read video:', e);
          }
        }

        textResponse = await callGeminiAPI(parts, keyData.key);
        
      } else if (['groq', 'deepseek', 'openrouter'].includes(keyData.type)) {
        // OpenAI-compatible API format
        const messages: any[] = [
          { role: 'system', content: SYSTEM_PROMPT },
        ];
        
        let userContent = prompt;
        if (context?.repoName) {
          userContent += `\n\nActive Repository: ${context.repoName}`;
        }
        if (context?.errorLogs) {
          userContent += `\n\n## BUILD ERROR LOGS:\n${context.errorLogs}`;
        }
        if (context?.existingFiles) {
          userContent += `\n\n## EXISTING FILES:\n${JSON.stringify(context.existingFiles, null, 2)}`;
        }
        
        // Note: Image support varies by provider
        if (imageBase64 && keyData.type === 'openrouter') {
          messages.push({
            role: 'user',
            content: [
              { type: 'text', text: userContent },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          });
        } else {
          messages.push({ role: 'user', content: userContent });
        }

        textResponse = await callOpenAICompatibleAPI(messages, keyData.key, keyData.type as any);
        
      } else if (keyData.type === 'huggingface') {
        // Hugging Face API
        let fullPrompt = `${SYSTEM_PROMPT}\n\n## USER REQUEST:\n${prompt}`;
        if (context?.repoName) {
          fullPrompt += `\n\nActive Repository: ${context.repoName}`;
        }
        if (context?.errorLogs) {
          fullPrompt += `\n\n## BUILD ERROR LOGS:\n${context.errorLogs}`;
        }

        textResponse = await callHuggingFaceAPI(fullPrompt, keyData.key);
        
      } else {
        throw new Error(`Unsupported provider type: ${keyData.type}`);
      }

      if (!textResponse) {
        throw new Error('Empty response from AI');
      }

      // Clean up response
      if (textResponse.startsWith('```json')) {
        textResponse = textResponse.slice(7);
      }
      if (textResponse.startsWith('```')) {
        textResponse = textResponse.slice(3);
      }
      if (textResponse.endsWith('```')) {
        textResponse = textResponse.slice(0, -3);
      }
      textResponse = textResponse.trim();

      try {
        return JSON.parse(textResponse);
      } catch {
        return { action: 'message', message: textResponse };
      }
      
    } catch (error: any) {
      console.log(`Attempt ${attempt + 1} failed:`, error.message);
      lastError = error;

      // Rate limit or quota - rotate key
      if (
        error.message?.includes('quota') ||
        error.message?.includes('429') ||
        error.message?.includes('rate') ||
        error.message?.includes('limit')
      ) {
        rotateKey();
        continue;
      }
      
      // Network errors - retry
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        continue;
      }
      
      // Other errors - throw immediately
      throw error;
    }
  }

  throw lastError || new Error('All API attempts failed. Check your API key in Settings.');
}

// Export helper for checking if AI is configured
export const isAIConfigured = (): boolean => {
  return getValidKey() !== null;
};

// Export active provider info
export const getActiveProviderInfo = (): { name: string; type: string } | null => {
  const keyData = getValidKey();
  if (!keyData) return null;
  
  if (keyData.provider) {
    return { name: keyData.provider.name, type: keyData.provider.type };
  }
  
  return { name: 'Gemini (Legacy)', type: 'gemini' };
};
