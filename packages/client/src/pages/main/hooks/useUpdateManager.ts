import { useEffect, useState } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

type UseUpdateManagerParams = {
  hasElectron: boolean;
  electronPlatform?: string;
  activePanel: 'none' | 'notifications' | 'memo' | 'rooms' | 'schedule' | 'ai' | 'settings';
  showToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
};

export function useUpdateManager({ hasElectron, electronPlatform, activePanel, showToast }: UseUpdateManagerParams) {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const requiresManualInstall = electronPlatform === 'darwin';

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
        setUpdateVersion(r.version);
        setAppVersion(r.currentVersion ?? appVersion);
        setUpdateStatus(r.downloaded ? 'ready' : 'downloading');
      } else {
        setUpdateStatus('latest');
        setAppVersion(r.currentVersion ?? appVersion);
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError((err as Error)?.message || '업데이트 확인에 실패했습니다.');
    }
  };

  const handleOpenUpdateDownload = async () => {
    if (!hasElectron || !window.electronAPI?.openUpdateDownload) return;
    await window.electronAPI.openUpdateDownload(updateVersion);
    showToast?.('브라우저에서 설치 파일 다운로드를 시작합니다.', 'info');
  };

  const handleQuitAndInstall = async () => {
    if (!hasElectron || !window.electronAPI?.quitAndInstall) return;
    if (requiresManualInstall) {
      await handleOpenUpdateDownload();
      showToast?.('DMG를 다운로드한 뒤 Applications 폴더에 EMAX를 다시 설치해 주세요.', 'info');
      return;
    }
    const result = await window.electronAPI.quitAndInstall();
    if (result?.requiresManualInstall || result?.success === false) {
      showToast?.(result?.error || '자동 설치에 실패했습니다. 설치 파일을 직접 받아 주세요.', 'error');
      await handleOpenUpdateDownload();
    }
  };

  return {
    appVersion,
    updateStatus,
    updateVersion,
    updateError,
    requiresManualInstall,
    handleCheckForUpdates,
    handleQuitAndInstall,
    handleOpenUpdateDownload,
  };
}
