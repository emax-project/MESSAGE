import { useEffect, useState } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

type UseUpdateManagerParams = {
  hasElectron: boolean;
  activePanel: 'none' | 'mention' | 'bookmark' | 'rooms' | 'schedule' | 'ai' | 'settings';
};

export function useUpdateManager({ hasElectron, activePanel }: UseUpdateManagerParams) {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // 앱 버전 조회 (Electron 패키징된 앱)
  useEffect(() => {
    if (hasElectron && activePanel === 'settings') {
      window.electronAPI?.getAppVersion?.().then((v) => setAppVersion(v)).catch(() => {});
    }
  }, [hasElectron, activePanel]);

  // 업데이트 다운로드 완료 시 "지금 재시작" 버튼 표시
  useEffect(() => {
    if (!hasElectron || !window.electronAPI?.onUpdateDownloaded) return;
    const unsub = window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('ready'));
    return unsub;
  }, [hasElectron]);

  const handleCheckForUpdates = async () => {
    if (!hasElectron || !window.electronAPI?.checkForUpdates) return;
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const r = await window.electronAPI.checkForUpdates();
      if (!r.success) {
        setUpdateStatus('error');
        setUpdateError(r.error || '업데이트 확인에 실패했습니다.');
        return;
      }
      if (r.hasUpdate && r.version) {
        setUpdateStatus('downloading');
        setUpdateVersion(r.version);
        setAppVersion(r.currentVersion ?? appVersion);
      } else {
        setUpdateStatus('latest');
        setAppVersion(r.currentVersion ?? appVersion);
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError((err as Error)?.message || '업데이트 확인에 실패했습니다.');
    }
  };

  const handleQuitAndInstall = () => {
    window.electronAPI?.quitAndInstall?.();
  };

  return {
    appVersion,
    updateStatus,
    updateVersion,
    updateError,
    handleCheckForUpdates,
    handleQuitAndInstall,
  };
}
