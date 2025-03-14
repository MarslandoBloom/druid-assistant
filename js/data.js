/**
 * data.js - Data management module for the Druid's Assistant
 * Handles IndexedDB setup, markdown parsing, and beast data management
 */

const DataManager = (function() {
    // Database configuration
    const DB_NAME = 'DruidsAssistantDB';
    const DB_VERSION = 1;
    const BEAST_STORE = 'beasts';
    const FAVORITES_STORE = 'favorites';
    
    // IndexedDB instance
    let db = null;
    
    /**
     * Initializes the IndexedDB database
     * @returns {Promise} Resolves when the database is ready
     */
    function initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject('Could not open database');
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database opened successfully');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(BEAST_STORE)) {
                    const beastStore = db.createObjectStore(BEAST_STORE, { keyPath: 'id' });
                    beastStore.createIndex('name', 'name', { unique: false });
                    beastStore.createIndex('cr', 'cr', { unique: false });
                    beastStore.createIndex('type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
                    db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
                }
                
                console.log('Database setup complete');
            };
        });
    }
    
    /**
     * Parses a markdown string containing beast data
     * @param {string} markdown - Markdown text to parse
     * @returns {Array} Array of beast objects
     */
    function parseMarkdown(markdown) {
        const beasts = [];
        let currentBeast = null;
        let inStatBlock = false;
        let currentSection = null;
        
        // Split markdown into lines
        const lines = markdown.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for beast header (starts with '>## ')
            if (line.startsWith('>## ')) {
                // If we were processing a beast, save it
                if (currentBeast) {
                    beasts.push(currentBeast);
                }
                
                // Start a new beast
                const name = line.substring(4).trim();
                currentBeast = {
                    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    name: name,
                    traits: [],
                    actions: [],
                    reactions: [],
                    legendaryActions: []
                };
                inStatBlock = true;
                currentSection = null;
                continue;
            }
            
            // If not processing a beast, skip
            if (!currentBeast) continue;
            
            // Check for end of statblock
            if (line === 'null' && inStatBlock) {
                inStatBlock = false;
                continue;
            }
            
            // Inside statblock processing
            if (inStatBlock) {
                // Handle basic properties
                if (line.startsWith('>- **Armor Class**')) {
                    currentBeast.ac = line.substring(18).trim();
                }
                else if (line.startsWith('>- **Hit Points**')) {
                    currentBeast.hp = line.substring(17).trim();
                }
                else if (line.startsWith('>- **Speed**')) {
                    currentBeast.speed = line.substring(12).trim();
                }
                // Handle ability scores
                else if (line.startsWith('>|STR|DEX|CON|INT|WIS|CHA|')) {
                    // Next line contains the ability score values
                    const scores = lines[i+2].trim();
                    const scoreParts = scores.substring(1, scores.length-1).split('|');
                    
                    currentBeast.abilities = {
                        str: scoreParts[0].trim(),
                        dex: scoreParts[1].trim(),
                        con: scoreParts[2].trim(),
                        int: scoreParts[3].trim(),
                        wis: scoreParts[4].trim(),
                        cha: scoreParts[5].trim()
                    };
                    
                    // Skip the next two lines (we've already processed them)
                    i += 2;
                }
                // Handle skills, senses, etc.
                else if (line.startsWith('>- **Skills**')) {
                    currentBeast.skills = line.substring(14).trim();
                }
                else if (line.startsWith('>- **Senses**')) {
                    currentBeast.senses = line.substring(14).trim();
                }
                else if (line.startsWith('>- **Languages**')) {
                    currentBeast.languages = line.substring(17).trim();
                }
                else if (line.startsWith('>- **Challenge**')) {
                    const crParts = line.substring(16).trim().split(' ');
                    currentBeast.cr = crParts[0];
                    currentBeast.xp = crParts[1]?.replace(/[\(\)]/g, '');
                }
                else if (line.startsWith('>- **Damage Resistances**')) {
                    currentBeast.damageResistances = line.substring(26).trim();
                }
                else if (line.startsWith('>- **Damage Vulnerabilities**')) {
                    currentBeast.damageVulnerabilities = line.substring(30).trim();
                }
                else if (line.startsWith('>- **Damage Immunities**')) {
                    currentBeast.damageImmunities = line.substring(25).trim();
                }
                else if (line.startsWith('>- **Condition Immunities**')) {
                    currentBeast.conditionImmunities = line.substring(28).trim();
                }
                // Handle traits/features
                else if (line.startsWith('>***')) {
                    const traitText = line.substring(4);
                    const endIndex = traitText.indexOf('***');
                    if (endIndex !== -1) {
                        const traitName = traitText.substring(0, endIndex).trim();
                        const traitDesc = traitText.substring(endIndex + 3).trim();
                        currentBeast.traits.push({
                            name: traitName,
                            desc: traitDesc
                        });
                    }
                }
                // Handle section headers
                else if (line.startsWith('>### Actions')) {
                    currentSection = 'actions';
                }
                else if (line.startsWith('>### Reactions')) {
                    currentSection = 'reactions';
                }
                else if (line.startsWith('>### Legendary Actions')) {
                    currentSection = 'legendaryActions';
                }
                // Handle action entries
                else if (line.startsWith('>***') && currentSection) {
                    const actionText = line.substring(4);
                    const endIndex = actionText.indexOf('***');
                    if (endIndex !== -1) {
                        const actionName = actionText.substring(0, endIndex).trim();
                        const actionDesc = actionText.substring(endIndex + 3).trim();
                        
                        const action = {
                            name: actionName,
                            desc: actionDesc
                        };
                        
                        // Extract attack and damage info if present
                        if (actionDesc.includes('Melee Weapon Attack:') || actionDesc.includes('Ranged Weapon Attack:')) {
                            const attackMatch = actionDesc.match(/([A-Za-z]+ Weapon Attack:)\s*\+(\d+) to hit/);
                            if (attackMatch) {
                                action.attackType = attackMatch[1];
                                action.attackBonus = attackMatch[2];
                            }
                            
                            const damageMatch = actionDesc.match(/Hit: (\d+) \(([^\)]+)\) ([a-z]+) damage/);
                            if (damageMatch) {
                                action.damageAvg = damageMatch[1];
                                action.damageDice = damageMatch[2];
                                action.damageType = damageMatch[3];
                            }
                        }
                        
                        currentBeast[currentSection].push(action);
                    }
                }
                // Handle type and size from subtitle line
                else if (line.startsWith('>*') && !currentBeast.size) {
                                            const subtitleMatch = line.match(/>*([A-Za-z]+) ([A-Za-z]+)(?: \(([A-Za-z]+)\))?, ([a-z ]+)\*/i);
                    if (subtitleMatch) {
                        currentBeast.size = subtitleMatch[1];
                        currentBeast.type = subtitleMatch[2];
                        currentBeast.subtype = subtitleMatch[3] || '';
                        currentBeast.alignment = subtitleMatch[4];
                        currentBeast.environment = 'forest, grassland, hills'; // Adding default environment from the file name
                    }
                }
            }
            // Outside statblock - look for beast description
            else if (line.startsWith('## ') && line.substring(3).trim() === currentBeast.name) {
                // The next lines contain the description
                let descriptionLines = [];
                let j = i + 1;
                
                while (j < lines.length && !lines[j].startsWith('___') && !lines[j].startsWith('## ')) {
                    if (lines[j].trim().length > 0) {
                        descriptionLines.push(lines[j].trim());
                    }
                    j++;
                }
                
                if (descriptionLines.length > 0) {
                    currentBeast.description = descriptionLines.join('\n');
                }
                
                // Skip to the end of the description
                i = j - 1;
            }
        }
        
        // Add the last beast if there is one
        if (currentBeast) {
            beasts.push(currentBeast);
        }
        
        return beasts;
    }
    
    /**
     * Saves beasts to IndexedDB
     * @param {Array} beasts - Array of beast objects to save
     * @returns {Promise} Resolves when save is complete
     */
    function saveBeasts(beasts) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([BEAST_STORE], 'readwrite');
            const store = transaction.objectStore(BEAST_STORE);
            
            let savedCount = 0;
            
            transaction.oncomplete = () => {
                console.log(`Saved ${savedCount} beasts`);
                resolve(savedCount);
            };
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                reject('Error saving beasts');
            };
            
            beasts.forEach(beast => {
                const request = store.put(beast);
                request.onsuccess = () => {
                    savedCount++;
                };
            });
        });
    }
    
    /**
     * Gets all beasts from IndexedDB
     * @returns {Promise} Resolves with array of beasts
     */
    function getAllBeasts() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([BEAST_STORE], 'readonly');
            const store = transaction.objectStore(BEAST_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error getting beasts');
            };
        });
    }
    
    /**
     * Gets a beast by ID
     * @param {string} id - Beast ID
     * @returns {Promise} Resolves with beast object
     */
    function getBeastById(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([BEAST_STORE], 'readonly');
            const store = transaction.objectStore(BEAST_STORE);
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    reject(`Beast with ID ${id} not found`);
                }
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error getting beast');
            };
        });
    }
    
    /**
     * Gets beasts by filtering criteria
     * @param {Object} filters - Filter criteria (name, cr, size, type)
     * @returns {Promise} Resolves with array of matching beasts
     */
    function getFilteredBeasts(filters = {}) {
        return new Promise((resolve, reject) => {
            getAllBeasts()
                .then(beasts => {
                    let filtered = beasts;
                    
                    // Apply name filter (case-insensitive partial match)
                    if (filters.name) {
                        const nameLower = filters.name.toLowerCase();
                        filtered = filtered.filter(beast => 
                            beast.name.toLowerCase().includes(nameLower)
                        );
                    }
                    
                    // Apply CR filter (exact match)
                    if (filters.cr && filters.cr !== 'all') {
                        filtered = filtered.filter(beast => beast.cr === filters.cr);
                    }
                    
                    // Apply size filter (exact match)
                    if (filters.size && filters.size !== 'all') {
                        filtered = filtered.filter(beast => beast.size === filters.size);
                    }
                    
                    // Apply type filter (exact match)
                    if (filters.type) {
                        filtered = filtered.filter(beast => beast.type === filters.type);
                    }
                    
                    resolve(filtered);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
    
    /**
     * Adds a beast to favorites
     * @param {string} beastId - ID of beast to favorite
     * @returns {Promise} Resolves when complete
     */
    function addFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(FAVORITES_STORE);
            
            const favorite = {
                id: beastId,
                dateAdded: new Date()
            };
            
            const request = store.put(favorite);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error adding favorite');
            };
        });
    }
    
    /**
     * Removes a beast from favorites
     * @param {string} beastId - ID of beast to unfavorite
     * @returns {Promise} Resolves when complete
     */
    function removeFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(FAVORITES_STORE);
            
            const request = store.delete(beastId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error removing favorite');
            };
        });
    }
    
    /**
     * Checks if a beast is favorited
     * @param {string} beastId - Beast ID to check
     * @returns {Promise} Resolves with boolean
     */
    function isFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([FAVORITES_STORE], 'readonly');
            const store = transaction.objectStore(FAVORITES_STORE);
            
            const request = store.get(beastId);
            
            request.onsuccess = () => {
                resolve(!!request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error checking favorite status');
            };
        });
    }
    
    /**
     * Gets all favorite beasts
     * @returns {Promise} Resolves with array of favorite beast objects
     */
    function getAllFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([FAVORITES_STORE, BEAST_STORE], 'readonly');
            const favStore = transaction.objectStore(FAVORITES_STORE);
            const beastStore = transaction.objectStore(BEAST_STORE);
            
            const favRequest = favStore.getAll();
            
            favRequest.onsuccess = () => {
                const favorites = favRequest.result;
                const favoriteBeasts = [];
                let processed = 0;
                
                if (favorites.length === 0) {
                    resolve([]);
                    return;
                }
                
                favorites.forEach(fav => {
                    const beastRequest = beastStore.get(fav.id);
                    
                    beastRequest.onsuccess = () => {
                        if (beastRequest.result) {
                            favoriteBeasts.push(beastRequest.result);
                        }
                        
                        processed++;
                        if (processed === favorites.length) {
                            resolve(favoriteBeasts);
                        }
                    };
                    
                    beastRequest.onerror = (event) => {
                        console.error('Beast request error:', event.target.error);
                        processed++;
                        if (processed === favorites.length) {
                            resolve(favoriteBeasts);
                        }
                    };
                });
            };
            
            favRequest.onerror = (event) => {
                console.error('Favorites request error:', event.target.error);
                reject('Error getting favorites');
            };
        });
    }
    
    /**
     * Clears all data from the database
     * @returns {Promise} Resolves when complete
     */
    function clearAllData() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([BEAST_STORE, FAVORITES_STORE], 'readwrite');
            const beastStore = transaction.objectStore(BEAST_STORE);
            const favStore = transaction.objectStore(FAVORITES_STORE);
            
            const beastClearRequest = beastStore.clear();
            const favClearRequest = favStore.clear();
            
            let clearCount = 0;
            const checkComplete = () => {
                clearCount++;
                if (clearCount === 2) {
                    resolve();
                }
            };
            
            beastClearRequest.onsuccess = checkComplete;
            favClearRequest.onsuccess = checkComplete;
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                reject('Error clearing data');
            };
        });
    }
    
    /**
     * Loads beast data from markdown text
     * @param {string} markdownText - Markdown text containing beast data
     * @returns {Promise} Resolves with number of beasts loaded
     */
    function loadBeastData(markdownText) {
        return new Promise((resolve, reject) => {
            try {
                const beasts = parseMarkdown(markdownText);
                
                if (beasts.length === 0) {
                    reject('No beasts found in markdown');
                    return;
                }
                
                saveBeasts(beasts)
                    .then(count => {
                        resolve(count);
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                console.error('Error parsing markdown:', error);
                reject('Error parsing markdown');
            }
        });
    }
    
    // Public API
    return {
        initDatabase,
        parseMarkdown,
        saveBeasts,
        getAllBeasts,
        getBeastById,
        getFilteredBeasts,
        addFavorite,
        removeFavorite,
        isFavorite,
        getAllFavorites,
        clearAllData,
        loadBeastData
    };
})();