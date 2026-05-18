// // import { create } from 'zustand';
// // import API from '@/src/services/api';
// // import { AppNotification } from '@/src/types/notifications';

// // interface NotificationStore {
// //   notifications: AppNotification[];
// //   unreadCount:   number;
// //   fetch:         () => Promise<void>;
// //   markRead:      (id: string) => Promise<void>;
// //   markAllRead:   () => Promise<void>;
// // }

// // export const useNotificationStore = create<NotificationStore>((set, get) => ({
// //   notifications: [],
// //   unreadCount:   0,

// //   fetch: async () => {
// //     try {
// //       const res = await API.get('/notifications');
// //       set({
// //         notifications: res.data.data.notifications ?? [],
// //         unreadCount:   res.data.data.unread_count   ?? 0,
// //       });
// //     } catch { /* silent */ }
// //   },

// //   markRead: async (id: string) => {
// //     await API.post(`/notifications/${id}/read`);
// //     set(state => ({
// //       notifications: state.notifications.filter(n => n.id !== id),
// //       unreadCount:   Math.max(0, state.unreadCount - 1),
// //     }));
// //   },

// //   markAllRead: async () => {
// //     await API.post('/notifications/read-all');
// //     set({ notifications: [], unreadCount: 0 });
// //   },
// // }));


// import { create } from 'zustand';
// import API from '@/src/services/api';
// import { AppNotification } from '@/src/types/notifications';

// interface NotificationStore {
//   notifications: AppNotification[];
//   unreadCount:   number;
//   lastFetchedAt: number;           // ← add this
//   fetch:         () => Promise<void>;
//   markRead:      (id: string) => Promise<void>;
//   markAllRead:   () => Promise<void>;
// }

// const MIN_FETCH_INTERVAL = 10_000; // don't re-fetch if called within 10s

// export const useNotificationStore = create<NotificationStore>((set, get) => ({
//   notifications: [],
//   unreadCount:   0,
//   lastFetchedAt: 0,

//   fetch: async () => {
//     // Debounce guard — skip if fetched too recently
//     const now = Date.now();
//     if (now - get().lastFetchedAt < MIN_FETCH_INTERVAL) return;

//     try {
//       const res = await API.get('/notifications');
//       set({
//         notifications: res.data.data.notifications ?? [],
//         unreadCount:   res.data.data.unread_count   ?? 0,
//         lastFetchedAt: Date.now(),
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
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount:   0,

  fetch: async () => {
    try {
      const res = await API.get('/notifications');
      set({
        notifications: res.data.data.notifications ?? [],
        unreadCount:   res.data.data.unread_count   ?? 0,
      });
    } catch { /* silent */ }
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
  },
}));
