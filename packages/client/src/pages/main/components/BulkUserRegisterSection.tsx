import { memo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  type BulkRegisterResult,
  type BulkRegisterUserInput,
} from '../../../api';

const CSV_TEMPLATE =
  'email,name,phone,jobTitle,departmentName,companyName\n' +
  'hong@emax.com,홍길동,010-1234-5678,대리,개발부서,이맥스\n';

const FAIL_REASON_LABEL: Record<string, string> = {
  INVALID_EMAIL: '이메일 형식 오류',
  NAME_REQUIRED: '이름 필수',
  PASSWORD_REQUIRED: '비밀번호 필요',
  DUPLICATE_IN_BATCH: '배치 내 중복 이메일',
  EMAIL_EXISTS: '이미 등록된 이메일',
  COMPANY_AND_DEPARTMENT_REQUIRED: '회사·부서 둘 다 필요',
  CREATE_FAILED: '생성 실패',
};

type FormRow = {
  key: string;
  email: string;
  name: string;
  phone: string;
  jobTitle: string;
  companyName: string;
  departmentName: string;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): FormRow {
  return {
    key: newKey(),
    email: '',
    name: '',
    phone: '',
    jobTitle: '',
    companyName: '이맥스',
    departmentName: '',
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseUsersCsv(text: string): FormRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV에 헤더와 데이터 행이 필요합니다.');
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const emailI = idx('email');
  const nameI = idx('name');
  if (emailI < 0 || nameI < 0) {
    throw new Error('CSV 헤더에 email, name 컬럼이 필요합니다.');
  }

  const phoneI = idx('phone');
  const jobI = idx('jobtitle');
  const deptI = idx('departmentname');
  const companyI = idx('companyname');

  const rows: FormRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = cols[emailI] ?? '';
    const name = cols[nameI] ?? '';
    if (!email && !name) continue;
    rows.push({
      key: newKey(),
      email,
      name,
      phone: phoneI >= 0 ? (cols[phoneI] ?? '') : '',
      jobTitle: jobI >= 0 ? (cols[jobI] ?? '') : '',
      departmentName: deptI >= 0 ? (cols[deptI] ?? '') : '',
      companyName: companyI >= 0 ? (cols[companyI] ?? '') : '이맥스',
    });
  }
  if (rows.length === 0) {
    throw new Error('유효한 사용자 행이 없습니다.');
  }
  return rows;
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'users-bulk-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type BulkUserRegisterSectionProps = {
  isDark: boolean;
};

function BulkUserRegisterSection({ isDark }: BulkUserRegisterSectionProps) {
  const queryClient = useQueryClient();
  const [defaultPassword, setDefaultPassword] = useState('123456');
  const [rows, setRows] = useState<FormRow[]>(() => [emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkRegisterResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const border = isDark ? '#475569' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#e2e8f0' : '#334155';

  const inputStyle = {
    width: '100%',
    padding: '7px 8px',
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: isDark ? '#1e293b' : '#fff',
    color: text,
    fontSize: 13,
    boxSizing: 'border-box' as const,
  };

  const updateRow = (key: string, field: keyof FormRow, value: string) => {
    setResult(null);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setResult(null);
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (key: string) => {
    setResult(null);
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.key !== key)));
  };

  const onPickCsv = async (file: File) => {
    setCsvError(null);
    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseUsersCsv(text);
      setRows(parsed);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'CSV 파싱 실패');
    }
  };

  const toUsers = (): BulkRegisterUserInput[] =>
    rows
      .map((r) => ({
        email: r.email.trim(),
        name: r.name.trim(),
        phone: r.phone.trim() || undefined,
        jobTitle: r.jobTitle.trim() || undefined,
        companyName: r.companyName.trim() || undefined,
        departmentName: r.departmentName.trim() || undefined,
      }))
      .filter((u) => u.email || u.name);

  const onSubmit = async () => {
    const users = toUsers();
    if (users.length === 0) {
      alert('등록할 사용자를 입력해 주세요.');
      return;
    }
    if (!defaultPassword.trim() || defaultPassword.trim().length < 4) {
      alert('기본 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await usersApi.bulkRegister({
        defaultPassword: defaultPassword.trim(),
        users,
      });
      setResult(res);
      if (res.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['org'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
      if (res.failed === 0) {
        setRows([emptyRow()]);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '일괄 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const filledCount = toUsers().length;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: isDark ? '#334155' : '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>
        사용자 일괄 등록
      </h4>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: muted }}>
        직접 입력하거나 CSV로 불러온 뒤 등록합니다. 회사·부서명이 없으면 자동 생성됩니다.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={downloadTemplate}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid ${border}`,
            background: 'transparent',
            color: text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          CSV 템플릿
        </button>
        <label
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: isDark ? '#475569' : '#e2e8f0',
            color: text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          CSV 불러오기
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickCsv(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {csvError && <div style={{ fontSize: 12, color: '#c62828' }}>{csvError}</div>}

      <div>
        <label style={{ display: 'block', fontSize: 12, color: muted, marginBottom: 4 }}>
          기본 비밀번호
        </label>
        <input
          type="text"
          value={defaultPassword}
          onChange={(e) => setDefaultPassword(e.target.value)}
          placeholder="등록 시 사용할 초기 비밀번호"
          style={{ ...inputStyle, maxWidth: 280 }}
        />
      </div>

      <div
        style={{
          overflow: 'auto',
          borderRadius: 8,
          border: `1px solid ${border}`,
          maxHeight: 320,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
          <thead>
            <tr style={{ background: isDark ? '#1e293b' : '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>이메일 *</th>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>이름 *</th>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>연락처</th>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>직급</th>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>회사</th>
              <th style={{ padding: '8px 6px', color: muted, fontWeight: 600 }}>부서</th>
              <th style={{ padding: '8px 6px', width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} style={{ borderTop: `1px solid ${border}` }}>
                {(
                  [
                    ['email', 'email'],
                    ['name', '이름'],
                    ['phone', '010-'],
                    ['jobTitle', '대리'],
                    ['companyName', '이맥스'],
                    ['departmentName', '개발부서'],
                  ] as const
                ).map(([field, placeholder]) => (
                  <td key={field} style={{ padding: 4 }}>
                    <input
                      type="text"
                      value={row[field]}
                      placeholder={placeholder}
                      onChange={(e) => updateRow(row.key, field, e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                ))}
                <td style={{ padding: 4, textAlign: 'center' }}>
                  <button
                    type="button"
                    title="행 삭제"
                    onClick={() => removeRow(row.key)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: muted,
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid ${border}`,
            background: 'transparent',
            color: text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + 행 추가
        </button>
        <button
          type="button"
          className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-brand-light to-brand-dark text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
          disabled={submitting || filledCount === 0}
          onClick={() => void onSubmit()}
        >
          {submitting ? '등록 중...' : `${filledCount}명 등록`}
        </button>
      </div>

      {result && (
        <div style={{ fontSize: 13, color: text }}>
          <div style={{ marginBottom: 6 }}>
            성공 {result.created}명 · 실패 {result.failed}명
          </div>
          {result.errors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: muted }}>
              {result.errors.map((e) => (
                <li key={`${e.row}-${e.email}`}>
                  행 {e.row} ({e.email || '—'}): {FAIL_REASON_LABEL[e.reason] || e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(BulkUserRegisterSection);
