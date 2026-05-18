// // import { useEffect } from 'react';
// // import { useNotificationStore } from '@/src/store/useNotificationStore';
// // import { useAuth } from './useAuth';

// // const POLL_INTERVAL = 30_000;

// // export function useNotificationPoller() {
// //   const { user } = useAuth();
// //   const fetch = useNotificationStore(s => s.fetch);

// //   useEffect(() => {
// //     if (!user) return;
// //     fetch();
// //     const timer = setInterval(fetch, POLL_INTERVAL);
// //     return () => clearInterval(timer);
// //   }, [user]);
// // }


// import { useEffect, useRef } from 'react';
// import { useNotificationStore } from '@/src/store/useNotificationStore';
// import { useAuth } from './useAuth';

// const POLL_INTERVAL = 30_000;

// export function useNotificationPoller() {
//   const { user } = useAuth();
//   const fetch = useNotificationStore(s => s.fetch);

//   // Stable ref so the effect never re-fires when fetch identity changes
//   const fetchRef = useRef(fetch);
//   useEffect(() => { fetchRef.current = fetch; }, [fetch]);

//   useEffect(() => {
//     if (!user) return;

//     // Guard: don't fire if already fetched recently
//     fetchRef.current();
//     const timer = setInterval(() => fetchRef.current(), POLL_INTERVAL);
//     return () => clearInterval(timer);
//   }, [user?.user_id]); // only re-run if the logged-in user actually changes
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
    fetchRef.current(); // ← fetch ONCE on login, no interval
  }, [user?.user_id]);
}
