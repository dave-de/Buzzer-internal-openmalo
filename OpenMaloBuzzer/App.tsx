import React, {useState, useEffect, useCallback, useRef} from 'react';
import {StatusBar, ActivityIndicator, View, StyleSheet, AppState, NativeModules} from 'react-native';
import {useAuth} from './src/hooks/useAuth';
import {createNotificationChannel, setupNotificationListeners, showBuzzNotification} from './src/services/notification';
import {respondToBuzz, subscribeToIncomingBuzzes, getUsers} from './src/services/firebase';
import {promptBatteryOptimization} from './src/services/batteryOptimization';
import {BuzzPayload, User} from './src/types';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import BuzzSheet from './src/screens/BuzzSheet';
import IncomingBuzzScreen from './src/screens/IncomingBuzzScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const {BuzzerService} = NativeModules;

type Screen = 'home' | 'buzz' | 'incoming' | 'settings' | 'history';

function App() {
  const {user, loading, login, logout} = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [incomingPayload, setIncomingPayload] = useState<BuzzPayload | null>(null);
  const usersMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    createNotificationChannel().catch(() => {});
    promptBatteryOptimization();
  }, []);

  // Start/stop foreground service based on login state
  useEffect(() => {
    if (user) {
      BuzzerService?.startService(user.id);
    } else {
      BuzzerService?.stopService();
    }
  }, [user]);

  // Cache user names for buzz notifications
  useEffect(() => {
    if (!user) return;
    getUsers().then(users => {
      const map: Record<string, string> = {};
      users.forEach(u => { map[u.id] = u.name; });
      usersMapRef.current = map;
    }).catch(() => {});
  }, [user]);

  // Listen for incoming buzzes via Firestore (foreground)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToIncomingBuzzes(user.id, (buzz) => {
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
    });
    return unsubscribe;
  }, [user]);

  // Handle notification actions
  useEffect(() => {
    const unsubscribe = setupNotificationListeners(
      (buzzId, response) => { respondToBuzz(buzzId, response as any).catch(() => {}); },
      payload => { setIncomingPayload(payload); setScreen('incoming'); },
    );
    return unsubscribe;
  }, []);

  const handleLogout = useCallback(async () => {
    BuzzerService?.stopService();
    await logout();
  }, [logout]);

  const handleSelectUser = useCallback((u: User) => { setSelectedUser(u); setScreen('buzz'); }, []);
  const handleCloseBuzz = useCallback(() => { setSelectedUser(null); setScreen('home'); }, []);
  const handleDismissIncoming = useCallback(() => { setIncomingPayload(null); setScreen('home'); }, []);

  if (loading) {
    return (<View style={styles.loadingContainer}><StatusBar barStyle="light-content" backgroundColor="#0D0D0D" /><ActivityIndicator size="large" color="#FF4D4D" /></View>);
  }

  if (!user) {
    return (<><StatusBar barStyle="light-content" backgroundColor="#0D0D0D" /><LoginScreen onLogin={login} /></>);
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      {screen === 'incoming' && incomingPayload && <IncomingBuzzScreen payload={incomingPayload} onDismiss={handleDismissIncoming} />}
      {screen === 'home' && <HomeScreen currentUser={user} onSelectUser={handleSelectUser} onSettings={() => setScreen('settings')} onHistory={() => setScreen('history')} onLogout={handleLogout} />}
      {screen === 'buzz' && selectedUser && <BuzzSheet sender={user} receiver={selectedUser} onClose={handleCloseBuzz} />}
      {screen === 'settings' && <SettingsScreen currentUser={user} onBack={() => setScreen('home')} onLogout={handleLogout} />}
      {screen === 'history' && <HistoryScreen onBack={() => setScreen('home')} />}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center'},
});

export default App;
