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

export const useNotificationStore = create<NotificationStore>((set, get) => ({
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
