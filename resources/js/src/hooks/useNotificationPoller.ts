
// import { useEffect, useRef } from 'react';
// import { useNotificationStore } from '@/src/store/useNotificationStore';
// import { useAuth } from './useAuth';

// export function useNotificationPoller() {
//   const { user } = useAuth();
//   const fetch = useNotificationStore(s => s.fetch);

//   const fetchRef = useRef(fetch);
//   useEffect(() => { fetchRef.current = fetch; }, [fetch]);

//   useEffect(() => {
//     if (!user) return;
//     fetchRef.current(); // fetch on login

//     const interval = setInterval(() => {
//       fetchRef.current();
//     }, 30_000); // poll every 30s — store debounces duplicate calls anyway

//     return () => clearInterval(interval);
//   }, [user?.user_id]);
// }

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
    fetchRef.current(); // fetch on login
  }, [user?.user_id]);
}
