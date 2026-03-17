import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = 'emax_api_url';
const LAST_EMAIL_KEY = 'emax_last_email';

export async function getStoredBaseUrl(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(API_URL_KEY);
    return v ?? '';
  } catch {
    return '';
  }
}

export async function setStoredBaseUrl(url: string): Promise<void> {
  try {
    if (url) {
      await AsyncStorage.setItem(API_URL_KEY, url.replace(/\/$/, ''));
    } else {
      await AsyncStorage.removeItem(API_URL_KEY);
    }
  } catch {
    // ignore
  }
}

export async function getLastEmail(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(LAST_EMAIL_KEY);
    return v ?? '';
  } catch {
    return '';
  }
}

export async function setLastEmail(email: string): Promise<void> {
  try {
    if (email) {
      await AsyncStorage.setItem(LAST_EMAIL_KEY, email);
    } else {
      await AsyncStorage.removeItem(LAST_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}

const ORG_FAVORITES_KEY = 'emax_org_favorites';

export async function getOrgFavorites(): Promise<string[]> {
  try {
    const v = await AsyncStorage.getItem(ORG_FAVORITES_KEY);
    if (!v) return [];
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function setOrgFavorites(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ORG_FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}
