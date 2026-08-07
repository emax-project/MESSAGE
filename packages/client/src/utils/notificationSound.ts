const NOTIFICATION_SOUND_SRC = `${import.meta.env.BASE_URL}sounds/notification.mp3`;

const STORAGE_KEY = 'notificationSoundEnabled';

let audio: HTMLAudioElement | null = null;

export function isNotificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function playNotificationSound(force = false): void {
  if (!force && !isNotificationSoundEnabled()) return;
  if (typeof window === 'undefined') return;

  try {
    if (!audio) {
      audio = new Audio(NOTIFICATION_SOUND_SRC);
      audio.preload = 'auto';
    }
    audio.currentTime = 0;
    audio.volume = 0.65;
    void audio.play().catch(() => {});
  } catch {
    // ignore
  }
}
