import { useStore, getActiveAIProvider } from '../store/useStore';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface AIResponse {
  action: 'write_code' | 'message';
  plan?: string;
  files?: Record<string, string>;
  message?: string;
  libraries?: string[];
}

export const isAIConfigured = (): boolean => {
  const state = useStore.getState();
  return state.aiProviders.length > 0;
};

export const getActiveProviderInfo = () => {
  const provider = getActiveAIProvider();
  return provider ? { name: provider.name, type: provider.type } : null;
};

const SYSTEM = `You are App Factory AI - an Android app builder.

RESPOND IN JSON:
For questions: {"action": "message", "message": "your answer"}
For code: {"action": "write_code", "plan": "brief", "files": {"path": "content"}, "libraries": []}

Rules:
- Generate complete TypeScript/React Native code
- Use StyleSheet.create for styles
- Include all imports`;

export async function chatWithGemini(prompt: string): Promise<AIResponse> {
  const provider = getActiveAIProvider();
  if (!provider) {
    throw new Error('No API key. Add one in Settings.');
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${provider.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM}\n\nUser: ${prompt}` }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'API Error');
    }

    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean JSON
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(text);
    } catch {
      return { action: 'message', message: text };
    }
  } catch (e: any) {
    throw new Error(e.message || 'Failed to connect to AI');
  }
}
