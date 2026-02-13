/**
 * Ollama API 클라이언트
 * 백엔드 프록시(/ollama/chat) 사용
 */

import { api, BASE } from './api';

const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b';

export type OllamaMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function ollamaChat(messages: OllamaMessage[]): Promise<string> {
  try {
    const data = (await api.post('/ollama/chat', { messages })) as { message?: { content?: string } };
    return data.message?.content ?? '';
  } catch (e) {
    const err = e as Error;
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      const url = BASE || 'http://192.168.0.204:3001';
      throw new Error(
        `서버(${url})에 연결할 수 없습니다. ` +
        `브라우저에서 ${url}/health 를 열어 연결 가능한지 확인하세요.`
      );
    }
    throw e;
  }
}

export function getOllamaConfig(): { base: string; model: string } {
  return { base: 'api', model: OLLAMA_MODEL };
}

/** 채팅 내용 요약 */
export async function ollamaSummarize(text: string): Promise<string> {
  const data = (await api.post('/ollama/summarize', { text })) as { summary?: string };
  return data.summary ?? '';
}
