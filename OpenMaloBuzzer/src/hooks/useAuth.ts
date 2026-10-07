import {useState, useEffect, useCallback} from 'react';
import {User} from '../types';
import {login as authLogin, getStoredUser, logout as authLogout} from '../services/auth';
import {updateLastSeen} from '../services/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser()
      .then(u => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    updateLastSeen(user.id).catch(() => {});
    const interval = setInterval(() => updateLastSeen(user.id).catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (phone: string, pin: string) => {
    const u = await authLogin(phone, pin);
    if (u) setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  return {user, loading, login, logout};
};
