/**
 * CD-210 — site survey drafts kept on the device (IndexedDB, photos as
 * blobs) until there is signal to sync them. Every call is guarded: a
 * browser without IndexedDB (private mode, blocked storage) just keeps
 * nothing, and the survey form still works online.
 */

export interface DraftPhoto {
  id: string;
  blob: Blob;
  name: string;
  caption: string;
  latitude: number | null;
  longitude: number | null;
  takenAt: string;
}

export interface SurveyDraft {
  id: string;
  projectId: string;
  /** Already on the server (an edit of a synced draft). */
  synced: boolean;
  site: string;
  surveyedOn: string;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  answers: Record<number, { holds: boolean | null; note: string }>;
  photos: DraftPhoto[];
  updatedAt: string;
}

const DB = "ctd-site-surveys";
const STORE = "drafts";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, {
          keyPath: "id",
        });
        store.createIndex("projectId", "projectId");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function listDrafts(projectId: string): Promise<SurveyDraft[]> {
  const rows = await run<SurveyDraft[]>("readonly", (store) =>
    store.index("projectId").getAll(projectId),
  );
  return (rows ?? []).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/** False when the device could not keep it. */
export async function putDraft(draft: SurveyDraft): Promise<boolean> {
  const done = await run<IDBValidKey>("readwrite", (store) =>
    store.put({ ...draft, updatedAt: new Date().toISOString() }),
  );
  return done !== null;
}

export async function dropDraft(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
