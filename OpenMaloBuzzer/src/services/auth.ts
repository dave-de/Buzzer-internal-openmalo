import AsyncStorage from '@react-native-async-storage/async-storage';
import {User} from '../types';
import {getUserByPhone, updateFcmToken} from './firebase';

const AUTH_KEY = '@openmalo_user';

export const hashPin = (pin: string): string => {
  let hash = 0;
  const str = `openmalo_${pin}_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
};

export const login = async (phone: string, pin: string): Promise<User | null> => {
  console.log('Login: fetching user by phone...');
  const user = await getUserByPhone(phone);
  console.log('Login: user found:', !!user);
  if (!user) return null;
  if (user.pin_hash !== hashPin(pin)) return null;
  console.log('Login: PIN matched, saving...');

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  console.log('Login: saved to storage');

  // FCM token update - completely optional, don't block login
  setTimeout(async () => {
    try {
      const {getMessaging, getToken} = require('@react-native-firebase/messaging');
      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (token) await updateFcmToken(user.id, token);
    } catch {}
  }, 2000);

  return user;
};

export const getStoredUser = async (): Promise<User | null> => {
  const data = await AsyncStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
};

export const logout = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};

export const updateStoredUser = async (user: User) => {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
};
