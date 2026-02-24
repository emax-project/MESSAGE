/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    platform: string;
    notifyAppReady: () => void;
    sendDebugLog: (payload: unknown) => void;
    openSecondWindow: () => Promise<void>;
    openChatWindow: (roomId: string) => Promise<void>;
    openKanbanWindow: (roomId: string) => Promise<void>;
    openGanttWindow: (roomId: string) => Promise<void>;
    showNotification: (title: string, body: string, roomId?: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    windowClose: () => Promise<void>;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowResize: (width: number, height: number) => Promise<void>;
    onLogout: (handler: () => void) => () => void;
    onNavigateToRoom: (handler: (roomId: string) => void) => () => void;
  };
}
