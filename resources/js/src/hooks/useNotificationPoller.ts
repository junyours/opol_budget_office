
import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { useAuth } from './useAuth';

export function useNotificationPoller() {
  const { user } = useAuth();
  const fetch = useNotificationStore(s => s.fetch);

  const fetchRef = useRef(fetch);
  useEffect(() => { fetchRef.current = fetch; }, [fetch]);

  useEffect(() => {
    if (!user) return;
    fetchRef.current(); // ← fetch ONCE on login, no interval
  }, [user?.user_id]);
}
