const DB_NAME = 'ZapiLocalDB';
const DB_VERSION = 1;

class LocalDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error: " + event.target.errorCode);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Instances Store
                if (!db.objectStoreNames.contains('instances')) {
                    db.createObjectStore('instances', { keyPath: 'id' });
                }

                // Contacts Store
                if (!db.objectStoreNames.contains('contacts')) {
                    const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' });
                    contactsStore.createIndex('client_id', 'client_id', { unique: false });
                }

                // Campaigns Store
                if (!db.objectStoreNames.contains('campaigns')) {
                    const campaignsStore = db.createObjectStore('campaigns', { keyPath: 'id' });
                    campaignsStore.createIndex('client_id', 'client_id', { unique: false });
                }

                // Messages Store
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messagesStore.createIndex('campaign_id', 'campaign_id', { unique: false });
                }
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            // Ensure ID exists
            if (!data.id) data.id = crypto.randomUUID();
            const request = store.add(data);

            request.onsuccess = () => resolve(data.id);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async bulkPut(storeName, items) {
        if (!items || items.length === 0) return;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            for (const item of items) {
                store.put(item);
            }
        });
    }

    async bulkAdd(storeName, items) {
        if (!items || items.length === 0) return;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            // We ignore individual errors (like duplicate keys) to continue adding others?
            // IndexedDB transaction aborts on error by default.
            // For "Add Only New", we should probably use a manual check or handle error.
            // But 'add' will fail the transaction if key exists.
            // Strategy: Use 'put' for merge if we want to update, OR check existence first.
            // Requirement: "adding only new records".
            // Implementation: We'll handle this logic in the manager by checking keys or using a different approach.
            // But let's expose a safe bulkAdd that doesn't fail everything?
            // Actually, let's just stick to bulkPut (Upsert) and clear() for now in DB layer.
            // The manager can filter items before calling bulkPut if it wants to avoid overwrites.
            transaction.onerror = () => reject(transaction.error);

            for (const item of items) {
                store.put(item); 
            }
        });
    }
}

window.db = new LocalDB();
