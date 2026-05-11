import { api, electron as electronBridge } from '../../api/client';

export const createAuthSlice = (set, get) => ({
  currentUser: null,
  isLoggedIn: false,
  authChecked: false,
  checkAuth: async () => {
    try {
      const res = await api.getCurrentUser();
      set({ currentUser: res.user, isLoggedIn: res.logged_in, authChecked: true });
    } catch {
      set({ currentUser: null, isLoggedIn: false, authChecked: true });
    }
  },
  loginAsGuest: async (nickname) => {
    const res = await api.guestLogin(nickname);
    set({ currentUser: res.user, isLoggedIn: true });
    return res.user;
  },
  loginWithOAuth: async (provider) => {
    const res = await electronBridge.startOAuth(provider);
    if (res?.user) {
      set({ currentUser: res.user, isLoggedIn: true });
      return res.user;
    }
    throw new Error('登录未完成');
  },
  logout: async () => {
    try {
      await api.logout();
    } catch {}
    set({ currentUser: null, isLoggedIn: false });
  },
});
