/**
 * data.js - Data management module for the Druid's Assistant
 * Handles IndexedDB setup, markdown parsing, and beast data management
 * Includes default favorites: wolf, velociraptor, giant owl
 */

const DataManager = (function() {
    /**
     * Initializes the database with beast data imported from bundler
     * @param {Array} beastData - Array of beast objects from markdown parser
     * @returns {Promise} Resolves when database is initialized with data
     */
    async function initializeDatabase(beastData) {
        console.log("Initializing database with beast data from bundler...");
        try {
            // First initialize the database
            const db = await initDatabase();
            
            // Check if we already have beasts
            const existingBeasts = await getAllBeasts();
            
            if (existingBeasts.length === 0) {
                console.log(`Importing ${beastData.length} beasts from bundled data...`);
                // No beasts found, import the data
                await saveBeasts(beastData);
                console.log("Beast data imported successfully!");
            } else {
                console.log(`Database already contains ${existingBeasts.length} beasts, skipping import.`);
            }
            
            return beastData.length;
        } catch (error) {
            console.error('Error initializing database with beast data:', error);
            throw error;
        }
    }
    // Database configuration
    const DB_NAME = 'DruidsAssistantDB';
    const DB_VERSION = 3;
    const BEAST_STORE = 'beasts';
const FAVORITES_STORE = 'favorites';
const WILDSHAPE_FAVORITES_STORE = 'wildshapeFavorites';
const CONJURE_FAVORITES_STORE = 'conjureFavorites';

// New constants for spell stores
const SPELL_STORE = 'spells';
const PREPARED_SPELLS_STORE = 'preparedSpells';
const SPELL_SLOTS_STORE = 'spellSlots';
    
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
                const oldVersion = event.oldVersion;
                
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
                
                // New stores for separate favorites (added in version 2)
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains(WILDSHAPE_FAVORITES_STORE)) {
                        db.createObjectStore(WILDSHAPE_FAVORITES_STORE, { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains(CONJURE_FAVORITES_STORE)) {
                        db.createObjectStore(CONJURE_FAVORITES_STORE, { keyPath: 'id' });
                    }
                    
                    // Migrate existing favorites if upgrading from v1 to v2
                    if (oldVersion === 1 && db.objectStoreNames.contains(FAVORITES_STORE)) {
                        // We'll handle the migration after the upgrade completes
                        console.log('Will migrate favorites to separate stores');
                    }
                }
                
                // Add spell stores (new version 3)
                if (oldVersion < 3) {
                    addSpellStores(db, oldVersion);
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
        console.log("Starting markdown parsing...");
        
        // Validate input
        if (!markdown || typeof markdown !== 'string') {
            console.error("Invalid markdown input:", markdown);
            return [];
        }
        
        if (markdown.length < 100) {
            console.warn("Markdown seems too short:", markdown);
        }
        
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
                // Ensure name is valid and create a consistent ID
                const id = name.toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
                    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
                
                console.log(`Parsing beast: ${name}, ID: ${id}`);
                
                currentBeast = {
                    id: id,
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
                // Handle ability scores table
                else if (line.startsWith('>|STR|DEX|CON|INT|WIS|CHA|')) {
                    try {
                        // The ability scores table typically consists of three lines:
                        // >|STR|DEX|CON|INT|WIS|CHA|
                        // >|:---:|:---:|:---:|:---:|:---:|:---:|
                        // >|19 (+4)|13 (+1)|17 (+3)|2 (-4)|12 (+1)|5 (-3)|
                        
                        // Skip the separator line (line with :---:)
                        i += 1;
                        
                        // Get the values line (should be two lines after the header)
                        if (i + 1 < lines.length) {
                            const valuesLine = lines[i + 1].trim();
                            
                            // Validate this is the values line
                            if (valuesLine.startsWith('>|') && valuesLine.endsWith('|')) {
                                // Extract the values, remove leading >| and trailing |
                                const values = valuesLine.substring(2, valuesLine.length - 1).split('|');
                                
                                // Verify we have exactly 6 values
                                if (values.length === 6) {
                                    // Create the abilities object with correct mapping
                                    currentBeast.abilities = {
                                        str: values[0].trim(),
                                        dex: values[1].trim(),
                                        con: values[2].trim(),
                                        int: values[3].trim(),
                                        wis: values[4].trim(),
                                        cha: values[5].trim()
                                    };
                                    
                                    console.log(`Parsed abilities for ${currentBeast.name}:`, currentBeast.abilities);
                                    
                                    // Skip the values line since we've processed it
                                    i += 1;
                                } else {
                                    throw new Error(`Expected 6 ability values, found ${values.length} in line: ${valuesLine}`);
                                }
                            } else {
                                throw new Error(`Expected ability score values line, found: ${valuesLine}`);
                            }
                        } else {
                            throw new Error('Unexpected end of file when parsing ability scores');
                        }
                    } catch (error) {
                        console.error(`Error parsing ability scores for ${currentBeast.name}:`, error);
                        // Use default abilities as fallback
                        currentBeast.abilities = {
                            str: "10 (+0)",
                            dex: "10 (+0)",
                            con: "10 (+0)",
                            int: "10 (+0)",
                            wis: "10 (+0)",
                            cha: "10 (+0)"
                        };
                    }
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
                        
                        if (currentSection === 'actions') {
                            currentBeast.actions.push({
                                name: traitName,
                                desc: traitDesc
                            });
                        } else if (currentSection === 'reactions') {
                            currentBeast.reactions.push({
                                name: traitName,
                                desc: traitDesc
                            });
                        } else if (currentSection === 'legendaryActions') {
                            currentBeast.legendaryActions.push({
                                name: traitName,
                                desc: traitDesc
                            });
                        } else {
                            currentBeast.traits.push({
                                name: traitName,
                                desc: traitDesc
                            });
                        }
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
        
        // Process each beast to extract attack information and fix any formatting issues
        beasts.forEach(beast => {
            // Add default abilities if missing
            if (!beast.abilities) {
                console.warn(`Beast ${beast.name} is missing ability scores, using defaults`);
                beast.abilities = {
                    str: "10 (+0)",
                    dex: "10 (+0)",
                    con: "10 (+0)",
                    int: "10 (+0)",
                    wis: "10 (+0)",
                    cha: "10 (+0)"
                };
            }
            
            // Process traits and actions to find attack information
            processAttackInfo(beast);
        });
        
        console.log(`Successfully parsed ${beasts.length} beasts`);
        return beasts;
    }
    
    /**
     * Processes a beast to extract attack information from actions and traits
     * @param {Object} beast - Beast object to process
     */
    function processAttackInfo(beast) {
        // Process actions
        if (beast.actions) {
            beast.actions.forEach(action => {
                if (action.desc.includes('Weapon Attack:') || action.desc.includes('Melee Attack:') || action.desc.includes('Ranged Attack:')) {
                    const attackMatch = action.desc.match(/([A-Za-z]+ (?:Weapon|Melee|Ranged) Attack:)\s*\+(\d+) to hit/);
                    if (attackMatch) {
                        action.attackType = attackMatch[1];
                        action.attackBonus = attackMatch[2];
                    }
                    
                    const damageMatch = action.desc.match(/Hit: (\d+) \(([^\)]+)\) ([a-z]+) damage/);
                    if (damageMatch) {
                        action.damageAvg = damageMatch[1];
                        action.damageDice = damageMatch[2];
                        action.damageType = damageMatch[3];
                    }
                }
            });
        }
        
        // Process traits for attack information (some beasts have attacks in traits)
        if (beast.traits && (!beast.actions || beast.actions.length === 0)) {
            beast.traits.forEach(trait => {
                if (trait.desc.includes('Weapon Attack:') || trait.desc.includes('Melee Attack:') || trait.desc.includes('Ranged Attack:')) {
                    // If this trait is an attack, create an action from it
                    const attackMatch = trait.desc.match(/([A-Za-z]+ (?:Weapon|Melee|Ranged) Attack:)\s*\+(\d+) to hit/);
                    const damageMatch = trait.desc.match(/Hit: (\d+) \(([^\)]+)\) ([a-z]+) damage/);
                    
                    if (attackMatch) {
                        // Create a new action based on this trait
                        const action = {
                            name: trait.name,
                            desc: trait.desc,
                            attackType: attackMatch[1],
                            attackBonus: attackMatch[2]
                        };
                        
                        if (damageMatch) {
                            action.damageAvg = damageMatch[1];
                            action.damageDice = damageMatch[2];
                            action.damageType = damageMatch[3];
                        }
                        
                        // Add to actions
                        if (!beast.actions) {
                            beast.actions = [];
                        }
                        beast.actions.push(action);
                    }
                }
            });
        }
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
                try {
                    const request = store.put(beast);
                    request.onsuccess = () => {
                        savedCount++;
                    };
                    request.onerror = (event) => {
                        console.error(`Error saving beast ${beast.name}:`, event.target.error);
                    };
                } catch (e) {
                    console.error(`Exception while saving beast ${beast.name}:`, e);
                }
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
                console.log(`Retrieved ${request.result.length} beasts from database`);
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
            
            console.log(`Attempting to retrieve beast with ID: ${id}`);
            
            const transaction = db.transaction([BEAST_STORE], 'readonly');
            const store = transaction.objectStore(BEAST_STORE);
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log(`Found beast: ${request.result.name}`);
                    resolve(request.result);
                } else {
                    console.error(`Beast with ID ${id} not found, trying fallback lookup`);
                    
                    // Fallback: try to get all beasts and find by ID or name
                    getAllBeasts()
                        .then(beasts => {
                            // Try to find beast by ID (case insensitive)
                            const beast = beasts.find(b => 
                                b.id.toLowerCase() === id.toLowerCase() || 
                                b.name.toLowerCase() === id.toLowerCase().replace(/-/g, ' ')
                            );
                            
                            if (beast) {
                                console.log(`Found beast via fallback: ${beast.name}`);
                                resolve(beast);
                            } else {
                                reject(`Beast with ID ${id} not found`);
                            }
                        })
                        .catch(error => {
                            reject(error);
                        });
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
                    
                    // Helper function to convert CR to numeric value
                    const crToValue = (cr) => {
                        if (cr === '0') return 0;
                        if (cr === '1/8') return 0.125;
                        if (cr === '1/4') return 0.25;
                        if (cr === '1/2') return 0.5;
                        return parseFloat(cr);
                    };
                    
                    // Apply CR filter (exact match or range)
                    if (filters.cr && filters.cr !== 'all') {
                        if (filters.cr.includes('-')) {
                            // Range filter (e.g., "0-2")
                            const [minCR, maxCR] = filters.cr.split('-');
                            const minValue = crToValue(minCR.trim());
                            const maxValue = crToValue(maxCR.trim());
                            
                            filtered = filtered.filter(beast => {
                                const beastCRValue = crToValue(beast.cr);
                                return beastCRValue >= minValue && beastCRValue <= maxValue;
                            });
                        } else if (filters.cr.startsWith('<=')) {
                            // Less than or equal filter (e.g., "<=2")
                            const maxCR = filters.cr.substring(2).trim();
                            const maxValue = crToValue(maxCR);
                            
                            filtered = filtered.filter(beast => {
                                const beastCRValue = crToValue(beast.cr);
                                return beastCRValue <= maxValue;
                            });
                        } else if (filters.cr.startsWith('>=')) {
                            // Greater than or equal filter (e.g., ">=1")
                            const minCR = filters.cr.substring(2).trim();
                            const minValue = crToValue(minCR);
                            
                            filtered = filtered.filter(beast => {
                                const beastCRValue = crToValue(beast.cr);
                                return beastCRValue >= minValue;
                            });
                        } else {
                            // Exact match (e.g., "2")
                            filtered = filtered.filter(beast => beast.cr === filters.cr);
                        }
                    }
                    
                    // Helper function to convert size to numeric value
                    const sizeToValue = (size) => {
                        const sizeOrder = { 'Tiny': 1, 'Small': 2, 'Medium': 3, 'Large': 4, 'Huge': 5, 'Gargantuan': 6 };
                        return sizeOrder[size] || 0;
                    };
                    
                    // Apply size filter (exact match or range)
                    if (filters.size && filters.size !== 'all') {
                        if (filters.size.includes('-')) {
                            // Range filter (e.g., "Small-Large")
                            const [minSize, maxSize] = filters.size.split('-');
                            const minValue = sizeToValue(minSize.trim());
                            const maxValue = sizeToValue(maxSize.trim());
                            
                            filtered = filtered.filter(beast => {
                                const beastSizeValue = sizeToValue(beast.size);
                                return beastSizeValue >= minValue && beastSizeValue <= maxValue;
                            });
                        } else if (filters.size.startsWith('<=')) {
                            // Less than or equal filter (e.g., "<=Medium")
                            const maxSize = filters.size.substring(2).trim();
                            const maxValue = sizeToValue(maxSize);
                            
                            filtered = filtered.filter(beast => {
                                const beastSizeValue = sizeToValue(beast.size);
                                return beastSizeValue <= maxValue;
                            });
                        } else if (filters.size.startsWith('>=')) {
                            // Greater than or equal filter (e.g., ">=Large")
                            const minSize = filters.size.substring(2).trim();
                            const minValue = sizeToValue(minSize);
                            
                            filtered = filtered.filter(beast => {
                                const beastSizeValue = sizeToValue(beast.size);
                                return beastSizeValue >= minValue;
                            });
                        } else {
                            // Exact match (e.g., "Large")
                            filtered = filtered.filter(beast => beast.size === filters.size);
                        }
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
     * Adds a beast to wildshape favorites
     * @param {string} beastId - ID of beast to favorite
     * @returns {Promise} Resolves when complete
     */
    function addWildshapeFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([WILDSHAPE_FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(WILDSHAPE_FAVORITES_STORE);
            
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
                reject('Error adding wildshape favorite');
            };
        });
    }
    
    /**
     * Adds a beast to conjure favorites
     * @param {string} beastId - ID of beast to favorite
     * @returns {Promise} Resolves when complete
     */
    function addConjureFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(CONJURE_FAVORITES_STORE);
            
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
                reject('Error adding conjure favorite');
            };
        });
    }
    
    /**
     * Adds a beast to general favorites (legacy - for backwards compatibility)
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
     * Removes a beast from wildshape favorites
     * @param {string} beastId - ID of beast to unfavorite
     * @returns {Promise} Resolves when complete
     */
    function removeWildshapeFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([WILDSHAPE_FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(WILDSHAPE_FAVORITES_STORE);
            
            const request = store.delete(beastId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error removing wildshape favorite');
            };
        });
    }
    
    /**
     * Removes a beast from conjure favorites
     * @param {string} beastId - ID of beast to unfavorite
     * @returns {Promise} Resolves when complete
     */
    function removeConjureFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
            const store = transaction.objectStore(CONJURE_FAVORITES_STORE);
            
            const request = store.delete(beastId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error removing conjure favorite');
            };
        });
    }
    
    /**
     * Removes a beast from favorites (legacy - for backwards compatibility)
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
     * Checks if a beast is in wildshape favorites
     * @param {string} beastId - Beast ID to check
     * @returns {Promise} Resolves with boolean
     */
    function isWildshapeFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([WILDSHAPE_FAVORITES_STORE], 'readonly');
            const store = transaction.objectStore(WILDSHAPE_FAVORITES_STORE);
            
            const request = store.get(beastId);
            
            request.onsuccess = () => {
                resolve(!!request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error checking wildshape favorite status');
            };
        });
    }
    
    /**
     * Checks if a beast is in conjure favorites
     * @param {string} beastId - Beast ID to check
     * @returns {Promise} Resolves with boolean
     */
    function isConjureFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([CONJURE_FAVORITES_STORE], 'readonly');
            const store = transaction.objectStore(CONJURE_FAVORITES_STORE);
            
            const request = store.get(beastId);
            
            request.onsuccess = () => {
                resolve(!!request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error checking conjure favorite status');
            };
        });
    }
    
    /**
     * Checks if a beast is favorited (legacy - for backwards compatibility)
     * @param {string} beastId - Beast ID to check
     * @returns {Promise} Resolves with boolean
     */
    function isFavorite(beastId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            // Check both specific favorite stores and the legacy store
            Promise.all([
                isWildshapeFavorite(beastId).catch(() => false),
                isConjureFavorite(beastId).catch(() => false), 
                new Promise((res, rej) => {
                    const transaction = db.transaction([FAVORITES_STORE], 'readonly');
                    const store = transaction.objectStore(FAVORITES_STORE);
                    
                    const request = store.get(beastId);
                    
                    request.onsuccess = () => {
                        res(!!request.result);
                    };
                    
                    request.onerror = (event) => {
                        console.error('Request error:', event.target.error);
                        rej(false);
                    };
                })
            ])
            .then(results => {
                // If it's in any of the stores, consider it a favorite
                resolve(results.some(result => result === true));
            })
            .catch(error => {
                console.error('Error checking combined favorite status:', error);
                reject('Error checking favorite status');
            });
        });
    }
    
    /**
     * Gets all wildshape favorite beasts
     * @returns {Promise} Resolves with array of favorite beast objects
     */
    function getAllWildshapeFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([WILDSHAPE_FAVORITES_STORE, BEAST_STORE], 'readonly');
            const favStore = transaction.objectStore(WILDSHAPE_FAVORITES_STORE);
            const beastStore = transaction.objectStore(BEAST_STORE);
            
            const favRequest = favStore.getAll();
            
            favRequest.onsuccess = () => {
                const favorites = favRequest.result;
                const favoriteBeasts = [];
                let processed = 0;
                
                if (favorites.length === 0) {
                    // For wildshape, we'll use wolf and brown bear as defaults
                    ensureDefaultWildshapeFavorites()
                        .then(defaultFavorites => {
                            resolve(defaultFavorites);
                        })
                        .catch(error => {
                            console.error('Error ensuring default wildshape favorites:', error);
                            resolve([]);
                        });
                    return;
                }
                
                favorites.forEach(fav => {
                    const beastRequest = beastStore.get(fav.id);
                    
                    beastRequest.onsuccess = () => {
                        if (beastRequest.result) {
                            favoriteBeasts.push(beastRequest.result);
                        } else {
                            console.warn(`Favorite beast with ID ${fav.id} not found in beast store`);
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
                console.error('Wildshape favorites request error:', event.target.error);
                reject('Error getting wildshape favorites');
            };
        });
    }
    
    /**
     * Gets all conjure favorite beasts
     * @returns {Promise} Resolves with array of favorite beast objects
     */
    function getAllConjureFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([CONJURE_FAVORITES_STORE, BEAST_STORE], 'readonly');
            const favStore = transaction.objectStore(CONJURE_FAVORITES_STORE);
            const beastStore = transaction.objectStore(BEAST_STORE);
            
            const favRequest = favStore.getAll();
            
            favRequest.onsuccess = () => {
                const favorites = favRequest.result;
                const favoriteBeasts = [];
                let processed = 0;
                
                if (favorites.length === 0) {
                    // For conjure, we'll use wolf and velociraptor as defaults
                    ensureDefaultConjureFavorites()
                        .then(defaultFavorites => {
                            resolve(defaultFavorites);
                        })
                        .catch(error => {
                            console.error('Error ensuring default conjure favorites:', error);
                            resolve([]);
                        });
                    return;
                }
                
                favorites.forEach(fav => {
                    const beastRequest = beastStore.get(fav.id);
                    
                    beastRequest.onsuccess = () => {
                        if (beastRequest.result) {
                            favoriteBeasts.push(beastRequest.result);
                        } else {
                            console.warn(`Favorite beast with ID ${fav.id} not found in beast store`);
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
                console.error('Conjure favorites request error:', event.target.error);
                reject('Error getting conjure favorites');
            };
        });
    }
    
    /**
     * Gets all legacy favorite beasts
     * @returns {Promise} Resolves with array of favorite beast objects
     */
    function getAllFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            // Try to get favorites from the specific stores first
            Promise.all([
                getAllWildshapeFavorites().catch(() => []),
                getAllConjureFavorites().catch(() => [])
            ])
            .then(([wildshapeFavorites, conjureFavorites]) => {
                // If we have favorites in either specific store, combine them
                if (wildshapeFavorites.length > 0 || conjureFavorites.length > 0) {
                    // Combine and deduplicate by ID
                    const combinedFavorites = [...wildshapeFavorites];
                    const wildshapeIds = new Set(wildshapeFavorites.map(beast => beast.id));
                    
                    conjureFavorites.forEach(beast => {
                        if (!wildshapeIds.has(beast.id)) {
                            combinedFavorites.push(beast);
                        }
                    });
                    
                    resolve(combinedFavorites);
                    return;
                }
                
                // Fall back to legacy favorites if needed
                const transaction = db.transaction([FAVORITES_STORE, BEAST_STORE], 'readonly');
                const favStore = transaction.objectStore(FAVORITES_STORE);
                const beastStore = transaction.objectStore(BEAST_STORE);
                
                const favRequest = favStore.getAll();
                
                favRequest.onsuccess = () => {
                    const favorites = favRequest.result;
                    const favoriteBeasts = [];
                    let processed = 0;
                    
                    if (favorites.length === 0) {
                        // If no legacy favorites either, ensure defaults
                        ensureDefaultFavorites()
                            .then(defaultFavorites => {
                                resolve(defaultFavorites);
                            })
                            .catch(error => {
                                console.error('Error ensuring default favorites:', error);
                                resolve([]);
                            });
                        return;
                    }
                    
                    favorites.forEach(fav => {
                        const beastRequest = beastStore.get(fav.id);
                        
                        beastRequest.onsuccess = () => {
                            if (beastRequest.result) {
                                favoriteBeasts.push(beastRequest.result);
                            } else {
                                console.warn(`Favorite beast with ID ${fav.id} not found in beast store`);
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
            })
            .catch(error => {
                console.error('Error retrieving combined favorites:', error);
                reject('Error getting favorites');
            });
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
            
            const transaction = db.transaction(
                [BEAST_STORE, FAVORITES_STORE, WILDSHAPE_FAVORITES_STORE, CONJURE_FAVORITES_STORE, 
                 SPELL_STORE, PREPARED_SPELLS_STORE, SPELL_SLOTS_STORE], 'readwrite');
            
            const beastStore = transaction.objectStore(BEAST_STORE);
            const favStore = transaction.objectStore(FAVORITES_STORE);
            const wildshapeFavStore = transaction.objectStore(WILDSHAPE_FAVORITES_STORE);
            const conjureFavStore = transaction.objectStore(CONJURE_FAVORITES_STORE);
            const spellStore = transaction.objectStore(SPELL_STORE);
            const preparedSpellsStore = transaction.objectStore(PREPARED_SPELLS_STORE);
            const spellSlotsStore = transaction.objectStore(SPELL_SLOTS_STORE);
            
            const beastClearRequest = beastStore.clear();
            const favClearRequest = favStore.clear();
            const wildshapeFavClearRequest = wildshapeFavStore.clear();
            const conjureFavClearRequest = conjureFavStore.clear();
            const spellClearRequest = spellStore.clear();
            const preparedSpellsClearRequest = preparedSpellsStore.clear();
            const spellSlotsClearRequest = spellSlotsStore.clear();
            
            let clearCount = 0;
            const totalStores = 7; // Updated to include spell-related stores
            
            const checkComplete = () => {
                clearCount++;
                if (clearCount === totalStores) {
                    resolve();
                }
            };
            
            beastClearRequest.onsuccess = checkComplete;
            favClearRequest.onsuccess = checkComplete;
            wildshapeFavClearRequest.onsuccess = checkComplete;
            conjureFavClearRequest.onsuccess = checkComplete;
            spellClearRequest.onsuccess = checkComplete;
            preparedSpellsClearRequest.onsuccess = checkComplete;
            spellSlotsClearRequest.onsuccess = checkComplete;
            
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
                console.log('Starting beast data parsing from bundled markdown...');
                console.log(`Markdown text length: ${markdownText.length} characters`);
                // Parse the markdown text and extract beasts
                const beasts = parseMarkdown(markdownText);
                
                if (beasts.length === 0) {
                    console.error('No beasts found in markdown');
                    reject('No beasts found in markdown');
                    return;
                }
                
                console.log(`Parsed ${beasts.length} beasts, first beast: ${beasts[0].name}`);
                console.log('Sample beast ID:', beasts[0].id);
                
                // Debug the first few beasts
                beasts.slice(0, 3).forEach(beast => {
                    console.log(`Beast "${beast.name}" (ID: ${beast.id})`);
                    console.log(`  Size: ${beast.size}, Type: ${beast.type}, CR: ${beast.cr}`);
                    console.log(`  Abilities:`, beast.abilities);
                });
                
                saveBeasts(beasts)
                    .then(count => {
                        console.log(`Successfully saved ${count} beasts to IndexedDB`);
                        resolve(count);
                    })
                    .catch(error => {
                        console.error('Error saving beasts:', error);
                        reject(error);
                    });
            } catch (error) {
                console.error('Error parsing markdown:', error);
                reject('Error parsing markdown: ' + error.message);
            }
        });
    }
    
    /**
     * Ensures default wildshape favorites are available
     * @returns {Promise} Resolves with array of default favorite beast objects
     */
    function ensureDefaultWildshapeFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const defaultNames = [
                'Tiger',
                'Giant Toad',
                'Giant Hyena',
                'Dire Wolf',
                'Deinonychus',
                'Brown Bear',
                'Rhinoceros',
                'Quetzalcoatlus',
                'Giant Elk',
                'Giant Constrictor Snake',
                'Cave Bear'
            ];
            const defaultFavorites = [];
            
            // Get all beasts
            getAllBeasts().then(beasts => {
                // Find beasts that match our default names (case insensitive)
                const defaultBeasts = [];
                
                defaultNames.forEach(name => {
                    const beast = beasts.find(b => b.name.toLowerCase() === name.toLowerCase());
                    if (beast) {
                        defaultBeasts.push(beast);
                    } else {
                        console.log(`Default wildshape beast not found: ${name}`);
                    }
                });
                
                // Add all default beasts as favorites
                const favTransaction = db.transaction([WILDSHAPE_FAVORITES_STORE], 'readwrite');
                const favStore = favTransaction.objectStore(WILDSHAPE_FAVORITES_STORE);
                
                defaultBeasts.forEach(beast => {
                    const favorite = {
                        id: beast.id,
                        dateAdded: new Date()
                    };
                    
                    favStore.put(favorite);
                    defaultFavorites.push(beast);
                });
                
                favTransaction.oncomplete = () => {
                    console.log(`Added ${defaultBeasts.length} default wildshape favorites`);
                    resolve(defaultFavorites);
                };
                
                favTransaction.onerror = (event) => {
                    console.error('Error adding default wildshape favorites:', event.target.error);
                    resolve(defaultFavorites); // Still return the beasts even if we couldn't save them as favorites
                };
            }).catch(error => {
                console.error('Error getting beasts for default wildshape favorites:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Ensures default conjure favorites are available
     * @returns {Promise} Resolves with array of default favorite beast objects
     */
    function ensureDefaultConjureFavorites() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const defaultNames = [
                'Black Bear',
                'Constrictor Snake',
                'Elk',
                'Giant Owl',
                'Giant Poisonous Snake',
                'Hadrosaurus',
                'Ox',
                'Suturefly',
                'Velociraptor',
                'Wolf'
            ];
            
            // First make sure all the default beasts exist in the database
            // This addresses cases where some beasts might be missing
            ensureSutureflyExists()
                .then(() => getAllBeasts())
                .then(beasts => {
                    // First, clear existing favorites (for consistent results across browsers)
                    const clearTransaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
                    const clearStore = clearTransaction.objectStore(CONJURE_FAVORITES_STORE);
                    const clearRequest = clearStore.clear();
                    
                    // After clearing, add all the default beasts
                    clearRequest.onsuccess = () => {
                        // Find beasts that match our default names (case insensitive)
                        const defaultBeasts = [];
                        const missingBeasts = [];
                        
                        defaultNames.forEach(name => {
                            // Try multiple matching approaches for more robustness
                            const beast = beasts.find(b => 
                                b.name && (b.name.toLowerCase() === name.toLowerCase() || // Exact match
                                b.name.toLowerCase().includes(name.toLowerCase())) || // Partial match
                                (b.id && b.id.toLowerCase() === name.toLowerCase().replace(/\s+/g, '-')) // ID match
                            );
                            
                            if (beast) {
                                defaultBeasts.push(beast);
                            } else {
                                console.warn(`Default conjure beast not found: ${name}`);
                                missingBeasts.push(name);
                            }
                        });
                        
                        console.log(`Adding ${defaultBeasts.length} default conjure favorites: ${defaultBeasts.map(b => b.name).join(', ')}`);
                        
                        // Add all default beasts as favorites
                        const favTransaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
                        const favStore = favTransaction.objectStore(CONJURE_FAVORITES_STORE);
                        
                        // Keep track of how many beasts we've successfully added
                        let successCount = 0;
                        
                        defaultBeasts.forEach(beast => {
                            try {
                                const favorite = {
                                    id: beast.id,
                                    dateAdded: new Date()
                                };
                                
                                const request = favStore.put(favorite);
                                
                                request.onsuccess = () => {
                                    successCount++;
                                };
                                
                                request.onerror = (e) => {
                                    console.error(`Error adding ${beast.name} to conjure favorites:`, e.target.error);
                                };
                            } catch (e) {
                                console.error(`Exception adding ${beast.name} to conjure favorites:`, e);
                            }
                        });
                        
                        favTransaction.oncomplete = () => {
                            console.log(`Successfully added ${successCount} out of ${defaultBeasts.length} default conjure favorites`);
                            
                            // Return the beasts we successfully added
                            getAllConjureFavorites()
                                .then(favorites => {
                                    resolve(favorites);
                                })
                                .catch(error => {
                                    console.error('Error getting final conjure favorites list:', error);
                                    // Still resolve with the beasts we tried to add
                                    resolve(defaultBeasts);
                                });
                        };
                        
                        favTransaction.onerror = (event) => {
                            console.error('Error in conjure favorites transaction:', event.target.error);
                            // Still try to resolve with the default beasts
                            resolve(defaultBeasts);
                        };
                    };
                    
                    clearRequest.onerror = (event) => {
                        console.error('Error clearing conjure favorites:', event.target.error);
                        reject(event.target.error);
                    };
                }).catch(error => {
                    console.error('Error setting up default conjure favorites:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Ensures legacy default favorites (for backwards compatibility)
     * @returns {Promise} Resolves with array of default favorite beast objects
     */
    function ensureDefaultFavorites() {
        return new Promise((resolve, reject) => {
            // First check if we have favorites in the new stores
            Promise.all([
                getAllWildshapeFavorites().catch(() => []),
                getAllConjureFavorites().catch(() => [])
            ])
            .then(([wildshapeFavorites, conjureFavorites]) => {
                // If we have favorites in either specific store, combine them
                if (wildshapeFavorites.length > 0 || conjureFavorites.length > 0) {
                    // Combine and deduplicate
                    const combinedFavorites = [...wildshapeFavorites];
                    const wildshapeIds = new Set(wildshapeFavorites.map(beast => beast.id));
                    
                    conjureFavorites.forEach(beast => {
                        if (!wildshapeIds.has(beast.id)) {
                            combinedFavorites.push(beast);
                        }
                    });
                    
                    resolve(combinedFavorites);
                    return;
                }
            
                // Otherwise set up legacy defaults
                if (!db) {
                    reject('Database not initialized');
                    return;
                }
                
                // Use a combination of both wildshape and conjure favorites as defaults
                const defaultNames = [
                    'Wolf',
                    'Giant Owl',
                    'Brown Bear',
                    'Tiger',
                    'Velociraptor'
                ];
                const defaultFavorites = [];
                
                // Get all beasts
                getAllBeasts().then(beasts => {
                    // Find beasts that match our default names (case insensitive)
                    const defaultBeasts = [];
                    
                    defaultNames.forEach(name => {
                        const beast = beasts.find(b => b.name.toLowerCase() === name.toLowerCase());
                        if (beast) {
                            defaultBeasts.push(beast);
                        } else {
                            console.log(`Default beast not found: ${name}`);
                        }
                    });
                    
                    // Add all default beasts as favorites
                    const favTransaction = db.transaction([FAVORITES_STORE], 'readwrite');
                    const favStore = favTransaction.objectStore(FAVORITES_STORE);
                    
                    defaultBeasts.forEach(beast => {
                        const favorite = {
                            id: beast.id,
                            dateAdded: new Date()
                        };
                        
                        favStore.put(favorite);
                        defaultFavorites.push(beast);
                    });
                    
                    favTransaction.oncomplete = () => {
                        console.log(`Added ${defaultBeasts.length} default favorites`);
                        resolve(defaultFavorites);
                    };
                    
                    favTransaction.onerror = (event) => {
                        console.error('Error adding default favorites:', event.target.error);
                        resolve(defaultFavorites); // Still return the beasts even if we couldn't save them as favorites
                    };
                }).catch(error => {
                    console.error('Error getting beasts for default favorites:', error);
                    reject(error);
                });
            })
            .catch(error => {
                console.error('Error checking specific favorite stores:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Ensures the Suturefly beast exists in the database
     * This is a special case to fix the issue with Suturefly not appearing in favorites
     * @returns {Promise} Resolves when complete
     */
    /**
     * Ensures the Suturefly beast exists in the database and as a favorite without disturbing other favorites
     * @returns {Promise} Resolves when complete
     */
    function ensureSutureflyExists() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            console.log('🔍 DEBUG: Checking if Suturefly exists in database...');
            
            // Get all beasts first
            getAllBeasts().then(allBeasts => {
                console.log(`🔍 DEBUG: Found ${allBeasts.length} total beasts in database`);
                
                // Try to find Suturefly by name (case insensitive)
                const existingSuturefly = allBeasts.find(beast => 
                    beast.name && beast.name.toLowerCase() === 'suturefly'
                );
                
                // Set up a chain of promises to handle the rest of the logic
                let chain;
                
                if (existingSuturefly) {
                    console.log('✅ DEBUG: Suturefly already exists in database:', existingSuturefly);
                    chain = Promise.resolve(existingSuturefly);
                } else {
                    // Create the Suturefly beast
                    console.log('🔧 DEBUG: Creating Suturefly beast in database');
                    const suturefly = {
                        id: 'suturefly',
                        name: 'Suturefly',
                        size: 'Tiny',
                        type: 'beast',
                        alignment: 'unaligned',
                        environment: 'forest, grassland, hills',
                        ac: '13 (natural armor)',
                        hp: '2 (1d4)',
                        speed: '10 ft., fly 40 ft.',
                        abilities: {
                            str: '1 (-5)',
                            dex: '16 (+3)',
                            con: '10 (+0)',
                            int: '2 (-4)',
                            wis: '12 (+1)',
                            cha: '4 (-3)'
                        },
                        skills: 'Stealth +5',
                        senses: 'darkvision 30 ft., passive Perception 11',
                        languages: '-',
                        cr: '0',
                        xp: '10',
                        traits: [
                            {
                                name: 'Blood Scent',
                                desc: 'The suturefly has advantage on Wisdom (Perception) checks to detect creatures that don\'t have all their hit points.'
                            },
                            {
                                name: 'Swarming',
                                desc: 'Up to four sutureflies can share the same space at the same time.'
                            }
                        ],
                        actions: [
                            {
                                name: 'Proboscis',
                                desc: 'Melee Weapon Attack: +5 to hit, reach 0 ft., one creature. Hit: 1 piercing damage, and the suturefly locks into place and begins draining blood. While attached, the suturefly doesn\'t attack. Instead, at the start of each of the suturefly\'s turns, the target loses 1 hit point due to blood loss. The suturefly can detach itself by spending 5 feet of its movement. It does so after it drains 4 hit points of blood or the target dies. A creature, including the target, can use its action to detach the suturefly.'
                            }
                        ]
                    };
                    
                    // Save the beast in a promise chain
                    chain = new Promise((resolveSave, rejectSave) => {
                        const writeTransaction = db.transaction([BEAST_STORE], 'readwrite');
                        const writeStore = writeTransaction.objectStore(BEAST_STORE);
                        const writeRequest = writeStore.put(suturefly);
                        
                        writeRequest.onsuccess = () => {
                            console.log('✅ DEBUG: Successfully added Suturefly to database');
                            resolveSave(suturefly);
                        };
                        
                        writeRequest.onerror = (event) => {
                            console.error('❌ DEBUG: Error adding Suturefly to database:', event.target.error);
                            rejectSave(event.target.error);
                        };
                    });
                }
                
                // After Suturefly exists in the database, ensure it's in the conjure favorites
                // WITHOUT disrupting any other favorites
                chain.then(sutureflyBeast => {
                    return new Promise((resolveFav, rejectFav) => {
                        // First check if it's already in favorites
                        getAllConjureFavorites().then(favorites => {
                            // Check if Suturefly is already in favorites
                            const sutureflyFav = favorites.find(beast => 
                                beast.name && beast.name.toLowerCase() === 'suturefly'
                            );
                            
                            if (sutureflyFav) {
                                console.log('✅ DEBUG: Suturefly already in conjure favorites');
                                resolveFav();
                                return;
                            }
                            
                            // Suturefly is not in favorites, so add it
                            console.log('🔧 DEBUG: Adding Suturefly to conjure favorites');
                            
                            // Add to favorites without affecting other favorites
                            const writeTransaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
                            const writeStore = writeTransaction.objectStore(CONJURE_FAVORITES_STORE);
                            
                            const favorite = {
                                id: sutureflyBeast.id,
                                dateAdded: new Date()
                            };
                            
                            const writeRequest = writeStore.put(favorite); // Using put instead of add to avoid constraint errors
                            
                            writeRequest.onsuccess = () => {
                                console.log('✅ DEBUG: Successfully added Suturefly to conjure favorites');
                                resolveFav();
                            };
                            
                            writeRequest.onerror = (event) => {
                                console.error('❌ DEBUG: Error adding Suturefly to conjure favorites:', event.target.error);
                                rejectFav(event.target.error);
                            };
                        }).catch(err => {
                            console.error('❌ DEBUG: Error checking conjure favorites:', err);
                            rejectFav(err);
                        });
                    });
                }).then(() => {
                    // Finish the main promise
                    resolve();
                }).catch(error => {
                    console.error('❌ DEBUG: Error in Suturefly setup chain:', error);
                    reject(error);
                });
            }).catch(error => {
                console.error('❌ DEBUG: Error getting all beasts:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Adds spell stores to the database during initialization
     * @param {IDBDatabase} db - The database object
     * @param {number} oldVersion - Previous database version
     */
    function addSpellStores(db, oldVersion) {
        if (!db.objectStoreNames.contains(SPELL_STORE)) {
            const spellStore = db.createObjectStore(SPELL_STORE, { keyPath: 'id' });
            spellStore.createIndex('name', 'name', { unique: false });
            spellStore.createIndex('level', 'level', { unique: false });
            spellStore.createIndex('school', 'school', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(PREPARED_SPELLS_STORE)) {
            db.createObjectStore(PREPARED_SPELLS_STORE, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(SPELL_SLOTS_STORE)) {
            db.createObjectStore(SPELL_SLOTS_STORE, { keyPath: 'level' });
        }
    }

    /**
     * Parses markdown to extract spell data
     * @param {string} markdown - Markdown text containing spell data
     * @returns {Array} Array of spell objects
     */
    function parseSpellMarkdown(markdown) {
        const spells = [];
        let currentSpell = null;
        
        // Split markdown into lines
        const lines = markdown.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for spell header (starts with '#### ')
            if (line.startsWith('#### ')) {
                // If we were processing a spell, save it
                if (currentSpell) {
                    spells.push(currentSpell);
                }
                
                // Start a new spell
                const name = line.substring(5).trim();
                const id = name.toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                currentSpell = {
                    id: id,
                    name: name,
                    description: '',
                    components: [],
                    classes: []
                };
                continue;
            }
            
            // If not processing a spell, skip
            if (!currentSpell) continue;
            
            // Check for spell level and school line (e.g., '*1st-level abjuration*')
            if (line.startsWith('*') && line.endsWith('*')) {
                const levelSchoolText = line.substring(1, line.length - 1).trim();
                
                // Parse level
                if (levelSchoolText.includes('cantrip')) {
                    currentSpell.level = 0;
                    currentSpell.levelText = 'Cantrip';
                } else {
                    const levelMatch = levelSchoolText.match(/(\d+)(st|nd|rd|th)-level/);
                    if (levelMatch) {
                        currentSpell.level = parseInt(levelMatch[1]);
                        currentSpell.levelText = `${levelMatch[1]}${levelMatch[2]}-level`;
                    }
                }
                
                // Parse school
                const schoolMatch = levelSchoolText.match(/(abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i);
                if (schoolMatch) {
                    currentSpell.school = schoolMatch[1].toLowerCase();
                    // Capitalize first letter for display
                    currentSpell.schoolDisplay = schoolMatch[1].charAt(0).toUpperCase() + schoolMatch[1].slice(1);
                }
                continue;
            }
            
            // Check for end of basic info section
            if (line === '---') {
                // The next lines will be the description
                let descriptionLines = [];
                let j = i + 1;
                
                while (j < lines.length && 
                      !lines[j].trim().startsWith('**Classes:**') && 
                      !lines[j].trim().startsWith('#### ')) {
                    if (lines[j].trim().length > 0) {
                        descriptionLines.push(lines[j].trim());
                    }
                    j++;
                }
                
                if (descriptionLines.length > 0) {
                    currentSpell.description = descriptionLines.join('\n');
                }
                
                // Update i to continue from where we left off
                i = j - 1;
                continue;
            }
            
            // Check for casting time, range, components, duration
            if (line.startsWith('- **Casting Time:**')) {
                currentSpell.castingTime = line.substring(18).trim();
            }
            else if (line.startsWith('- **Range:**')) {
                currentSpell.range = line.substring(12).trim();
            }
            else if (line.startsWith('- **Components:**')) {
                const componentsText = line.substring(17).trim();
                currentSpell.componentsText = componentsText;
                
                // Parse individual components
                if (componentsText.includes('V')) currentSpell.components.push('verbal');
                if (componentsText.includes('S')) currentSpell.components.push('somatic');
                if (componentsText.includes('M')) {
                    currentSpell.components.push('material');
                    // Extract material components details
                    const materialMatch = componentsText.match(/M\s*\((.*?)\)/);
                    if (materialMatch) {
                        currentSpell.materialComponents = materialMatch[1];
                    }
                }
            }
            else if (line.startsWith('- **Duration:**')) {
                currentSpell.duration = line.substring(15).trim();
            }
            
            // Check for classes
            if (line.startsWith('**Classes:**')) {
                const classesText = line.substring(11).trim();
                currentSpell.classes = classesText.split(', ').map(c => c.trim());
                
                // Check if this is a Druid spell
                currentSpell.isDruidSpell = currentSpell.classes.includes('Druid');
            }
        }
        
        // Add the last spell if there is one
        if (currentSpell) {
            spells.push(currentSpell);
        }
        
        return spells;
    }

    /**
     * Saves spells to IndexedDB
     * @param {Array} spells - Array of spell objects to save
     * @returns {Promise} Resolves when save is complete
     */
    function saveSpells(spells) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_STORE], 'readwrite');
            const store = transaction.objectStore(SPELL_STORE);
            
            let savedCount = 0;
            
            transaction.oncomplete = () => {
                console.log(`Saved ${savedCount} spells`);
                resolve(savedCount);
            };
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                reject('Error saving spells');
            };
            
            spells.forEach(spell => {
                try {
                    const request = store.put(spell);
                    request.onsuccess = () => {
                        savedCount++;
                    };
                    request.onerror = (event) => {
                        console.error(`Error saving spell ${spell.name}:`, event.target.error);
                    };
                } catch (e) {
                    console.error(`Exception while saving spell ${spell.name}:`, e);
                }
            });
        });
    }

    /**
     * Gets all spells from IndexedDB
     * @returns {Promise} Resolves with array of spells
     */
    function getAllSpells() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_STORE], 'readonly');
            const store = transaction.objectStore(SPELL_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                console.log(`Retrieved ${request.result.length} spells from database`);
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error getting spells');
            };
        });
    }

    /**
     * Gets spells by filtering criteria
     * @param {Object} filters - Filter criteria (name, level, school, prepared)
     * @returns {Promise} Resolves with array of matching spells
     */
    function getFilteredSpells(filters = {}) {
        return new Promise((resolve, reject) => {
            // Get all spells and prepared spells in parallel
            Promise.all([
                getAllSpells(),
                getSpellsMetadata('preparedSpells')
            ])
            .then(([spells, preparedSpells]) => {
                let filtered = spells;
                
                // Filter by name (case-insensitive partial match)
                if (filters.name) {
                    const nameLower = filters.name.toLowerCase();
                    filtered = filtered.filter(spell => 
                        spell.name.toLowerCase().includes(nameLower)
                    );
                }
                
                // Filter by level
                if (filters.level && filters.level !== 'all') {
                    const levelValue = filters.level === 'cantrip' ? 0 : parseInt(filters.level);
                    filtered = filtered.filter(spell => spell.level === levelValue);
                }
                
                // Filter by school
                if (filters.school && filters.school !== 'all') {
                    filtered = filtered.filter(spell => spell.school === filters.school.toLowerCase());
                }
                
                // Filter by prepared status
                if (filters.prepared) {
                    const preparedIds = new Set(Object.keys(preparedSpells));
                    filtered = filtered.filter(spell => preparedIds.has(spell.id));
                }
                
                // Filter Druid spells only
                if (filters.druidsOnly) {
                    filtered = filtered.filter(spell => spell.isDruidSpell);
                }
                
                resolve(filtered);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    /**
     * Gets a single spell by ID
     * @param {string} id - Spell ID to retrieve
     * @returns {Promise} Resolves with spell object
     */
    function getSpellById(id) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_STORE], 'readonly');
            const store = transaction.objectStore(SPELL_STORE);
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    reject(`Spell with ID ${id} not found`);
                }
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error getting spell');
            };
        });
    }

    /**
     * Manages prepared spells (toggle preparation state)
     * @param {string} spellId - ID of spell to toggle
     * @returns {Promise} Resolves with boolean indicating if spell is now prepared
     */
    function togglePreparedSpell(spellId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            isPreparedSpell(spellId)
                .then(isPrepared => {
                    const transaction = db.transaction([PREPARED_SPELLS_STORE], 'readwrite');
                    const store = transaction.objectStore(PREPARED_SPELLS_STORE);
                    
                    if (isPrepared) {
                        // Remove from prepared spells
                        const request = store.delete(spellId);
                        
                        request.onsuccess = () => {
                            resolve(false); // Not prepared anymore
                        };
                        
                        request.onerror = (event) => {
                            console.error('Error removing prepared spell:', event.target.error);
                            reject('Error removing prepared spell');
                        };
                    } else {
                        // Add to prepared spells
                        const preparedSpell = {
                            id: spellId,
                            dateAdded: new Date()
                        };
                        
                        const request = store.put(preparedSpell);
                        
                        request.onsuccess = () => {
                            resolve(true); // Now prepared
                        };
                        
                        request.onerror = (event) => {
                            console.error('Error adding prepared spell:', event.target.error);
                            reject('Error adding prepared spell');
                        };
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Checks if a spell is prepared
     * @param {string} spellId - ID of spell to check
     * @returns {Promise} Resolves with boolean
     */
    function isPreparedSpell(spellId) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([PREPARED_SPELLS_STORE], 'readonly');
            const store = transaction.objectStore(PREPARED_SPELLS_STORE);
            const request = store.get(spellId);
            
            request.onsuccess = () => {
                resolve(!!request.result);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error checking prepared spell status');
            };
        });
    }

    /**
     * Gets all prepared spells
     * @returns {Promise} Resolves with array of prepared spell objects
     */
    function getAllPreparedSpells() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            // Get prepared spell IDs and full spell details
            Promise.all([
                getSpellsMetadata('preparedSpells'),
                getAllSpells()
            ])
            .then(([preparedSpellsMap, allSpells]) => {
                const preparedIds = Object.keys(preparedSpellsMap);
                const preparedSpells = allSpells.filter(spell => preparedIds.includes(spell.id));
                resolve(preparedSpells);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    /**
     * Gets spell metadata (like preparation status)
     * @param {string} storeType - Type of metadata store to use ('preparedSpells')
     * @returns {Promise} Resolves with object mapping spell IDs to metadata
     */
    function getSpellsMetadata(storeType) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            let storeName;
            if (storeType === 'preparedSpells') {
                storeName = PREPARED_SPELLS_STORE;
            } else {
                reject('Invalid metadata store type');
                return;
            }
            
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Convert array to object with spell IDs as keys
                const metadata = {};
                request.result.forEach(item => {
                    metadata[item.id] = item;
                });
                
                resolve(metadata);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject(`Error getting ${storeType}`);
            };
        });
    }

    /**
     * Initialize or update spell slot configuration
     * @param {Object} config - Spell slot configuration by level
     * @returns {Promise} Resolves when complete
     */
    function updateSpellSlotConfig(config) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_SLOTS_STORE], 'readwrite');
            const store = transaction.objectStore(SPELL_SLOTS_STORE);
            
            // First clear existing data
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                // Then add each level's configuration
                for (const [level, slots] of Object.entries(config)) {
                    const slotConfig = {
                        level: parseInt(level),
                        totalSlots: slots,
                        usedSlots: 0,
                        dateModified: new Date()
                    };
                    
                    store.put(slotConfig);
                }
            };
            
            transaction.oncomplete = () => {
                resolve();
            };
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event.target.error);
                reject('Error updating spell slot configuration');
            };
        });
    }

    /**
     * Get current spell slot status
     * @returns {Promise} Resolves with spell slot configuration
     */
    function getSpellSlotStatus() {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_SLOTS_STORE], 'readonly');
            const store = transaction.objectStore(SPELL_SLOTS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Convert to object with level as key
                const slotStatus = {};
                request.result.forEach(slot => {
                    slotStatus[slot.level] = {
                        totalSlots: slot.totalSlots,
                        usedSlots: slot.usedSlots,
                        remainingSlots: slot.totalSlots - slot.usedSlots
                    };
                });
                
                // If no configuration is found, create a default one
                if (Object.keys(slotStatus).length === 0) {
                    const defaultConfig = createDefaultSpellSlotConfig();
                    updateSpellSlotConfig(defaultConfig)
                        .then(() => {
                            // Return the default config
                            Object.keys(defaultConfig).forEach(level => {
                                slotStatus[level] = {
                                    totalSlots: defaultConfig[level],
                                    usedSlots: 0,
                                    remainingSlots: defaultConfig[level]
                                };
                            });
                            resolve(slotStatus);
                        })
                        .catch(error => {
                            reject(error);
                        });
                } else {
                    resolve(slotStatus);
                }
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error getting spell slot status');
            };
        });
    }

    /**
     * Update usage status of a spell slot
     * @param {number} level - Spell slot level
     * @param {number} slotIndex - Index of the slot to toggle (1-based)
     * @returns {Promise} Resolves with new slot status
     */
    function toggleSpellSlot(level, slotIndex) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_SLOTS_STORE], 'readwrite');
            const store = transaction.objectStore(SPELL_SLOTS_STORE);
            const request = store.get(level);
            
            request.onsuccess = () => {
                let slotConfig = request.result;
                
                // If no config exists for this level, create a default one
                if (!slotConfig) {
                    const defaultSlots = level <= 9 ? (10 - level) : 0;
                    slotConfig = {
                        level: level,
                        totalSlots: defaultSlots,
                        usedSlots: 0,
                        dateModified: new Date()
                    };
                }
                
                // Toggle the slot status
                const isUsed = slotIndex <= slotConfig.usedSlots;
                
                if (isUsed) {
                    // If the slot is used, free it
                    slotConfig.usedSlots--;
                } else {
                    // If the slot is free, use it (but don't exceed totalSlots)
                    if (slotConfig.usedSlots < slotConfig.totalSlots) {
                        slotConfig.usedSlots++;
                    }
                }
                
                slotConfig.dateModified = new Date();
                
                // Save the updated config
                store.put(slotConfig);
                
                // Return the new status
                const newStatus = {
                    totalSlots: slotConfig.totalSlots,
                    usedSlots: slotConfig.usedSlots,
                    remainingSlots: slotConfig.totalSlots - slotConfig.usedSlots
                };
                
                resolve(newStatus);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error updating spell slot status');
            };
        });
    }

    /**
     * Reset all spell slots of a specific level
     * @param {number} level - Spell slot level to reset
     * @returns {Promise} Resolves with new slot status
     */
    function resetSpellSlots(level) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject('Database not initialized');
                return;
            }
            
            const transaction = db.transaction([SPELL_SLOTS_STORE], 'readwrite');
            const store = transaction.objectStore(SPELL_SLOTS_STORE);
            const request = store.get(level);
            
            request.onsuccess = () => {
                let slotConfig = request.result;
                
                // If no config exists for this level, create a default one
                if (!slotConfig) {
                    const defaultSlots = level <= 9 ? (10 - level) : 0;
                    slotConfig = {
                        level: level,
                        totalSlots: defaultSlots,
                        usedSlots: 0,
                        dateModified: new Date()
                    };
                } else {
                    // Reset used slots to 0
                    slotConfig.usedSlots = 0;
                    slotConfig.dateModified = new Date();
                }
                
                // Save the updated config
                store.put(slotConfig);
                
                // Return the new status
                const newStatus = {
                    totalSlots: slotConfig.totalSlots,
                    usedSlots: 0,
                    remainingSlots: slotConfig.totalSlots
                };
                
                resolve(newStatus);
            };
            
            request.onerror = (event) => {
                console.error('Request error:', event.target.error);
                reject('Error resetting spell slots');
            };
        });
    }

    /**
     * Create a default spell slot configuration based on a standard Druid
     * @returns {Object} Default spell slot configuration
     */
    function createDefaultSpellSlotConfig() {
        return {
            1: 4, // 4 level 1 slots
            2: 3, // 3 level 2 slots
            3: 3, // 3 level 3 slots
            4: 3, // 3 level 4 slots
            5: 2, // 2 level 5 slots
            6: 1, // 1 level 6 slots
            7: 1, // 1 level 7 slots
            8: 1, // 1 level 8 slots
            9: 1  // 1 level 9 slots
        };
    }
    
    /**
     * Loads spell data from markdown text
     * @param {string} markdownText - Markdown text containing spell data
     * @returns {Promise} Resolves with number of spells loaded
     */
    function loadSpellData(markdownText) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting spell data parsing from markdown...');
                console.log(`Markdown text length: ${markdownText.length} characters`);
                
                // Parse the markdown text and extract spells
                const spells = parseSpellMarkdown(markdownText);
                
                if (spells.length === 0) {
                    console.error('No spells found in markdown');
                    reject('No spells found in markdown');
                    return;
                }
                
                console.log(`Parsed ${spells.length} spells, first spell: ${spells[0].name}`);
                
                // Debug the first few spells
                spells.slice(0, 3).forEach(spell => {
                    console.log(`Spell "${spell.name}" (ID: ${spell.id})`);
                    console.log(`  Level: ${spell.level}, School: ${spell.school}`);
                    console.log(`  Is Druid Spell: ${spell.isDruidSpell}`);
                });
                
                saveSpells(spells)
                    .then(count => {
                        console.log(`Successfully saved ${count} spells to IndexedDB`);
                        resolve(count);
                    })
                    .catch(error => {
                        console.error('Error saving spells:', error);
                        reject(error);
                    });
            } catch (error) {
                console.error('Error parsing spell markdown:', error);
                reject('Error parsing spell markdown: ' + error.message);
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
        // Original favorites API (for backwards compatibility)
        addFavorite,
        removeFavorite,
        isFavorite,
        getAllFavorites,
        ensureDefaultFavorites,
        // New separate favorites API
        addWildshapeFavorite,
        removeWildshapeFavorite,
        isWildshapeFavorite,
        getAllWildshapeFavorites,
        ensureDefaultWildshapeFavorites,
        addConjureFavorite,
        removeConjureFavorite,
        isConjureFavorite,
        getAllConjureFavorites,
        ensureDefaultConjureFavorites,
        // Suturefly-specific method
        ensureSutureflyExists,
        // Other methods
        clearAllData,
        loadBeastData,
        // Bundler-specific methods
        initializeDatabase,
        // Spell Data Management
        parseSpellMarkdown,
        saveSpells,
        loadSpellData,
        getAllSpells,
        getSpellById,
        getFilteredSpells,
        // Prepared Spells Management
        togglePreparedSpell,
        isPreparedSpell,
        getAllPreparedSpells,
        // Spell Slots Management
        getSpellSlotStatus,
        updateSpellSlotConfig,
        toggleSpellSlot,
        resetSpellSlots,
        createDefaultSpellSlotConfig
    };
})();