/**
 * spells.js - Spell management module for the Druid's Assistant
 * Handles spell list rendering, filtering, and display
 * Version 1.1 - Updated with improved spell management and spell descriptions
 */

const SpellManager = (function() {
    // DOM references
    const elements = {
        // Spell list and filtering
        spellList: document.getElementById('spellList'),
        spellSearch: document.getElementById('spellSearch'),
        clearSpellSearch: document.getElementById('clearSpellSearch'),
        druidLevel: document.getElementById('druidLevel'),
        preparedSpellsCount: document.getElementById('preparedSpellsCount'),
        spellSlotTracker: document.getElementById('spellSlotTracker'),
        
        // Spell level filter
        enableSpellLevelRange: document.getElementById('enableSpellLevelRange'),
        spellLevelRangeInputs: document.getElementById('spellLevelRangeInputs'),
        minSpellLevel: document.getElementById('minSpellLevel'),
        maxSpellLevel: document.getElementById('maxSpellLevel'),
        applySpellLevelFilter: document.getElementById('applySpellLevelFilter'),
        
        // Class filter
        classFilterButtons: document.getElementById('classFilterButtons'),
        
        // Spell list view tabs
        allSpellsBtn: document.getElementById('allSpellsBtn'),
        preparedSpellsBtn: document.getElementById('preparedSpellsBtn'),
        spellHistoryBtn: document.getElementById('spellHistoryBtn'),
        
        // Spell display
        spellDisplay: document.getElementById('spellDisplay'),
        prepareSpellButton: document.getElementById('prepareSpellButton'),
        castSpellButton: document.getElementById('castSpellButton'),
        
        // Buttons
        resetSpellSlotsBtn: document.getElementById('reset-spellslots-btn'),
        unprepareAllBtn: document.getElementById('unprepare-all-btn'),
        resetSpellFilters: document.getElementById('resetSpellFilters')
    };
    
    // Current state
    let currentSpell = null;
    let currentFilters = { name: '', level: 'all', class: 'all' };
    let currentSort = 'level';
    let currentSortDirection = 'desc'; // High-to-low by default - per requirements
    let currentView = 'all'; // 'all', 'prepared', or 'history'
    
    // User data
    let preparedSpells = []; // Array of spell IDs
    let spellHistory = []; // Array of {id: spellId, timestamp: Date, level: castLevel}
    let usedSpellSlots = {}; // {1: 0, 2: 0, ...} - Level: count used
    
    // Druid data
    const druidSpellSlots = {
        1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
        4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
        5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
        6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
        7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
        8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
        9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
        10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
        11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
        13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
        15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
        17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
        18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
        19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
        20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
    };
    
    /**
     * Updates the prepared spells count display
     */
    function updatePreparedSpellsCount() {
        const druidLevelValue = parseInt(elements.druidLevel.value);
        const maxPrepared = druidLevelValue + getWisdomModifier();
        const currentPrepared = preparedSpells.length;
        
        // Update the display
        elements.preparedSpellsCount.textContent = `${currentPrepared}/${maxPrepared} Prepared`;
        
        // Update styling if over limit
        if (currentPrepared > maxPrepared) {
            elements.preparedSpellsCount.classList.remove('bg-success');
            elements.preparedSpellsCount.classList.add('bg-danger');
            elements.preparedSpellsCount.style.fontWeight = 'bold';
        } else {
            elements.preparedSpellsCount.classList.remove('bg-danger');
            elements.preparedSpellsCount.classList.add('bg-success');
            elements.preparedSpellsCount.style.fontWeight = 'normal';
        }
    }
    
    /**
     * Gets the Wisdom modifier for the druid
     * Assumed to be +4 for simplicity (18-19 Wisdom)
     * @returns {number} Wisdom modifier
     */
    function getWisdomModifier() {
        // For simplicity, assume the druid has 18-19 Wisdom (+4 modifier)
        return 4;
    }
    
    /**
     * Initialize the spell slot tracker based on druid level
     */
    function initSpellSlotTracker() {
        const druidLevelValue = parseInt(elements.druidLevel.value);
        const slots = druidSpellSlots[druidLevelValue];
        
        let html = '';
        
        // For each spell level (1-9)
        for (let level = 1; level <= 9; level++) {
            const numSlots = slots[level - 1];
            if (numSlots > 0) {
                const levelLabel = getLevelString(level);
                
                html += `
                    <div class="spell-slot-group">
                        <div class="spell-slot-label">${levelLabel}</div>
                        <div class="d-flex gap-1">
                `;
                
                // Create slots for this level
                for (let i = 1; i <= numSlots; i++) {
                    const isUsed = usedSpellSlots[level] && usedSpellSlots[level] >= i;
                    html += `
                        <div class="spell-slot ${isUsed ? 'used' : ''}" 
                             data-level="${level}" 
                             data-index="${i}"
                             onclick="SpellManager.toggleSpellSlot(${level}, ${i})">
                            ${i}
                            <div class="spell-slot-level">${level}</div>
                        </div>
                    `;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        elements.spellSlotTracker.innerHTML = html;
    }
    
    /**
     * Toggles a spell slot's used/unused state
     * @param {number} level - Spell slot level
     * @param {number} index - Slot index (1-based)
     */
    function toggleSpellSlot(level, index) {
        // Initialize level if not exists
        if (!usedSpellSlots[level]) {
            usedSpellSlots[level] = 0;
        }
        
        // Check if this slot is currently used
        const isCurrentlyUsed = usedSpellSlots[level] >= index;
        
        if (isCurrentlyUsed) {
            // Mark this and all higher slots of same level as unused
            usedSpellSlots[level] = index - 1;
        } else {
            // Mark this and all lower slots of same level as used
            usedSpellSlots[level] = Math.max(usedSpellSlots[level], index);
        }
        
        // Update the display
        updateSpellSlotDisplay();
        
        // Save to local storage
        saveSpellData();
    }
    
    /**
     * Updates the spell slot display based on the current state
     */
    function updateSpellSlotDisplay() {
        // Update each spell slot element
        const slotElements = document.querySelectorAll('.spell-slot');
        
        slotElements.forEach(slot => {
            const level = parseInt(slot.dataset.level);
            const index = parseInt(slot.dataset.index);
            
            if (usedSpellSlots[level] && usedSpellSlots[level] >= index) {
                slot.classList.add('used');
            } else {
                slot.classList.remove('used');
            }
        });
    }
    
    /**
     * Resets all spell slots to unused
     */
    function resetSpellSlots() {
        usedSpellSlots = {};
        updateSpellSlotDisplay();
        saveSpellData();
    }
    
    /**
     * Unprepares all spells
     */
    function unprepareAllSpells() {
        preparedSpells = [];
        updatePreparedSpellsCount();
        
        // If in prepared view, re-render the list
        if (currentView === 'prepared') {
            showPreparedSpells();
        } else {
            // Just update the styles of list items
            const spellItems = document.querySelectorAll('.list-group-item[data-spell-id]');
            spellItems.forEach(item => {
                item.classList.remove('prepared-spell');
            });
        }
        
        // Disable cast button if current spell is no longer prepared
        if (currentSpell) {
            elements.castSpellButton.disabled = !isPrepared(currentSpell.id);
        }
        
        saveSpellData();
    }
    
    /**
     * Saves spell data to local storage
     */
    function saveSpellData() {
        try {
            localStorage.setItem('druidAssistant_preparedSpells', JSON.stringify(preparedSpells));
            localStorage.setItem('druidAssistant_spellHistory', JSON.stringify(spellHistory));
            localStorage.setItem('druidAssistant_usedSpellSlots', JSON.stringify(usedSpellSlots));
            localStorage.setItem('druidAssistant_druidLevel', elements.druidLevel.value);
        } catch (e) {
            console.error('Error saving spell data to local storage:', e);
        }
    }
    
    /**
     * Loads spell data from local storage
     */
    function loadSpellData() {
        try {
            // Load prepared spells
            const savedPreparedSpells = localStorage.getItem('druidAssistant_preparedSpells');
            if (savedPreparedSpells) {
                preparedSpells = JSON.parse(savedPreparedSpells);
            }
            
            // Load spell history
            const savedSpellHistory = localStorage.getItem('druidAssistant_spellHistory');
            if (savedSpellHistory) {
                spellHistory = JSON.parse(savedSpellHistory);
            }
            
            // Load used spell slots
            const savedUsedSpellSlots = localStorage.getItem('druidAssistant_usedSpellSlots');
            if (savedUsedSpellSlots) {
                usedSpellSlots = JSON.parse(savedUsedSpellSlots);
            }
            
            // Load druid level
            const savedDruidLevel = localStorage.getItem('druidAssistant_druidLevel');
            if (savedDruidLevel) {
                elements.druidLevel.value = savedDruidLevel;
            }
            
            // Update displays
            updatePreparedSpellsCount();
            initSpellSlotTracker();
        } catch (e) {
            console.error('Error loading spell data from local storage:', e);
        }
    }
    
    /**
     * Initializes the spell tab
     */
    function init() {
        console.log('Initializing Spells tab...');
        
        // Load spell data from local storage
        loadSpellData();
        
        // Initialize database and load spells from IndexedDB
        initSpellDatabase()
            .then(() => {
                console.log('Spell database initialized successfully');
                // Load spells into UI
                loadSpells();
            })
            .catch(error => {
                console.error('Error initializing spell database:', error);
                // Try to load spells anyway, in case the database already exists
                loadSpells();
            });
        
        // Set up event listeners
        setupEventListeners();
    }
    
    /**
     * Sets up event listeners for the spell tab
     */
    function setupEventListeners() {
        // Druid level change
        elements.druidLevel.addEventListener('change', function() {
            updatePreparedSpellsCount();
            initSpellSlotTracker();
            saveSpellData();
        });
        
        // Spell search
        elements.spellSearch.addEventListener('input', function() {
            currentFilters.name = this.value;
            applyFilters();
        });
        
        // Clear spell search
        elements.clearSpellSearch.addEventListener('click', function() {
            elements.spellSearch.value = '';
            currentFilters.name = '';
            applyFilters();
        });
        
        // Enable spell level range filter
        elements.enableSpellLevelRange.addEventListener('change', function() {
            elements.spellLevelRangeInputs.style.display = this.checked ? 'flex' : 'none';
            elements.minSpellLevel.disabled = !this.checked;
            elements.maxSpellLevel.disabled = !this.checked;
            
            if (!this.checked) {
                // If unchecked, reset to "all" levels
                currentFilters.level = 'all';
                applyFilters();
            }
        });
        
        // Apply spell level filter
        elements.applySpellLevelFilter.addEventListener('click', function() {
            if (elements.enableSpellLevelRange.checked) {
                const minLevel = elements.minSpellLevel.value;
                const maxLevel = elements.maxSpellLevel.value;
                
                if (minLevel === 'all' && maxLevel === 'all') {
                    // Both set to "Any", apply no level filter
                    currentFilters.level = 'all';
                } else if (minLevel === 'all') {
                    // Only max specified
                    currentFilters.level = `<=${maxLevel}`;
                } else if (maxLevel === 'all') {
                    // Only min specified
                    currentFilters.level = `>=${minLevel}`;
                } else {
                    // Both specified
                    currentFilters.level = `${minLevel}-${maxLevel}`;
                }
                
                applyFilters();
            }
        });
        
        // Spell list view tabs
        elements.allSpellsBtn.addEventListener('click', function() {
            setActiveViewButton(this);
            currentView = 'all';
            showAllSpells();
        });
        
        elements.preparedSpellsBtn.addEventListener('click', function() {
            setActiveViewButton(this);
            currentView = 'prepared';
            showPreparedSpells();
        });
        
        elements.spellHistoryBtn.addEventListener('click', function() {
            setActiveViewButton(this);
            currentView = 'history';
            showSpellHistory();
        });
        
        // Prepare spell button
        elements.prepareSpellButton.addEventListener('click', function() {
            if (currentSpell) {
                togglePreparedSpell(currentSpell.id);
            }
        });
        
        // Cast spell button
        elements.castSpellButton.addEventListener('click', function() {
            if (currentSpell) {
                castSpell(currentSpell);
            }
        });
        
        // Reset spell slots button
        elements.resetSpellSlotsBtn.addEventListener('click', function() {
            resetSpellSlots();
            
            // Also clear spell history
            spellHistory = [];
            saveSpellData();
            
            // If in history view, update display
            if (currentView === 'history') {
                showSpellHistory();
            }
        });
        
        // Unprepare all button
        elements.unprepareAllBtn.addEventListener('click', function() {
            if (preparedSpells.length > 0) {
                showFormattedConfirm(
                    'Unprepare All Spells',
                    'Are you sure you want to unprepare all spells?',
                    unprepareAllSpells,
                    null
                );
            } else {
                showFormattedAlert('No Spells Prepared', 'There are no prepared spells to unprepare.');
            }
        });
        
        // Reset filters button
        elements.resetSpellFilters.addEventListener('click', function() {
            resetFilters();
        });
        
        // Spell sort options
        document.querySelectorAll('.spell-sort-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Set sort options
                currentSort = this.dataset.sort;
                currentSortDirection = this.dataset.direction;
                
                // Update dropdown text
                let sortText = this.textContent;
                document.getElementById('spellSortDropdown').textContent = `Sort: ${sortText}`;
                
                // Re-sort and re-render current list
                if (currentView === 'all') {
                    showAllSpells();
                } else if (currentView === 'prepared') {
                    showPreparedSpells();
                } else {
                    showSpellHistory();
                }
            });
        });
    }
    
    /**
     * Sets the active view button
     * @param {Element} button - Button element to set as active
     */
    function setActiveViewButton(button) {
        // Remove active class from all buttons
        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-success');
        });
        
        // Add active class to selected button
        button.classList.add('active');
        button.classList.remove('btn-outline-success');
        button.classList.add('btn-success');
    }
    
    /**
     * Resets all filters to default values
     */
    function resetFilters() {
        // Reset filter values
        currentFilters = { name: '', level: 'all', class: 'all' };
        
        // Reset UI elements
        elements.spellSearch.value = '';
        elements.enableSpellLevelRange.checked = false;
        elements.spellLevelRangeInputs.style.display = 'none';
        elements.minSpellLevel.disabled = true;
        elements.maxSpellLevel.disabled = true;
        elements.minSpellLevel.value = 'all';
        elements.maxSpellLevel.value = 'all';
        
        // Reset class filter buttons if they exist
        const classButtons = document.querySelectorAll('#classFilterButtons .btn');
        classButtons.forEach(button => {
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-success');
            
            if (button.dataset.class === 'all') {
                button.classList.remove('btn-outline-success');
                button.classList.add('btn-success');
            }
        });
        
        // Re-apply filters
        applyFilters();
    }
    
    /**
     * Retrieves spells from IndexedDB
     * @returns {Promise} Promise that resolves with an array of spells
     */
    function getSpells() {
        return new Promise((resolve, reject) => {
            // Check if we have a SpellDB store in the database
            if (!db || !db.objectStoreNames.contains('spells')) {
                console.log('Spells database not found, initializing...');
                
                // Initialize the spell store in the IndexedDB
                initSpellDatabase()
                    .then(() => {
                        // Now load the spells
                        getSpellsFromDB()
                            .then(spells => resolve(spells))
                            .catch(error => reject(error));
                    })
                    .catch(error => reject(error));
            } else {
                // Database already exists, get spells
                getSpellsFromDB()
                    .then(spells => resolve(spells))
                    .catch(error => reject(error));
            }
        });
    }
    
    // Ref to IndexedDB instance
    let db = null;
    
    /**
     * Initializes the spell database
     */
    function initSpellDatabase() {
        return new Promise((resolve, reject) => {
            console.log('Initializing spell database...');
            
            try {
                // Open our database with a higher version to properly create the spells store
                const request = indexedDB.open('DruidsAssistantDB', 3); // Use version 3 to ensure upgrade
                
                request.onupgradeneeded = (event) => {
                    console.log('Database upgrade needed, creating spells store...');
                    const db = event.target.result;
                    const oldVersion = event.oldVersion;
                    
                    // Create beast store if it doesn't exist (for completeness)
                    if (!db.objectStoreNames.contains('beasts')) {
                        const beastStore = db.createObjectStore('beasts', { keyPath: 'id' });
                        beastStore.createIndex('name', 'name', { unique: false });
                        beastStore.createIndex('cr', 'cr', { unique: false });
                        beastStore.createIndex('type', 'type', { unique: false });
                    }
                    
                    // Create favorites stores if needed
                    if (!db.objectStoreNames.contains('favorites')) {
                        db.createObjectStore('favorites', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('wildshapeFavorites')) {
                        db.createObjectStore('wildshapeFavorites', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('conjureFavorites')) {
                        db.createObjectStore('conjureFavorites', { keyPath: 'id' });
                    }
                    
                    // Create spells store if it doesn't exist
                    if (!db.objectStoreNames.contains('spells')) {
                        const spellStore = db.createObjectStore('spells', { keyPath: 'id' });
                        spellStore.createIndex('name', 'name', { unique: false });
                        spellStore.createIndex('level', 'level', { unique: false });
                        spellStore.createIndex('school', 'school', { unique: false });
                        spellStore.createIndex('classes', 'classes', { unique: false });
                        console.log('Spells store created in IndexedDB');
                    }
                };
                
                request.onsuccess = (event) => {
                    db = event.target.result;
                    console.log('Successfully opened database, version:', db.version);
                    
                    // Check if there are any spells already in the database
                    try {
                        const transaction = db.transaction(['spells'], 'readonly');
                        const store = transaction.objectStore('spells');
                        const countRequest = store.count();
                        
                        countRequest.onsuccess = () => {
                            const count = countRequest.result;
                            console.log(`Found ${count} spells in database`);
                            
                            if (count === 0) {
                                // No spells found, import defaults
                                console.log('No spells found, importing defaults...');
                                importDefaultSpells()
                                    .then(() => resolve())
                                    .catch(error => {
                                        console.error('Error importing default spells:', error);
                                        reject(error);
                                    });
                            } else {
                                // Spells already exist, no need to import
                                console.log('Spells already exist in database, skipping import');
                                resolve();
                            }
                        };
                        
                        countRequest.onerror = (event) => {
                            console.error('Error counting spells:', event.target.error);
                            // Try to import anyway
                            importDefaultSpells()
                                .then(() => resolve())
                                .catch(error => reject(error));
                        };
                    } catch (error) {
                        console.error('Error checking for existing spells:', error);
                        // Try to import anyway
                        importDefaultSpells()
                            .then(() => resolve())
                            .catch(error => reject(error));
                    }
                };
                
                request.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                    reject('Could not open database: ' + event.target.error.message);
                };
                
                request.onblocked = (event) => {
                    console.warn('Database opening blocked, please close other tabs with this app');
                    alert('Database opening blocked. Please close other tabs with this app and try again.');
                };
            } catch (error) {
                console.error('Exception during spell database initialization:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Attempts to get the spell database from existing connections or creates a new one
     * @returns {Promise} Promise that resolves with the database
     */
    function getSpellDatabase() {
        return new Promise((resolve, reject) => {
            // If we already have a database connection, use it
            if (db) {
                resolve(db);
                return;
            }
            
            // Try to use DataManager's database
            if (window.DataManager && DataManager.getBeastDatabase) {
                DataManager.getBeastDatabase()
                    .then(database => {
                        db = database;
                        resolve(db);
                    })
                    .catch(error => {
                        // Couldn't get the database from DataManager, create our own
                        const request = indexedDB.open('DruidsAssistantDB', 1);
                        
                        request.onsuccess = (event) => {
                            db = event.target.result;
                            resolve(db);
                        };
                        
                        request.onerror = (event) => {
                            console.error('Database error:', event.target.error);
                            reject('Could not open database');
                        };
                    });
            } else {
                // No DataManager available, create our own connection
                const request = indexedDB.open('DruidsAssistantDB', 1);
                
                request.onsuccess = (event) => {
                    db = event.target.result;
                    resolve(db);
                };
                
                request.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                    reject('Could not open database');
                };
            }
        });
    }
    
    /**
     * Gets spells from the IndexedDB
     * @returns {Promise} Promise that resolves with an array of spells
     */
    function getSpellsFromDB() {
        return new Promise((resolve, reject) => {
            getSpellDatabase()
                .then(db => {
                    try {
                        const transaction = db.transaction(['spells'], 'readonly');
                        const store = transaction.objectStore('spells');
                        const request = store.getAll();
                        
                        request.onsuccess = () => {
                            const spells = request.result;
                            console.log(`Retrieved ${spells.length} spells from database`);
                            
                            // If no spells, try to import defaults
                            if (spells.length === 0) {
                            importDefaultSpells()
                            .then(() => {
                            // Retry getting spells
                            getSpellsFromDB()
                            .then(spells => {
                                // Sort spells by level (high to low) by default
                                        spells.sort((a, b) => b.level - a.level);
                                        resolve(spells);
                                            })
                                        .catch(error => reject(error));
                                    })
                    .catch(error => reject(error));
            } else {
                // Sort spells by level (high to low) by default
                spells.sort((a, b) => b.level - a.level);
                resolve(spells);
            }
                        };
                        
                        request.onerror = (event) => {
                            console.error('Request error:', event.target.error);
                            reject('Error getting spells');
                        };
                    } catch (error) {
                        console.error('Error in getSpellsFromDB:', error);
                        reject(error);
                    }
                })
                .catch(error => {
                    console.error('Error getting database:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Imports default spells from the bundled markdown file
     * @returns {Promise} Promise that resolves when spells are imported
     */
    function importDefaultSpells() {
        return new Promise((resolve, reject) => {
            console.log('Importing default spells...');
            try {
                // Check if spell data is in the window object
                if (window.spellData && typeof window.spellData === 'string' && window.spellData.length > 0) {
                    console.log(`Found spell data in window object (${window.spellData.length} characters), parsing...`);
                    const spells = parseSpellsMarkdown(window.spellData);
                    if (spells && Array.isArray(spells) && spells.length > 0) {
                        console.log(`Successfully parsed ${spells.length} spells, sorting and saving to DB...`);
                        // Sort spells by level (high to low) by default
                        spells.sort((a, b) => b.level - a.level);
                        saveSpellsToDB(spells)
                            .then(() => {
                                console.log(`Imported ${spells.length} default spells`);
                                resolve(spells);
                            })
                            .catch(error => {
                                console.error('Error saving spells to DB:', error);
                                reject(error);
                            });
                    } else {
                        console.warn('No spells found in default data or parsing failed');
                        tryFetchFromFile().then(resolve).catch(reject);
                    }
                } else {
                    console.log('No valid spell data in window object, trying to fetch from file...');
                    tryFetchFromFile().then(resolve).catch(reject);
                }
            } catch (error) {
                console.error('Error in importDefaultSpells:', error);
                tryFetchFromFile().then(resolve).catch(reject);
            }
            
            // Helper function to try fetching from file as fallback
            function tryFetchFromFile() {
                return new Promise((resolveFile, rejectFile) => {
                    console.log('Attempting to fetch spell data from file...');
                    fetch('spells-5etools-2014-subset-druid.md')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to fetch spell data: ${response.status} ${response.statusText}`);
                            }
                            return response.text();
                        })
                        .then(data => {
                            if (!data || data.length === 0) {
                                throw new Error('Fetched spell data is empty');
                            }
                            console.log(`Fetched spell data (${data.length} characters), parsing...`);
                            const spells = parseSpellsMarkdown(data);
                            if (spells && Array.isArray(spells) && spells.length > 0) {
                                console.log(`Successfully parsed ${spells.length} spells from file, saving to DB...`);
                                saveSpellsToDB(spells)
                                    .then(() => {
                                        console.log(`Imported ${spells.length} default spells from file`);
                                        resolveFile(spells);
                                    })
                                    .catch(error => rejectFile(error));
                            } else {
                                console.warn('No spells found in fetched data or parsing failed');
                                rejectFile(new Error('No spells found in fetched data or parsing failed'));
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching spell data from file:', error);
                            rejectFile(error);
                        });
                });
            }
        });
    }
    
    /**
     * Parses spells from markdown text
     * @param {string} markdown - Markdown text to parse
     * @returns {Array} Array of spell objects
     */
    function parseSpellsMarkdown(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            console.error('Invalid markdown input');
            return [];
        }
        
        console.log('Starting to parse spells markdown');
        console.log(`Markdown length: ${markdown.length} characters`);
        
        const spells = [];
        const lines = markdown.split('\n');
        let currentSpell = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for spell header (starts with "#### ")
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
                    level: 0, // Default to cantrip, will be updated
                    school: '',
                    castingTime: '',
                    range: '',
                    components: '',
                    duration: '',
                    description: '',
                    higherLevels: '',
                    classes: []
                };
                
                // Process the next line which should be the level and school
                if (i + 1 < lines.length) {
                    const levelSchoolLine = lines[i + 1].trim();
                    if (levelSchoolLine.startsWith('*')) {
                        const levelSchool = levelSchoolLine.replace(/^\*|\*$/g, '').trim();
                        
                        // Parse level and school
                        if (levelSchool.includes('cantrip')) {
                            currentSpell.level = 0;
                            currentSpell.school = levelSchool.replace('cantrip', '').trim();
                        } else {
                            const match = levelSchool.match(/(\d+)(?:st|nd|rd|th)-level\s+([a-z]+)/i);
                            if (match) {
                                currentSpell.level = parseInt(match[1]);
                                currentSpell.school = match[2];
                            }
                        }
                    }
                }
            }
            
            // Skip until we encounter a spell
            if (!currentSpell) continue;
            
            // Check for separator line
            if (line === '___') {
                // Skip the separator
                continue;
            }
            
            // Check for casting time, range, components, duration
            if (line.startsWith('- **Casting Time:**')) {
                currentSpell.castingTime = line.substring(18).trim();
            } else if (line.startsWith('- **Range:**')) {
                currentSpell.range = line.substring(12).trim();
            } else if (line.startsWith('- **Components:**')) {
                currentSpell.components = line.substring(17).trim();
            } else if (line.startsWith('- **Duration:**')) {
                currentSpell.duration = line.substring(15).trim();
            }
            
            // Check for description start (after separator line)
            if (line === '---') {
                // The next lines until a special section or empty line are the description
                let descriptionLines = [];
                let j = i + 1;
                
                while (j < lines.length && 
                       !lines[j].trim().startsWith('***At Higher Levels.***') && 
                       !lines[j].trim().startsWith('**Classes:**') && 
                       !(lines[j].trim() === '' && (j + 1 >= lines.length || lines[j + 1].trim().startsWith('**'))) &&
                       // Make sure we don't run into another spell's section
                       !lines[j].trim().startsWith('#### ')) {
                    if (lines[j].trim().length > 0) {
                        descriptionLines.push(lines[j].trim());
                    }
                    j++;
                }
                
                // Join description lines
                if (descriptionLines.length > 0) {
                    currentSpell.description = descriptionLines.join('\n');
                }
                
                // Set i to j - 1 to continue processing from there
                i = j - 1;
            }
            
            // Check for higher levels section
            if (line.startsWith('***At Higher Levels.***')) {
                currentSpell.higherLevels = line.substring(22).trim();
            }
            
            // Check for classes
            if (line.startsWith('**Classes:**')) {
                const classesStr = line.substring(12).trim();
                currentSpell.classes = classesStr.split(', ').map(c => c.trim());
            }
        }
        
        // Add the last spell if there is one
        if (currentSpell) {
            spells.push(currentSpell);
        }
        
        console.log(`Successfully parsed ${spells.length} spells from markdown`);
        
        // Log a sample of the parsed spells for debugging
        if (spells.length > 0) {
            console.log('Sample spell:', spells[0]);
        }
        
        return spells;
    }
    
    /**
     * Saves spells to IndexedDB
     * @param {Array} spells - Array of spell objects to save
     * @returns {Promise} Promise that resolves when save is complete
     */
    function saveSpellsToDB(spells) {
        return new Promise((resolve, reject) => {
            getSpellDatabase()
                .then(db => {
                    const transaction = db.transaction(['spells'], 'readwrite');
                    const store = transaction.objectStore('spells');
                    
                    let savedCount = 0;
                    
                    transaction.oncomplete = () => {
                        console.log(`Saved ${savedCount} spells to database`);
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
                })
                .catch(error => reject(error));
        });
    }

    /**
     * Clears all spell data from the database
     * @returns {Promise} Promise that resolves when complete
     */
    function clearAllSpellData() {
        return new Promise((resolve, reject) => {
            getSpellDatabase()
                .then(db => {
                    // Clear only if the spells store exists
                    if (db.objectStoreNames.contains('spells')) {
                        try {
                            const transaction = db.transaction(['spells'], 'readwrite');
                            const store = transaction.objectStore('spells');
                            const request = store.clear();
                            
                            request.onsuccess = () => {
                                console.log('All spells data cleared successfully');
                                
                                // Also clear prepared spells from local storage
                                localStorage.removeItem('druidAssistant_preparedSpells');
                                localStorage.removeItem('druidAssistant_spellHistory');
                                localStorage.removeItem('druidAssistant_usedSpellSlots');
                                
                                resolve();
                            };
                            
                            request.onerror = (event) => {
                                console.error('Error clearing spells data:', event.target.error);
                                reject(event.target.error);
                            };
                        } catch (error) {
                            console.error('Exception while clearing spells data:', error);
                            reject(error);
                        }
                    } else {
                        // No spells store, nothing to clear
                        resolve();
                    }
                })
                .catch(error => {
                    console.error('Error getting spell database for clearing:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Loads spells from IndexedDB and initializes the spell list
     */
    function loadSpells() {
        getSpells()
            .then(spells => {
                if (spells.length === 0) {
                    elements.spellList.innerHTML = '<div class="text-center p-4">No spells found</div>';
                    return;
                }
                
                // Initialize class filter buttons
                initClassFilterButtons(spells);
                
                // Set default sort to level (high-low)
                currentSort = 'level';
                currentSortDirection = 'desc';
                document.getElementById('spellSortDropdown').textContent = 'Sort: Level (High-Low)';
                
                // Ensure the spells tab dropdown displays the current sorting option
                const levelHighToLowOption = document.querySelector('.spell-sort-option[data-sort="level"][data-direction="desc"]');
                if (levelHighToLowOption) {
                    levelHighToLowOption.classList.add('active');
                }
                
                showAllSpells();
            })
            .catch(error => {
                console.error('Error loading spells:', error);
                elements.spellList.innerHTML = `<div class="text-center p-4 text-danger">Error loading spells: ${error}</div>`;
            });
    }
    
    /**
     * Initializes class filter buttons based on available classes in spells
     * @param {Array} spells - Array of spell objects
     */
    function initClassFilterButtons(spells) {
        // Extract unique classes
        const classes = new Set();
        classes.add('all'); // Always include "All" option
        
        spells.forEach(spell => {
            if (spell.classes && Array.isArray(spell.classes)) {
                spell.classes.forEach(c => classes.add(c));
            }
        });
        
        // Create buttons for each class
        let html = '';
        
        Array.from(classes).sort().forEach(className => {
            // Special case for "all" button
            if (className === 'all') {
                html += `<button class="btn btn-sm btn-success class-filter" data-class="all">All</button>`;
            } else {
                html += `<button class="btn btn-sm btn-outline-success class-filter" data-class="${className}">${className}</button>`;
            }
        });
        
        elements.classFilterButtons.innerHTML = html;
        
        // Add event listeners to class filter buttons
        document.querySelectorAll('.class-filter').forEach(button => {
            button.addEventListener('click', function() {
                // Update button styles
                document.querySelectorAll('.class-filter').forEach(btn => {
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-success');
                });
                
                this.classList.remove('btn-outline-success');
                this.classList.add('btn-success');
                
                // Update filter
                currentFilters.class = this.dataset.class;
                
                // Apply filter
                applyFilters();
            });
        });
    }
    
    /**
     * Shows all spells (with current filters applied)
     */
    function showAllSpells() {
        getSpells()
            .then(spells => {
                // Apply filters
                let filteredSpells = applySpellFilters(spells, currentFilters);
                
                // Sort spells
                filteredSpells = sortSpells(filteredSpells);
                
                // Render the spell list
                renderSpellList(filteredSpells, 'all');
            })
            .catch(error => {
                console.error('Error showing all spells:', error);
                elements.spellList.innerHTML = `<div class="text-center p-4 text-danger">Error loading spells: ${error}</div>`;
            });
    }
    
    /**
     * Shows only prepared spells (with current filters applied)
     */
    function showPreparedSpells() {
        getSpells()
            .then(spells => {
                // Filter to only prepared spells
                let preparedSpellsList = spells.filter(spell => preparedSpells.includes(spell.id));
                
                // Apply other filters
                preparedSpellsList = applySpellFilters(preparedSpellsList, currentFilters);
                
                // Sort spells
                preparedSpellsList = sortSpells(preparedSpellsList);
                
                // Render the spell list
                renderSpellList(preparedSpellsList, 'prepared');
            })
            .catch(error => {
                console.error('Error showing prepared spells:', error);
                elements.spellList.innerHTML = `<div class="text-center p-4 text-danger">Error loading prepared spells: ${error}</div>`;
            });
    }
    
    /**
     * Shows spell casting history (with current filters applied)
     */
    function showSpellHistory() {
        getSpells()
            .then(allSpells => {
                // Create an array of history entries with spell objects
                let historyEntries = [];
                
                spellHistory.forEach(historyItem => {
                    const spell = allSpells.find(s => s.id === historyItem.id);
                    if (spell) {
                        historyEntries.push({
                            spell: spell,
                            timestamp: historyItem.timestamp,
                            castLevel: historyItem.level
                        });
                    }
                });
                
                // Apply filters to the spells in the history
                historyEntries = historyEntries.filter(entry => 
                    matchesSpellFilters(entry.spell, currentFilters)
                );
                
                // Sort by timestamp (newest first) or by the spell's sort criteria
                if (currentSort === 'timestamp') {
                    historyEntries.sort((a, b) => {
                        const result = new Date(b.timestamp) - new Date(a.timestamp);
                        return currentSortDirection === 'asc' ? -result : result;
                    });
                } else {
                    // Sort by spell property
                    historyEntries.sort((a, b) => {
                        let result;
                        
                        if (currentSort === 'name') {
                            result = a.spell.name.localeCompare(b.spell.name);
                        } else if (currentSort === 'level') {
                            result = a.spell.level - b.spell.level;
                        } else {
                            result = 0;
                        }
                        
                        return currentSortDirection === 'asc' ? result : -result;
                    });
                }
                
                // Render the spell history list
                renderSpellHistoryList(historyEntries);
            })
            .catch(error => {
                console.error('Error showing spell history:', error);
                elements.spellList.innerHTML = `<div class="text-center p-4 text-danger">Error loading spell history: ${error}</div>`;
            });
    }
    
    /**
     * Applies filters to a list of spells
     * @param {Array} spells - Array of spell objects
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered array of spells
     */
    function applySpellFilters(spells, filters) {
        return spells.filter(spell => matchesSpellFilters(spell, filters));
    }
    
    /**
     * Checks if a spell matches the current filters
     * @param {Object} spell - Spell object
     * @param {Object} filters - Filter criteria
     * @returns {boolean} True if spell matches filters
     */
    function matchesSpellFilters(spell, filters) {
        // Name filter (case-insensitive partial match)
        if (filters.name && !spell.name.toLowerCase().includes(filters.name.toLowerCase())) {
            return false;
        }
        
        // Level filter
        if (filters.level !== 'all') {
            if (filters.level.includes('-')) {
                // Range filter (e.g., "1-3")
                const [minLevel, maxLevel] = filters.level.split('-');
                const minValue = parseInt(minLevel.trim());
                const maxValue = parseInt(maxLevel.trim());
                
                if (spell.level < minValue || spell.level > maxValue) {
                    return false;
                }
            } else if (filters.level.startsWith('<=')) {
                // Less than or equal filter (e.g., "<=2")
                const maxLevel = parseInt(filters.level.substring(2).trim());
                
                if (spell.level > maxLevel) {
                    return false;
                }
            } else if (filters.level.startsWith('>=')) {
                // Greater than or equal filter (e.g., ">=1")
                const minLevel = parseInt(filters.level.substring(2).trim());
                
                if (spell.level < minLevel) {
                    return false;
                }
            } else {
                // Exact match (e.g., "2")
                if (spell.level !== parseInt(filters.level)) {
                    return false;
                }
            }
        }
        
        // Class filter
        if (filters.class !== 'all') {
            if (!spell.classes || !spell.classes.includes(filters.class)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Sorts spells according to the current sort settings
     * @param {Array} spells - Array of spell objects to sort
     * @returns {Array} Sorted array of spells
     */
    function sortSpells(spells) {
        // Create a copy to avoid modifying the original
        const sortedSpells = [...spells];
        
        sortedSpells.sort((a, b) => {
            let result;
            
            if (currentSort === 'name') {
                result = a.name.localeCompare(b.name);
            } else if (currentSort === 'level') {
                result = a.level - b.level;
            } else {
                result = 0;
            }
            
            return currentSortDirection === 'asc' ? result : -result;
        });
        
        return sortedSpells;
    }
    
    /**
     * Applies current filters to the spells and updates the display
     */
    function applyFilters() {
        // Apply filters based on the current view
        if (currentView === 'all') {
            showAllSpells();
        } else if (currentView === 'prepared') {
            showPreparedSpells();
        } else {
            showSpellHistory();
        }
    }
    
    /**
     * Renders a list of spells
     * @param {Array} spells - Array of spell objects to display
     * @param {string} viewType - 'all', 'prepared', or 'history'
     */
    function renderSpellList(spells, viewType) {
        elements.spellList.innerHTML = '';
        
        if (spells.length === 0) {
            elements.spellList.innerHTML = '<div class="text-center p-4">No spells found</div>';
            return;
        }
        
        spells.forEach(spell => {
            const listItem = document.createElement('button');
            listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            listItem.dataset.spellId = spell.id;
            
            // Add prepared class if spell is prepared
            if (preparedSpells.includes(spell.id)) {
                listItem.classList.add('prepared-spell');
            }
            
            const spellInfo = document.createElement('div');
            spellInfo.innerHTML = `
                <div>${spell.name}</div>
                <small class="text-muted">${getLevelString(spell.level)} ${spell.school}</small>
            `;
            
            listItem.appendChild(spellInfo);
            
            // Add action button based on view type
            const actionButton = document.createElement('div');
            
            if (viewType === 'all') {
                // Add prepare button for all spells view
                const isPrepared = preparedSpells.includes(spell.id);
                actionButton.innerHTML = `
                    <button class="btn btn-sm ${isPrepared ? 'btn-success' : 'btn-outline-success'}" 
                            onclick="event.stopPropagation(); SpellManager.togglePreparedSpell('${spell.id}')">
                        ${isPrepared ? 'Prepared' : 'Prepare'}
                    </button>
                `;
            } else if (viewType === 'prepared') {
                // Add cast button for prepared spells view
                actionButton.innerHTML = `
                    <button class="btn btn-sm btn-outline-primary"
                            onclick="event.stopPropagation(); SpellManager.castSpellById('${spell.id}')">
                        Cast
                    </button>
                `;
            }
            
            listItem.appendChild(actionButton);
            
            // Add click event
            listItem.addEventListener('click', () => {
                selectSpell(spell.id);
            });
            
            elements.spellList.appendChild(listItem);
        });
    }
    
    /**
     * Renders the spell history list
     * @param {Array} historyEntries - Array of history entries with spell objects
     */
    function renderSpellHistoryList(historyEntries) {
        elements.spellList.innerHTML = '';
        
        if (historyEntries.length === 0) {
            elements.spellList.innerHTML = '<div class="text-center p-4">No spell history found</div>';
            return;
        }
        
        historyEntries.forEach(entry => {
            const listItem = document.createElement('button');
            listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center cast-spell';
            listItem.dataset.spellId = entry.spell.id;
            
            const castDate = new Date(entry.timestamp);
            const formattedDate = castDate.toLocaleString();
            
            const spellInfo = document.createElement('div');
            spellInfo.innerHTML = `
                <div>${entry.spell.name}</div>
                <small class="text-muted">
                    Cast at ${entry.castLevel > entry.spell.level ? `${getLevelString(entry.castLevel)} (upcast)` : getLevelString(entry.spell.level)}
                    - ${formattedDate}
                </small>
            `;
            
            listItem.appendChild(spellInfo);
            
            // Add click event
            listItem.addEventListener('click', () => {
                selectSpell(entry.spell.id);
            });
            
            elements.spellList.appendChild(listItem);
        });
    }
    
    /**
     * Gets a formatted string for spell level
     * @param {number} level - Spell level (0 for cantrip)
     * @returns {string} Formatted level string
     */
    function getLevelString(level) {
        if (level === 0) return 'Cantrip';
        if (level === 1) return '1st-level';
        if (level === 2) return '2nd-level';
        if (level === 3) return '3rd-level';
        return `${level}th-level`;
    }
    
    /**
     * Selects a spell and displays its details
     * @param {string} spellId - ID of spell to select
     */
    function selectSpell(spellId) {
        // Clear previous selection
        const selectedItems = elements.spellList.querySelectorAll('.list-group-item.active');
        selectedItems.forEach(item => item.classList.remove('active'));
        
        // Mark new selection
        const selectedItem = elements.spellList.querySelector(`[data-spell-id="${spellId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Get spell data and render description
        getSpellById(spellId)
            .then(spell => {
                currentSpell = spell;
                renderSpellDescription(spell);
                
                // Enable buttons
                elements.prepareSpellButton.disabled = false;
                elements.castSpellButton.disabled = !isPrepared(spellId);
                
                // Update prepare button state
                updatePrepareButton(spellId);
            })
            .catch(error => {
                console.error('Error getting spell:', error);
                showFormattedAlert('Error', 'Could not load spell data: ' + error);
            });
    }
    
    /**
     * Get a spell by ID
     * @param {string} spellId - Spell ID
     * @returns {Promise} Promise that resolves with the spell object
     */
    function getSpellById(spellId) {
        return new Promise((resolve, reject) => {
            getSpellDatabase()
                .then(db => {
                    const transaction = db.transaction(['spells'], 'readonly');
                    const store = transaction.objectStore('spells');
                    const request = store.get(spellId);
                    
                    request.onsuccess = () => {
                        if (request.result) {
                            resolve(request.result);
                        } else {
                            reject(`Spell with ID ${spellId} not found`);
                        }
                    };
                    
                    request.onerror = (event) => {
                        console.error('Request error:', event.target.error);
                        reject('Error getting spell');
                    };
                })
                .catch(error => reject(error));
        });
    }
    
    /**
     * Updates the prepare button based on spell's prepared status
     * @param {string} spellId - Spell ID
     */
    function updatePrepareButton(spellId) {
        const isPreparedSpell = isPrepared(spellId);
        elements.prepareSpellButton.textContent = isPreparedSpell ? 'Unprepare Spell' : 'Prepare Spell';
        elements.prepareSpellButton.classList.toggle('btn-success', !isPreparedSpell);
        elements.prepareSpellButton.classList.toggle('btn-outline-success', isPreparedSpell);
        
        // Also update cast button state
        elements.castSpellButton.disabled = !isPreparedSpell;
    }
    
    /**
     * Renders a spell description with formatting based on the provided examples
     * @param {Object} spell - Spell object to render
     */
    function renderSpellDescription(spell) {
        // Create the spell description HTML based on the provided examples
        let html = `
            <div class="spell-container">
                <h2 class="spell-name">${spell.name}</h2>
                <p class="spell-level-school"><em>${getLevelString(spell.level)} ${spell.school}</em></p>
                <div class="spell-separator"></div>
                
                <div class="spell-property">
                    <span class="spell-property-name">Casting Time:</span>
                    <span class="spell-property-value"> ${spell.castingTime}</span>
                </div>
                
                <div class="spell-property">
                    <span class="spell-property-name">Range:</span>
                    <span class="spell-property-value"> ${spell.range}</span>
                </div>
                
                <div class="spell-property">
                    <span class="spell-property-name">Components:</span>
                    <span class="spell-property-value"> ${spell.components}</span>
                </div>
                
                <div class="spell-property">
                    <span class="spell-property-name">Duration:</span>
                    <span class="spell-property-value"> ${spell.duration}</span>
                </div>
                
                <div class="spell-separator"></div>
                
                <div class="spell-description">
                    ${formatSpellDescription(spell.description)}
                </div>
        `;
        
        // Add higher levels section if present
        if (spell.higherLevels) {
            html += `<div class="spell-higher-levels"><strong>At Higher Levels.</strong> ${spell.higherLevels}</div>`;
        }
        
        // Add classes
        if (spell.classes && spell.classes.length > 0) {
            html += `<div class="spell-classes">Classes: ${spell.classes.join(', ')}</div>`;
        }
        
        html += `</div>`;
        
        elements.spellDisplay.innerHTML = html;
    }
    
    /**
     * Formats a spell description text
     * @param {string} description - Raw description text
     * @returns {string} Formatted HTML
     */
    function formatSpellDescription(description) {
        if (!description) return '';
        
        // Split into paragraphs
        const paragraphs = description.split('\n');
        
        let inTable = false;
        let tableHTML = '';
        let currentListType = null; // 'ul' or 'ol'
        let formattedHTML = '';
        
        // Process paragraphs one by one
        for (let i = 0; i < paragraphs.length; i++) {
            let paragraph = paragraphs[i].trim();
            
            if (!paragraph) {
                // Close any open list
                if (currentListType) {
                    formattedHTML += `</${currentListType}>`;
                    currentListType = null;
                }
                continue;
            }
            
            // Handle tables
            if (paragraph.includes('|')) {
                // Table header row
                if (!inTable && paragraph.startsWith('|') && paragraph.endsWith('|')) {
                    inTable = true;
                    const headerCells = paragraph.split('|').filter(cell => cell.trim().length > 0);
                    tableHTML = '<table class="spell-table">\n<thead>\n<tr>\n';
                    headerCells.forEach(cell => {
                        tableHTML += `<th>${cell.trim()}</th>\n`;
                    });
                    tableHTML += '</tr>\n</thead>\n<tbody>\n';
                    continue;
                }
                
                // Table separator row (skip)
                if (inTable && paragraph.includes(':---:') || paragraph.includes(':--')) {
                    continue;
                }
                
                // Table data row
                if (inTable && paragraph.startsWith('|') && paragraph.endsWith('|')) {
                    const dataCells = paragraph.split('|').filter(cell => cell.trim().length > 0);
                    tableHTML += '<tr>\n';
                    dataCells.forEach(cell => {
                        tableHTML += `<td>${formatText(cell.trim())}</td>\n`;
                    });
                    tableHTML += '</tr>\n';
                    continue;
                }
                
                // End of table
                if (inTable && (!paragraph.includes('|') || !paragraph.startsWith('|'))) {
                    inTable = false;
                    tableHTML += '</tbody>\n</table>';
                    formattedHTML += tableHTML;
                    tableHTML = '';
                }
            }
            
            // Close table if we're moving to non-table content
            if (inTable && !paragraph.includes('|')) {
                inTable = false;
                tableHTML += '</tbody>\n</table>';
                formattedHTML += tableHTML;
                tableHTML = '';
            }
            
            // Handle lists
            if (paragraph.startsWith('- ')) {
                // Start a new unordered list if needed
                if (currentListType !== 'ul') {
                    if (currentListType) formattedHTML += `</${currentListType}>`;
                    formattedHTML += '<ul>';
                    currentListType = 'ul';
                }
                formattedHTML += `<li>${formatText(paragraph.substring(2))}</li>`;
                continue;
            }
            
            // Handle numbered lists
            if (/^\d+\.\s/.test(paragraph)) {
                // Start a new ordered list if needed
                if (currentListType !== 'ol') {
                    if (currentListType) formattedHTML += `</${currentListType}>`;
                    formattedHTML += '<ol>';
                    currentListType = 'ol';
                }
                formattedHTML += `<li>${formatText(paragraph.replace(/^\d+\.\s/, ''))}</li>`;
                continue;
            }
            
            // Close any open list if moving to a regular paragraph
            if (currentListType) {
                formattedHTML += `</${currentListType}>`;
                currentListType = null;
            }
            
            // Regular paragraph
            if (!inTable) {
                formattedHTML += `<p>${formatText(paragraph)}</p>`;
            }
        }
        
        // Close any remaining tags
        if (inTable) {
            formattedHTML += tableHTML + '</tbody>\n</table>';
        }
        
        if (currentListType) {
            formattedHTML += `</${currentListType}>`;
        }
        
        return formattedHTML;
    }
    
    /**
     * Formats text with markdown-style formatting
     * @param {string} text - The text to format
     * @returns {string} Formatted HTML
     */
    function formatText(text) {
        if (!text) return '';
        
        // Replace markdown formatting
        return text
            .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + Italic
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*([^*]+)\*/g, '<em>$1</em>'); // Italic
    }
    
    /**
     * Toggles a spell's prepared status
     * @param {string} spellId - ID of spell to toggle
     */
    function togglePreparedSpell(spellId) {
        // Check if spell is already prepared
        const index = preparedSpells.indexOf(spellId);
        
        if (index !== -1) {
            // Remove from prepared spells
            preparedSpells.splice(index, 1);
        } else {
            // Add to prepared spells
            preparedSpells.push(spellId);
        }
        
        // Update UI
        updatePreparedSpellsCount();
        
        // Update prepare button if this is the current spell
        if (currentSpell && currentSpell.id === spellId) {
            updatePrepareButton(spellId);
        }
        
        // Update the list item in the spell list
        const listItem = elements.spellList.querySelector(`[data-spell-id="${spellId}"]`);
        if (listItem) {
            if (index !== -1) {
                // Was prepared, now unprepared
                listItem.classList.remove('prepared-spell');
                
                // Update prepare button in the list item
                const prepareBtn = listItem.querySelector('.btn');
                if (prepareBtn) {
                    prepareBtn.textContent = 'Prepare';
                    prepareBtn.classList.remove('btn-success');
                    prepareBtn.classList.add('btn-outline-success');
                }
            } else {
                // Was unprepared, now prepared
                listItem.classList.add('prepared-spell');
                
                // Update prepare button in the list item
                const prepareBtn = listItem.querySelector('.btn');
                if (prepareBtn) {
                    prepareBtn.textContent = 'Prepared';
                    prepareBtn.classList.remove('btn-outline-success');
                    prepareBtn.classList.add('btn-success');
                }
            }
        }
        
        // Save to local storage
        saveSpellData();
    }
    
    /**
     * Checks if a spell is prepared
     * @param {string} spellId - Spell ID to check
     * @returns {boolean} True if spell is prepared
     */
    function isPrepared(spellId) {
        return preparedSpells.includes(spellId);
    }
    
    /**
     * Casts a spell by its ID
     * @param {string} spellId - ID of spell to cast
     */
    function castSpellById(spellId) {
        getSpellById(spellId)
            .then(spell => castSpell(spell))
            .catch(error => {
                console.error('Error casting spell:', error);
                showFormattedAlert('Error', 'Could not cast spell: ' + error);
            });
    }
    
    /**
     * Casts a spell (adds to history and uses a spell slot)
     * @param {Object} spell - Spell object to cast
     */
    function castSpell(spell) {
        // Don't require preparation for cantrips
        if (spell.level > 0 && !isPrepared(spell.id)) {
            showFormattedAlert('Spell Not Prepared', 'You must prepare this spell before casting it.');
            return;
        }
        
        // For level 1+ spells, prompt for spell slot level
        if (spell.level > 0) {
            promptForSpellSlotLevel(spell);
        } else {
            // Cantrips don't use spell slots
            recordSpellCast(spell, 0);
            showFormattedAlert('Spell Cast', `You cast ${spell.name}.`);
        }
    }
    
    /**
     * Prompts the user to select a spell slot level for casting
     * @param {Object} spell - Spell object to cast
     */
    function promptForSpellSlotLevel(spell) {
        // Get available slot levels
        const druidLevelValue = parseInt(elements.druidLevel.value);
        const availableSlots = druidSpellSlots[druidLevelValue];
        
        // Create options for spell slot levels
        let options = '';
        for (let level = spell.level; level <= 9; level++) {
            // Check if the druid has slots of this level
            if (level <= availableSlots.length && availableSlots[level - 1] > 0) {
                // Check if there are available slots of this level
                const usedSlotsOfLevel = usedSpellSlots[level] || 0;
                const availableSlotsOfLevel = availableSlots[level - 1];
                
                if (usedSlotsOfLevel < availableSlotsOfLevel) {
                    options += `<option value="${level}">${getLevelString(level)} Slot (${usedSlotsOfLevel}/${availableSlotsOfLevel} used)</option>`;
                } else {
                    options += `<option value="${level}" disabled>${getLevelString(level)} Slot (${usedSlotsOfLevel}/${availableSlotsOfLevel} used)</option>`;
                }
            }
        }
        
        // Create modal for slot selection
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(modalBackdrop);
        
        const modalHtml = `
        <div class="modal fade show" tabindex="-1" style="display: block;">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Cast ${spell.name}</h5>
                        <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Choose a spell slot level to use:</p>
                        <select class="form-select" id="spellSlotLevelSelect">
                            ${options}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelCastBtn">Cancel</button>
                        <button type="button" class="btn btn-success" id="confirmCastBtn">Cast Spell</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Function to close the modal
        const closeModal = () => {
            document.body.removeChild(modalContainer);
            document.body.removeChild(modalBackdrop);
        };
        
        // Add event listener to close button
        const closeButton = modalContainer.querySelector('.btn-close');
        closeButton.addEventListener('click', closeModal);
        
        // Add event listener to cancel button
        const cancelButton = modalContainer.querySelector('#cancelCastBtn');
        cancelButton.addEventListener('click', closeModal);
        
        // Add event listener to confirm button
        const confirmButton = modalContainer.querySelector('#confirmCastBtn');
        confirmButton.addEventListener('click', () => {
            const slotLevelSelect = document.getElementById('spellSlotLevelSelect');
            const slotLevel = parseInt(slotLevelSelect.value);
            
            // Use the spell slot
            useSpellSlot(slotLevel);
            
            // Record the spell cast
            recordSpellCast(spell, slotLevel);
            
            // Close the modal
            closeModal();
            
            // Show confirmation
            showFormattedAlert('Spell Cast', `You cast ${spell.name} using a ${getLevelString(slotLevel)} spell slot.`);
        });
    }
    
    /**
     * Uses a spell slot of the specified level
     * @param {number} level - Spell slot level
     */
    function useSpellSlot(level) {
        // Initialize level if not exists
        if (!usedSpellSlots[level]) {
            usedSpellSlots[level] = 0;
        }
        
        // Increment used slots
        usedSpellSlots[level]++;
        
        // Update the display
        updateSpellSlotDisplay();
        
        // Save to local storage
        saveSpellData();
    }
    
    /**
     * Records a spell cast in the history
     * @param {Object} spell - Spell object that was cast
     * @param {number} slotLevel - Spell slot level used
     */
    function recordSpellCast(spell, slotLevel) {
        // Add to spell history
        spellHistory.unshift({
            id: spell.id,
            timestamp: new Date(),
            level: slotLevel
        });
        
        // Limit history to 100 entries
        if (spellHistory.length > 100) {
            spellHistory.pop();
        }
        
        // Save to local storage
        saveSpellData();
        
        // If in history view, update the display
        if (currentView === 'history') {
            showSpellHistory();
        }
    }
    
    // Public API
    return {
        init,
        getSpellById,
        togglePreparedSpell,
        isPrepared,
        castSpellById,
        castSpell,
        toggleSpellSlot,
        resetSpellSlots,
        unprepareAllSpells,
        parseSpellsMarkdown,
        saveSpellsToDB,
        getSpellDatabase,
        clearAllSpellData
    };
})();

// Initialize the spell manager when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded, checking for spells tab...');
    // Only initialize if we're on the spells tab
    const spellsTab = document.getElementById('spells-tab');
    if (spellsTab) {
        // Initialize immediately if we're starting on the spells tab
        if (window.location.hash === '#spells') {
            console.log('Starting on spells tab, initializing immediately');
            SpellManager.init();
            SpellManager.initialized = true;
        } else {
            // Pre-initialize the database in the background
            console.log('Pre-initializing spell database...');
            initSpellDatabase().then(() => {
                console.log('Spell database pre-initialized successfully');
            }).catch(error => {
                console.error('Error pre-initializing spell database:', error);
            });
            
            // Initialize when the tab is shown
            spellsTab.addEventListener('shown.bs.tab', function() {
                // Initialize if not already done
                if (typeof SpellManager.initialized === 'undefined') {
                    console.log('Spells tab shown, initializing now');
                    SpellManager.init();
                    SpellManager.initialized = true;
                }
            });
        }
    }
});

// Create a formatted alert modal
function showFormattedAlert(title, message) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(modalBackdrop);
    
    // Create modal HTML
    const modalHtml = `
    <div class="modal fade show" tabindex="-1" style="display: block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success" id="alertOkBtn">OK</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Function to close the modal
    const closeModal = () => {
        document.body.removeChild(modalContainer);
        document.body.removeChild(modalBackdrop);
    };
    
    // Add event listeners to close buttons
    const closeButton = modalContainer.querySelector('.btn-close');
    closeButton.addEventListener('click', closeModal);
    
    const okButton = modalContainer.querySelector('#alertOkBtn');
    okButton.addEventListener('click', closeModal);
}

// Create a formatted confirmation modal
function showFormattedConfirm(title, message, onConfirm, onCancel) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(modalBackdrop);
    
    // Create modal HTML
    const modalHtml = `
    <div class="modal fade show" tabindex="-1" style="display: block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                    <button type="button" class="btn btn-success" id="confirmOkBtn">Confirm</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Function to close the modal
    const closeModal = () => {
        document.body.removeChild(modalContainer);
        document.body.removeChild(modalBackdrop);
    };
    
    // Add event listeners to close buttons
    const closeButton = modalContainer.querySelector('.btn-close');
    closeButton.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    const cancelButton = modalContainer.querySelector('#confirmCancelBtn');
    cancelButton.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    const okButton = modalContainer.querySelector('#confirmOkBtn');
    okButton.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });
}