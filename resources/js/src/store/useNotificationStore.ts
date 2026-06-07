

// import { create } from 'zustand';
// import API from '@/src/services/api';
// import { AppNotification } from '@/src/types/notifications';

// interface NotificationStore {
//   notifications: AppNotification[];
//   unreadCount:   number;
//   fetch:         () => Promise<void>;
//   markRead:      (id: string) => Promise<void>;
//   markAllRead:   () => Promise<void>;
// }

// export const useNotificationStore = create<NotificationStore>((set) => ({
//   notifications: [],
//   unreadCount:   0,

//   fetch: async () => {
//     try {
//       const res = await API.get('/notifications');
//       set({
//         notifications: res.data.data.notifications ?? [],
//         unreadCount:   res.data.data.unread_count   ?? 0,
//       });
//     } catch { /* silent */ }
//   },

//   markRead: async (id: string) => {
//     await API.post(`/notifications/${id}/read`);
//     set(state => ({
//       notifications: state.notifications.filter(n => n.id !== id),
//       unreadCount:   Math.max(0, state.unreadCount - 1),
//     }));
//   },

//   markAllRead: async () => {
//     await API.post('/notifications/read-all');
//     set({ notifications: [], unreadCount: 0 });
//   },
// }));

import { create } from 'zustand';
import API from '@/src/services/api';
import { AppNotification } from '@/src/types/notifications';

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount:   number;
  fetch:         () => Promise<void>;
  markRead:      (id: string) => Promise<void>;
  markAllRead:   () => Promise<void>;
  clearRead:     () => Promise<void>;
}

// Minimum ms between actual network fetches.
// Prevents double-fire from React StrictMode and rapid polling overlap.
const MIN_FETCH_INTERVAL_MS = 15_000;
let lastFetchedAt = 0;
let inflightPromise: Promise<void> | null = null;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount:   0,

  fetch: async () => {
    const now = Date.now();

    // If a fetch is already in-flight, piggyback on it instead of firing another
    if (inflightPromise) return inflightPromise;

    // Debounce: skip if fetched too recently
    if (now - lastFetchedAt < MIN_FETCH_INTERVAL_MS) return;

    inflightPromise = (async () => {
      try {
        const res = await API.get('/notifications');
        set({
          notifications: res.data.data.notifications ?? [],
          unreadCount:   res.data.data.unread_count   ?? 0,
        });
        lastFetchedAt = Date.now();
      } catch {
        // non-critical — badge just won't show
      } finally {
        inflightPromise = null;
      }
    })();

    return inflightPromise;
  },

  markRead: async (id: string) => {
    await API.post(`/notifications/${id}/read`);
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount:   Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await API.post('/notifications/read-all');
    set({ notifications: [], unreadCount: 0 });
    lastFetchedAt = 0; // allow immediate refetch after user action
  },

  clearRead: async () => {
    await API.delete('/notifications/clear-read');
    lastFetchedAt = 0;
  },
}));
