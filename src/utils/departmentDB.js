const DB_NAME    = "HealthCareDB";
const DB_VERSION = 1;
const STORE      = "departments";
const API        = "http://localhost:5000";

// ── Init DB ───────────────────────────────────────────────────────
export function initDepartmentDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ── Get all departments ───────────────────────────────────────────
export async function getDepartments() {
  const db = await initDepartmentDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ── Add or update a single department ────────────────────────────
export async function upsertDepartment(dept) {
  const db = await initDepartmentDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put({ ...dept, _id: dept._id?.toString() });
    req.onsuccess = () => resolve();
    req.onerror  = () => reject(req.error);
  });
}

// ── Bulk replace all departments ──────────────────────────────────
async function bulkReplace(departments) {
  const db = await initDepartmentDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    departments.forEach((d) => store.put({ ...d, _id: d._id?.toString() }));
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Fetch from API → save to IndexedDB → return data ─────────────
export async function refreshDepartmentsFromAPI() {
  const data = await fetch(`${API}/departments/with-doctors`).then((r) => r.json());
  await bulkReplace(data);
  return data;
}
