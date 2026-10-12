import React, {useState, useEffect, useCallback, useRef} from 'react';
import {StatusBar, ActivityIndicator, View, StyleSheet, AppState, NativeModules, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from './src/hooks/useAuth';
import {createNotificationChannel, setupNotificationListeners, showBuzzNotification, cancelBuzzNotification} from './src/services/notification';
import {respondToBuzz, subscribeToIncomingBuzzes, subscribeToUsers, requestFcmPermission} from './src/services/firebase';
import {promptBatteryOptimization} from './src/services/batteryOptimization';
import {BuzzPayload, User} from './src/types';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import BuzzSheet from './src/screens/BuzzSheet';
import IncomingBuzzScreen from './src/screens/IncomingBuzzScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const {BuzzerService} = NativeModules;

type Screen = 'home' | 'buzz' | 'incoming' | 'settings' | 'profile' | 'history';

function App() {
  const {user, loading, login, signUp, deleteAccount, updateProfile, changePin, logout} = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [incomingPayload, setIncomingPayload] = useState<BuzzPayload | null>(null);
  const usersMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const requestPermissions = async () => {
      // Android 13+ requires POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
      // Request FCM permission (iOS prompt + Android channel setup)
      await requestFcmPermission();
      // Create notification channel for buzz alerts
      await createNotificationChannel();
    };
    requestPermissions().catch(() => {});
    promptBatteryOptimization();
  }, []);

  // Start/stop foreground service based on login state
  useEffect(() => {
    if (user) {
      BuzzerService?.startService(user.id);
      // Restart service when app comes to foreground to refresh Firestore listener
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          BuzzerService?.startService(user.id);
        }
      });
      return () => sub.remove();
    } else {
      BuzzerService?.stopService();
    }
  }, [user]);

  // Cache user names for buzz notifications (real-time)
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUsers(users => {
      const map: Record<string, string> = {};
      users.forEach(u => { map[u.id] = u.name; });
      usersMapRef.current = map;
    });
    return unsub;
  }, [user]);

  // Listen for incoming buzzes via Firestore (foreground)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToIncomingBuzzes(
      user.id,
      (buzz) => {
        const payload: BuzzPayload = {
          buzz_id: buzz.id,
          from_user_id: buzz.from_user_id,
          from_user_name: usersMapRef.current[buzz.from_user_id] || 'Someone',
          reason: buzz.reason,
          note: buzz.note,
        };

        if (AppState.currentState === 'active') {
          setIncomingPayload(payload);
          setScreen('incoming');
        } else {
          showBuzzNotification(payload).catch(() => {});
        }
      },
      (buzzId) => {
        // Sender cancelled the buzz
        cancelBuzzNotification(buzzId).catch(() => {});
        setIncomingPayload(prev => {
          if (prev?.buzz_id === buzzId) {
            setScreen('home');
            return null;
          }
          return prev;
        });
      },
    );
    return unsubscribe;
  }, [user]);

  // Handle FCM messages in foreground (cancellation, etc.)
  useEffect(() => {
    try {
      const {getMessaging, onMessage} = require('@react-native-firebase/messaging');
      const messaging = getMessaging();
      const unsub = onMessage(messaging, (remoteMessage: any) => {
        const data = remoteMessage.data;
        if (!data) return;
        if (data.type === 'buzz_cancelled') {
          cancelBuzzNotification(data.buzz_id).catch(() => {});
          setIncomingPayload(prev => {
            if (prev?.buzz_id === data.buzz_id) {
              setScreen('home');
              return null;
            }
            return prev;
          });
        }
      });
      return unsub;
    } catch {}
  }, []);

  // Handle notification actions
  useEffect(() => {
    const unsubscribe = setupNotificationListeners(
      (buzzId, response) => { respondToBuzz(buzzId, response as any).catch(() => {}); },
      payload => { setIncomingPayload(payload); setScreen('incoming'); },
    );
    return unsubscribe;
  }, []);

  // Check for pending buzz from native notification tap
  useEffect(() => {
    if (!user) return;

    const checkPendingBuzz = () => {
      BuzzerService?.getPendingBuzz?.()
        .then((data: any) => {
          if (data?.buzz_id) {
            const payload: BuzzPayload = {
              buzz_id: data.buzz_id,
              from_user_id: data.from_user_id,
              from_user_name: data.from_user_name || 'Someone',
              reason: data.reason,
              note: data.note || null,
            };
            setIncomingPayload(payload);
            setScreen('incoming');
          }
        })
        .catch(() => {});
    };

    checkPendingBuzz();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPendingBuzz();
    });
    return () => sub.remove();
  }, [user]);

  const handleLogout = useCallback(async () => {
    BuzzerService?.stopService();
    setScreen('home');
    setSelectedUser(null);
    setIncomingPayload(null);
    setAuthScreen('login');
    await logout();
  }, [logout]);

  const handleDeleteAccount = useCallback(async () => {
    BuzzerService?.stopService();
    setScreen('home');
    setSelectedUser(null);
    setIncomingPayload(null);
    setAuthScreen('login');
    await deleteAccount();
  }, [deleteAccount]);

  const handleSelectUser = useCallback((u: User) => { setSelectedUser(u); setScreen('buzz'); }, []);
  const handleCloseBuzz = useCallback(() => { setSelectedUser(null); setScreen('home'); }, []);
  const handleDismissIncoming = useCallback(() => { setIncomingPayload(null); setScreen('home'); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4D4D" />
        </View>
      ) : !user ? (
        authScreen === 'login' ? (
          <LoginScreen onLogin={login} onGoToSignup={() => setAuthScreen('signup')} />
        ) : (
          <SignupScreen onSignup={signUp} onGoToLogin={() => setAuthScreen('login')} />
        )
      ) : (
        <>
          {screen === 'incoming' && incomingPayload && <IncomingBuzzScreen payload={incomingPayload} onDismiss={handleDismissIncoming} />}
          {screen === 'home' && <HomeScreen currentUser={user} onSelectUser={handleSelectUser} onSettings={() => setScreen('settings')} onProfile={() => setScreen('profile')} onHistory={() => setScreen('history')} />}
          {screen === 'buzz' && selectedUser && <BuzzSheet sender={user} receiver={selectedUser} onClose={handleCloseBuzz} />}
          {screen === 'settings' && <SettingsScreen currentUser={user} onBack={() => setScreen('home')} />}
          {screen === 'profile' && <ProfileScreen currentUser={user} onBack={() => setScreen('home')} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onUpdateProfile={updateProfile} onChangePin={changePin} />}
          {screen === 'history' && <HistoryScreen onBack={() => setScreen('home')} />}
        </>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center'},
});

export default App;
