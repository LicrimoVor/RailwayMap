const DB_NAME = "interactive-railway-map-cache";
const DB_VERSION = 1;
const STORE_NAME = "records";

type CacheRecord<T> = {
	key: string;
	value: T;
	updatedAt: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

export async function readCachedValue<T>(key: string): Promise<T | null> {
	const record = await readCachedRecord<T>(key);
	return record?.value ?? null;
}

export async function writeCachedValue<T>(
	key: string,
	value: T,
): Promise<void> {
	const db = await openDb();
	if (!db) {
		return;
	}

	await new Promise<void>((resolve) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const request = transaction.objectStore(STORE_NAME).put({
			key,
			value,
			updatedAt: Date.now(),
		} satisfies CacheRecord<T>);

		request.onerror = () => resolve();
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => resolve();
	});
}

async function readCachedRecord<T>(
	key: string,
): Promise<CacheRecord<T> | null> {
	const db = await openDb();
	if (!db) {
		return null;
	}

	return new Promise((resolve) => {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const request = transaction.objectStore(STORE_NAME).get(key);

		request.onsuccess = () =>
			resolve((request.result as CacheRecord<T> | undefined) ?? null);
		request.onerror = () => resolve(null);
		transaction.onerror = () => resolve(null);
	});
}

function openDb(): Promise<IDBDatabase | null> {
	if (typeof window === "undefined" || !("indexedDB" in window)) {
		return Promise.resolve(null);
	}

	dbPromise ??= new Promise((resolve) => {
		const request = window.indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "key" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
		request.onblocked = () => resolve(null);
	});

	return dbPromise;
}
