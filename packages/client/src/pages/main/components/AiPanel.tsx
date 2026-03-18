import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { OllamaMessage } from '../../../ollama';

type AiPanelProps = {
  st: Record<string, CSSProperties>;
  isDark: boolean;
  panelWrapStyle: (maxWidth: number) => CSSProperties;
  modelName: string;
  aiMessages: OllamaMessage[];
  aiInput: string;
  aiLoading: boolean;
  setAiInput: (value: string) => void;
  onSubmitAi: () => void | Promise<void>;
  onResetAi: () => void;
};

function AiPanel({
  st,
  isDark,
  panelWrapStyle,
  modelName,
  aiMessages,
  aiInput,
  aiLoading,
  setAiInput,
  onSubmitAi,
  onResetAi,
}: AiPanelProps) {
  const aiMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiLoading]);

  return (
    <div style={panelWrapStyle(820)}>
      <div style={st.panelHeader}>
        <h3 style={st.panelTitle}>AI 채팅</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{modelName}</span>
          {aiMessages.length > 0 && (
            <button type="button" style={{ padding: '4px 10px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 6, background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', fontSize: 11, cursor: 'pointer' }} onClick={onResetAi}>
              대화 초기화
            </button>
          )}
        </div>
      </div>
      <div style={{ ...st.panelBody, display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          {aiMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: isDark ? '#64748b' : '#9ca3af', fontSize: 13 }}>
              <p style={{ margin: '0 0 8px' }}>Ollama와 대화를 시작하세요</p>
              <p style={{ margin: 0, fontSize: 12 }}>메시지를 입력하고 전송하세요</p>
            </div>
          )}
          {aiMessages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              style={{
                padding: '10px 14px',
                marginBottom: 8,
                borderRadius: 12,
                maxWidth: '90%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? (isDark ? '#475569' : '#e5e7eb') : (isDark ? '#334155' : '#f1f5f9'),
                color: isDark ? '#e2e8f0' : '#333',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {m.role === 'user' && <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', display: 'block', marginBottom: 4 }}>나</span>}
              {m.role === 'assistant' && <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', display: 'block', marginBottom: 4 }}>AI</span>}
              {m.content}
            </div>
          ))}
          {aiLoading && (
            <div style={{ padding: '10px 14px', marginBottom: 8, borderRadius: 12, maxWidth: '90%', alignSelf: 'flex-start', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
              <span style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>AI</span>
              <span>생각 중...</span>
            </div>
          )}
          <div ref={aiMessagesEndRef} />
        </div>
        <div style={{ flexShrink: 0, padding: 12, borderTop: `1px solid ${isDark ? '#334155' : '#e5e7eb'}` }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmitAi();
            }}
            style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
          >
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void onSubmitAi();
                }
              }}
              placeholder="메시지 입력..."
              rows={2}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                borderRadius: 10,
                fontSize: 14,
                background: isDark ? '#1e293b' : '#fff',
                color: isDark ? '#e2e8f0' : '#333',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button type="submit" disabled={aiLoading || !aiInput.trim()} style={{ ...st.formBtn, alignSelf: 'flex-end', padding: '10px 16px' }}>
              {aiLoading ? '대기...' : '전송'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default memo(AiPanel);
