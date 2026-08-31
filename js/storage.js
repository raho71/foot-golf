/**
 * Storage module using IndexedDB for persistent data storage
 */
const Storage = (function() {
    const DB_NAME = 'FootGolfDB';
    const DB_VERSION = 1;
    let db = null;

    // Initialize the database
    function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Courses store
                if (!database.objectStoreNames.contains('courses')) {
                    const coursesStore = database.createObjectStore('courses', { keyPath: 'id' });
                    coursesStore.createIndex('name', 'name', { unique: false });
                }

                // Games store
                if (!database.objectStoreNames.contains('games')) {
                    const gamesStore = database.createObjectStore('games', { keyPath: 'id' });
                    gamesStore.createIndex('date', 'date', { unique: false });
                    gamesStore.createIndex('courseId', 'courseId', { unique: false });
                    gamesStore.createIndex('finished', 'finished', { unique: false });
                }
            };
        });
    }

    // Generate a unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Generic CRUD operations
    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    function getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    function save(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve(item);
        });
    }

    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();
        });
    }

    // Course-specific methods
    const Courses = {
        getAll: () => getAll('courses'),
        getById: (id) => getById('courses', id),
        save: (course) => {
            if (!course.id) {
                course.id = generateId();
            }
            return save('courses', course);
        },
        delete: (id) => remove('courses', id)
    };

    // Game-specific methods
    const Games = {
        getAll: () => getAll('games'),
        getById: (id) => getById('games', id),
        save: (game) => {
            if (!game.id) {
                game.id = generateId();
            }
            return save('games', game);
        },
        delete: (id) => remove('games', id),
        
        // Get current (unfinished) game
        getCurrent: async () => {
            const games = await getAll('games');
            return games.find(g => !g.finished) || null;
        },

        // Get all finished games, sorted by date descending
        getFinished: async () => {
            const games = await getAll('games');
            return games
                .filter(g => g.finished)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        },

        // Get all games for a specific player
        getByPlayer: async (playerName) => {
            const games = await getAll('games');
            return games
                .filter(g => g.finished && g.players.includes(playerName))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        },

        // Get all unique player names
        getAllPlayers: async () => {
            const games = await getAll('games');
            const playerSet = new Set();
            games.forEach(g => {
                g.players.forEach(p => playerSet.add(p));
            });
            return Array.from(playerSet).sort();
        }
    };

    return {
        init,
        Courses,
        Games
    };
})();
