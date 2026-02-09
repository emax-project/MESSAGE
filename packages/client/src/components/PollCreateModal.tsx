import { useState } from 'react';
import { useThemeStore } from '../store';

type Props = {
  onClose: () => void;
  onCreate: (question: string, options: string[], isMultiple: boolean) => void;
};

export default function PollCreateModal({ onClose, onCreate }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultiple, setIsMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  };

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const bg = isDark ? '#1e293b' : '#fff';
  const textColor = isDark ? '#e2e8f0' : '#333';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const borderColor = isDark ? '#475569' : '#e5e7eb';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: bg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600, color: textColor }}>투표 만들기</h4>
        <input
          type="text"
          placeholder="질문을 입력하세요"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: 'border-box', background: inputBg, color: textColor }}
        />
        <div style={{ marginBottom: 10 }}>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <input
                type="text"
                placeholder={`선택지 ${idx + 1}`}
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                style={{ flex: 1, padding: '8px 10px', border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 13, background: inputBg, color: textColor }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(idx)} style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button type="button" onClick={addOption} style={{ border: `1px dashed ${borderColor}`, background: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: isDark ? '#94a3b8' : '#666', cursor: 'pointer', width: '100%', marginBottom: 12 }}>
            + 선택지 추가
          </button>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textColor, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={isMultiple} onChange={(e) => setIsMultiple(e.target.checked)} />
          복수 선택 허용
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              const filtered = options.filter((o) => o.trim());
              if (filtered.length >= 2 && question.trim()) {
                onCreate(question.trim(), filtered.map((o) => o.trim()), isMultiple);
              }
            }}
            style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5 }}
          >
            만들기
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px', border: `1px solid ${borderColor}`, borderRadius: 8, background: 'none', color: textColor, fontSize: 14, cursor: 'pointer' }}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
