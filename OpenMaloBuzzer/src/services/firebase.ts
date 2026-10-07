import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
} from '@react-native-firebase/firestore';
import {COLLECTIONS} from '../constants';
import {User, Buzz, Reason, BuzzResponse} from '../types';

const db = getFirestore();

// ─── Users ───────────────────────────────────────────────
export const getUsers = () =>
  getDocs(
    query(collection(db, COLLECTIONS.USERS), where('is_active', '==', true)),
  ).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()} as User)));

export const getUserByPhone = async (phone: string): Promise<User | null> => {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.USERS),
      where('phone', '==', phone),
      firestoreLimit(1),
    ),
  );
  if (snap.empty) return null;
  const user = {id: snap.docs[0].id, ...snap.docs[0].data()} as User;
  return user.is_active ? user : null;
};

export const updateFcmToken = (userId: string, token: string) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), {fcm_token: token});

export const updateLastSeen = (userId: string) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), {last_seen_at: Date.now()});

export const addUser = (user: Omit<User, 'id'>) =>
  addDoc(collection(db, COLLECTIONS.USERS), user);

export const removeUser = (userId: string) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), {is_active: false});

export const resetUserPin = (userId: string, pinHash: string) =>
  updateDoc(doc(db, COLLECTIONS.USERS, userId), {pin_hash: pinHash});

export const subscribeToUsers = (callback: (users: User[]) => void) =>
  onSnapshot(
    query(collection(db, COLLECTIONS.USERS), where('is_active', '==', true)),
    snap => {
      if (!snap) return;
      callback(snap.docs.map(d => ({id: d.id, ...d.data()} as User)));
    },
    err => console.warn('subscribeToUsers error:', err),
  );

// ─── Buzzes ──────────────────────────────────────────────
export const createBuzz = (buzz: Omit<Buzz, 'id'>) =>
  addDoc(collection(db, COLLECTIONS.BUZZES), buzz);

export const respondToBuzz = (buzzId: string, response: BuzzResponse) =>
  updateDoc(doc(db, COLLECTIONS.BUZZES, buzzId), {
    response,
    responded_at: Date.now(),
  });

export const markEscalated = (buzzId: string) =>
  updateDoc(doc(db, COLLECTIONS.BUZZES, buzzId), {escalated: true});

export const subscribeToBuzz = (buzzId: string, callback: (buzz: Buzz) => void) =>
  onSnapshot(
    doc(db, COLLECTIONS.BUZZES, buzzId),
    snap => {
      if (!snap || !snap.exists()) return;
      callback({id: snap.id, ...snap.data()} as Buzz);
    },
    err => console.warn('subscribeToBuzz error:', err),
  );

export const getRecentBuzzes = (userId: string, count = 20) =>
  getDocs(
    query(
      collection(db, COLLECTIONS.BUZZES),
      where('from_user_id', '==', userId),
      orderBy('created_at', 'desc'),
      firestoreLimit(count),
    ),
  ).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()} as Buzz)));

export const getBuzzLog = (days = 7) => {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return getDocs(
    query(
      collection(db, COLLECTIONS.BUZZES),
      where('created_at', '>=', since),
      orderBy('created_at', 'desc'),
    ),
  ).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()} as Buzz)));
};

// ─── Reasons ─────────────────────────────────────────────
export const getReasons = () =>
  getDocs(
    query(
      collection(db, COLLECTIONS.REASONS),
      where('is_active', '==', true),
      orderBy('sort_order'),
    ),
  ).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()} as Reason)));

export const subscribeToReasons = (callback: (reasons: Reason[]) => void) =>
  onSnapshot(
    query(
      collection(db, COLLECTIONS.REASONS),
      where('is_active', '==', true),
      orderBy('sort_order'),
    ),
    snap => {
      if (!snap) return;
      callback(snap.docs.map(d => ({id: d.id, ...d.data()} as Reason)));
    },
    err => console.warn('subscribeToReasons error:', err),
  );

export const addReason = (label: string, sortOrder: number) =>
  addDoc(collection(db, COLLECTIONS.REASONS), {
    label,
    sort_order: sortOrder,
    is_active: true,
  });

export const removeReason = (reasonId: string) =>
  updateDoc(doc(db, COLLECTIONS.REASONS, reasonId), {is_active: false});

// ─── Incoming Buzz Listener ──────────────────────────────
export const subscribeToIncomingBuzzes = (
  userId: string,
  callback: (buzz: Buzz) => void,
) => {
  const seenIds = new Set<string>();
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.BUZZES),
      where('to_user_id', '==', userId),
      where('response', '==', 'none'),
    ),
    snap => {
      if (!snap) return;
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          const buzz = {id: d.id, ...d.data()} as Buzz;
          // Only alert for buzzes created in the last 2 minutes
          if (Date.now() - buzz.created_at < 120000) {
            callback(buzz);
          }
        }
      });
    },
    err => console.warn('subscribeToIncomingBuzzes error:', err),
  );
};

// ─── FCM ─────────────────────────────────────────────────
export const requestFcmPermission = async () => {
  try {
    const {getMessaging, requestPermission} = require('@react-native-firebase/messaging');
    const messaging = getMessaging();
    const status = await requestPermission(messaging);
    return status === 1 || status === 2;
  } catch {
    return false;
  }
};

export const getFcmToken = async () => {
  const {getMessaging, getToken} = require('@react-native-firebase/messaging');
  const messaging = getMessaging();
  return getToken(messaging);
};
