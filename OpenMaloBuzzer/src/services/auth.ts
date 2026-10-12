import AsyncStorage from '@react-native-async-storage/async-storage';
import {User} from '../types';
import {getUserByPhone, addUser, removeUser, updateFcmToken, updateUserProfile, resetUserPin} from './firebase';

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
  const user = await getUserByPhone(phone);
  if (!user) throw new Error('No account found with this phone number');
  if (user.pin_hash !== hashPin(pin)) throw new Error('Incorrect PIN');

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

export const signup = async (
  name: string,
  phone: string,
  pin: string,
  role: 'manager' | 'member' = 'member',
): Promise<User> => {
  const existing = await getUserByPhone(phone);
  if (existing) throw new Error('Phone number already registered');

  const userData: Omit<User, 'id'> = {
    name: name.trim(),
    phone,
    pin_hash: hashPin(pin),
    role,
    fcm_token: '',
    last_seen_at: Date.now(),
    is_active: true,
  };

  const docRef = await addUser(userData);
  const user: User = {id: docRef.id, ...userData};
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));

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

export const deleteAccount = async (userId: string): Promise<void> => {
  await removeUser(userId);
  await AsyncStorage.removeItem(AUTH_KEY);
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

export const updateProfile = async (
  user: User,
  data: {name?: string; phone?: string},
): Promise<User> => {
  if (data.phone && data.phone !== user.phone) {
    const existing = await getUserByPhone(data.phone);
    if (existing) throw new Error('Phone number already in use');
  }
  await updateUserProfile(user.id, data);
  const updated = {...user, ...data};
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  return updated;
};

export const changePin = async (
  user: User,
  currentPin: string,
  newPin: string,
): Promise<void> => {
  if (user.pin_hash !== hashPin(currentPin)) {
    throw new Error('Current PIN is incorrect');
  }
  const newHash = hashPin(newPin);
  await resetUserPin(user.id, newHash);
  const updated = {...user, pin_hash: newHash};
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
};
