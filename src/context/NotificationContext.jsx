import React, { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext();

// key: "notifs_admin" for admin, "notifs_<doctorId>" for doctors
const storageKey = (target) => `notifs_${target}`;

const load = (target) => {
  try { return JSON.parse(localStorage.getItem(storageKey(target)) || "[]"); }
  catch { return []; }
};

const save = (target, items) =>
  localStorage.setItem(storageKey(target), JSON.stringify(items));

export function NotificationProvider({ children }) {
  // target = "admin" | doctorId string
  const [cache, setCache] = useState({});

  const getNotifs = useCallback((target) => {
    if (cache[target]) return cache[target];
    return load(target);
  }, [cache]);

  const pushNotif = useCallback((target, message) => {
    const existing = load(target);
    const updated = [{ id: Date.now(), message, read: false, time: new Date().toISOString() }, ...existing];
    save(target, updated);
    setCache((prev) => ({ ...prev, [target]: updated }));
  }, []);

  const markAllRead = useCallback((target) => {
    const existing = load(target);
    const updated = existing.map((n) => ({ ...n, read: true }));
    save(target, updated);
    setCache((prev) => ({ ...prev, [target]: updated }));
  }, []);

  return (
    <NotificationContext.Provider value={{ getNotifs, pushNotif, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
