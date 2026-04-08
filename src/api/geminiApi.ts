import { useStore, getActiveAIProvider, APIProvider } from '../store/useStore';

// API Endpoints
const API_ENDPOINTS: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

// Model names
const MODEL_NAMES: Record<string, string> = {
  gemini: 'gemini-1.5-flash',
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
}

// Get valid key
const getValidKey = (): { key: string; type: string } | null => {
  const activeProvider = getActiveAIProvider();
  if (activeProvider?.apiKey) {
    return { key: activeProvider.apiKey, type: activeProvider.type };
  }
  
  const { settings } = useStore.getState();
  const validKeys = settings.geminiKeys.filter((k) => k && k.trim());
  if (validKeys.length > 0) {
    return { key: validKeys[settings.currentKeyIndex % validKeys.length], type: 'gemini' };
  }
  
  return null;
};

export const isAIConfigured = (): boolean => {
  return getValidKey() !== null;
};

export const getActiveProviderInfo = (): { name: string; type: string } | null => {
  const keyData = getValidKey();
  if (!keyData) return null;
  
  const activeProvider = getActiveAIProvider();
  if (activeProvider) {
    return { name: activeProvider.name, type: activeProvider.type };
  }
  
  return { name: 'Gemini', type: 'gemini' };
};

const SYSTEM_PROMPT = `You are "App Factory AI" - an autonomous Android app builder agent.

## RESPONSE FORMAT (JSON):

### For QUESTIONS/STATUS:
{"action": "message", "message": "Your response"}

### For CODE GENERATION:
{
  "action": "write_code",
  "plan": "Brief explanation",
  "files": {
    "app/index.tsx": "// Complete file content...",
    "package.json": "// Updated package.json"
  },
  "libraries": ["package-name"]
}

## IMPORTANT:
- Generate COMPLETE, WORKING TypeScript/React Native code
- Include ALL imports
- Use StyleSheet.create() for styles
- For lists, ALWAYS use FlatList
- Add proper error handling`;

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

  try {
    let textResponse: string;

    if (keyData.type === 'gemini') {
      // Gemini API
      const parts: any[] = [{ text: SYSTEM_PROMPT }];
      
      if (context?.repoName) {
        parts.push({ text: `\n\nActive Repository: ${context.repoName}` });
      }
      if (context?.errorLogs) {
        parts.push({ text: `\n\n## BUILD ERROR LOGS:\n${context.errorLogs}` });
      }
      parts.push({ text: `\n\n## USER REQUEST:\n${prompt}` });

      if (imageBase64) {
        let base64Data = imageBase64;
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: base64Data },
        });
      }

      const response = await fetch(
        `${API_ENDPOINTS.gemini}/${MODEL_NAMES.gemini}:generateContent?key=${keyData.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // OpenAI-compatible APIs (Groq, DeepSeek, OpenRouter)
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${prompt}${context?.repoName ? `\n\nRepo: ${context.repoName}` : ''}` },
      ];

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keyData.key}`,
      };

      if (keyData.type === 'openrouter') {
        headers['HTTP-Referer'] = 'https://appfactory.ai';
      }

      const response = await fetch(API_ENDPOINTS[keyData.type], {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: MODEL_NAMES[keyData.type],
          messages,
          temperature: 0.4,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      textResponse = data?.choices?.[0]?.message?.content || '';
    }

    if (!textResponse) {
      throw new Error('Empty response from AI');
    }

    // Clean up response
    textResponse = textResponse.trim();
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
    console.error('API Error:', error);
    throw error;
  }
}
