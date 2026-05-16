import { useEffect } from 'react';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { useAuth } from './useAuth';

const POLL_INTERVAL = 30_000;

export function useNotificationPoller() {
  const { user } = useAuth();
  const fetch = useNotificationStore(s => s.fetch);

  useEffect(() => {
    if (!user) return;
    fetch();
    const timer = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [user]);
}
