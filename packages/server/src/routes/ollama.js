import { Router } from 'express';
import { authMiddleware } from '../auth.js';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

export const ollamaRouter = Router();
ollamaRouter.use(authMiddleware);

/** Ollama chat API 프록시 - CORS/연결 문제 방지 */
ollamaRouter.post('/chat', async (req, res) => {
  try {
    if (!OLLAMA_BASE) {
      return res.status(503).json({ error: 'OLLAMA_BASE_URL가 설정되지 않았습니다. 서버 .env에 설정하세요.' });
    }
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 배열이 필요합니다' });
    }

    const systemPrompt = { role: 'system', content: '항상 한국어로만 답변하세요. 모든 응답은 반드시 한국어로 작성합니다.' };
    const messagesWithSystem = [systemPrompt, ...messages];

    const url = `${OLLAMA_BASE}/api/chat`;
    console.log('[Ollama] 요청:', url, '모델:', OLLAMA_MODEL);
    const prox = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: messagesWithSystem, stream: false }),
    });

    const data = await prox.json().catch(() => ({}));
    if (!prox.ok) {
      const errMsg = data?.error || `Ollama 오류 (${prox.status})`;
      console.error('Ollama API error:', prox.status, errMsg);
      return res.status(prox.status >= 500 ? 502 : prox.status).json({
        error: prox.status === 500
          ? `Ollama 오류: ${errMsg}. 모델이 없으면 'ollama pull ${OLLAMA_MODEL}' 실행 후 다시 시도하세요.`
          : errMsg,
      });
    }
    return res.json(data);
  } catch (err) {
    console.error('Ollama proxy error:', err);
    const msg = err.cause?.code === 'ECONNREFUSED'
      ? `Ollama에 연결할 수 없습니다(${OLLAMA_BASE}). Ollama가 실행 중인지 확인하세요.`
      : (err.message || 'Ollama 서버에 연결할 수 없습니다.');
    return res.status(502).json({ error: msg });
  }
});

/** 채팅 내용 요약 */
ollamaRouter.post('/summarize', async (req, res) => {
  try {
    if (!OLLAMA_BASE) {
      return res.status(503).json({ error: 'OLLAMA_BASE_URL가 설정되지 않았습니다.' });
    }
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text가 필요합니다' });
    }

    const systemPrompt = { role: 'system', content: '항상 한국어로만 답변하세요. 채팅 내용을 간결하게 요약해주세요.' };
    const userPrompt = { role: 'user', content: `다음 채팅 내용을 짧게 요약해주세요:\n\n${text.slice(0, 16000)}` };

    const url = `${OLLAMA_BASE}/api/chat`;
    const prox = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: [systemPrompt, userPrompt], stream: false }),
    });

    const data = await prox.json().catch(() => ({}));
    if (!prox.ok) {
      const errMsg = data?.error || `Ollama 오류 (${prox.status})`;
      return res.status(prox.status >= 500 ? 502 : prox.status).json({ error: errMsg });
    }
    return res.json({ summary: data.message?.content ?? '' });
  } catch (err) {
    console.error('Ollama summarize error:', err);
    const msg = err.cause?.code === 'ECONNREFUSED'
      ? `Ollama에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요.`
      : (err.message || '요약 중 오류가 발생했습니다.');
    return res.status(502).json({ error: msg });
  }
});
