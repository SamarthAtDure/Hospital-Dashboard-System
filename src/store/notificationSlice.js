import { createSlice } from "@reduxjs/toolkit";

const storageKey = (target) => `notifs_${target}`;
const load = (target) => {
  try { return JSON.parse(localStorage.getItem(storageKey(target)) || "[]"); }
  catch { return []; }
};
const save = (target, items) =>
  localStorage.setItem(storageKey(target), JSON.stringify(items));

const notificationSlice = createSlice({
  name: "notifications",
  initialState: { cache: {}, pendingRequestCount: 0 },
  reducers: {
    setPendingRequestCount(state, action) {
      state.pendingRequestCount = action.payload;
    },
    loadNotifs(state, action) {
      const target = action.payload;
      if (!state.cache[target]) {
        state.cache[target] = load(target);
      }
    },
    pushNotif(state, action) {
      const { target, message } = action.payload;
      const existing = load(target);
      const updated = [{ id: Date.now(), message, read: false, time: new Date().toISOString() }, ...existing];
      save(target, updated);
      state.cache[target] = updated;
    },
    markAllRead(state, action) {
      const target = action.payload;
      const existing = load(target);
      const updated = existing.map((n) => ({ ...n, read: true }));
      save(target, updated);
      state.cache[target] = updated;
    },
    deleteNotif(state, action) {
      const { target, id } = action.payload;
      const updated = (state.cache[target] || load(target)).filter((n) => n.id !== id);
      save(target, updated);
      state.cache[target] = updated;
    },
  },
});

export const { loadNotifs, pushNotif, markAllRead, deleteNotif, setPendingRequestCount } = notificationSlice.actions;
export default notificationSlice.reducer;
