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
    const DB_VERSION = 2;
    const BEAST_STORE = 'beasts';
    const FAVORITES_STORE = 'favorites';
    const WILDSHAPE_FAVORITES_STORE = 'wildshapeFavorites';
    const CONJURE_FAVORITES_STORE = 'conjureFavorites';
    
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
                        console.log(`Default conjure beast not found: ${name}`);
                    }
                });
                
                // Add all default beasts as favorites
                const favTransaction = db.transaction([CONJURE_FAVORITES_STORE], 'readwrite');
                const favStore = favTransaction.objectStore(CONJURE_FAVORITES_STORE);
                
                defaultBeasts.forEach(beast => {
                    const favorite = {
                        id: beast.id,
                        dateAdded: new Date()
                    };
                    
                    favStore.put(favorite);
                    defaultFavorites.push(beast);
                });
                
                favTransaction.oncomplete = () => {
                    console.log(`Added ${defaultBeasts.length} default conjure favorites`);
                    resolve(defaultFavorites);
                };
                
                favTransaction.onerror = (event) => {
                    console.error('Error adding default conjure favorites:', event.target.error);
                    resolve(defaultFavorites); // Still return the beasts even if we couldn't save them as favorites
                };
            }).catch(error => {
                console.error('Error getting beasts for default conjure favorites:', error);
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
        // Other methods
        clearAllData,
        loadBeastData,
        // Bundler-specific methods
        initializeDatabase
    };
})();