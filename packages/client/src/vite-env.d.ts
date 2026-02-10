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
    openSecondWindow: () => Promise<void>;
    openChatWindow: (roomId: string) => Promise<void>;
    showNotification: (title: string, body: string) => Promise<void>;
    windowClose: () => Promise<void>;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowResize: (width: number, height: number) => Promise<void>;
  };
}
