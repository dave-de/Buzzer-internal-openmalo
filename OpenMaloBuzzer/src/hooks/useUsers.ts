import {useState, useEffect} from 'react';
import {User} from '../types';
import {subscribeToUsers} from '../services/firebase';
import {PRESENCE_TIMEOUT_MS} from '../constants';

export const useUsers = (currentUserId: string | undefined) => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToUsers(allUsers => {
      setUsers(allUsers.filter(u => u.id !== currentUserId));
    });
    return unsubscribe;
  }, [currentUserId]);

  const isOnline = (user: User) =>
    Date.now() - user.last_seen_at < PRESENCE_TIMEOUT_MS;

  return {users, isOnline};
};
