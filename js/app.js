/**
 * app.js - Main application module for the Druid's Assistant
 * Handles initialization, event listeners, and tab switching
 */

/**
 * Shows a formatted alert modal instead of using the native alert() function
 * @param {string} title - The title of the alert
 * @param {string} message - The message to display
 */
function showFormattedAlert(title, message) {
    // Create modal elements
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(modalBackdrop);
    
    const modalHtml = `
    <div class="modal fade show" tabindex="-1" style="display: block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-success">OK</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Add event listener to close button
    const closeButton = modalContainer.querySelector('.btn-close');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        document.body.removeChild(modalBackdrop);
    });
    
    // Add event listener to OK button
    const okButton = modalContainer.querySelector('.btn');
    okButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        document.body.removeChild(modalBackdrop);
    });
}

/**
 * Shows a formatted confirmation modal instead of using the native confirm() function
 * @param {string} title - The title of the confirmation
 * @param {string} message - The message to display
 * @param {Function} onConfirm - Callback function when user confirms
 * @param {Function} onCancel - Callback function when user cancels
 */
function showFormattedConfirm(title, message, onConfirm, onCancel) {
    // Create modal elements
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(modalBackdrop);
    
    const modalHtml = `
    <div class="modal fade show" tabindex="-1" style="display: block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button type="button" class="btn btn-success" id="confirmBtn">OK</button>
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
    closeButton.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    // Add event listener to Cancel button
    const cancelButton = modalContainer.querySelector('#cancelBtn');
    cancelButton.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    // Add event listener to Confirm button
    const confirmButton = modalContainer.querySelector('#confirmBtn');
    confirmButton.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });
}

document.addEventListener('DOMContentLoaded', function() {

    // DOM elements
    const elements = {
    // Tabs and navigation
    mainTabs: document.getElementById('mainTabs'),
    statblockTab: document.getElementById('statblock-tab'),
    wildshapeTab: document.getElementById('wildshape-tab'),
    conjureAnimalsTab: document.getElementById('conjure-animals-tab'),
    spellsTab: document.getElementById('spells-tab'),
    
    // Beast list and filtering
    beastSearch: document.getElementById('beastSearch'),
    clearSearch: document.getElementById('clearSearch'),
    enableCRRange: document.getElementById('enableCRRange'),
    crRangeInputs: document.getElementById('crRangeInputs'),
    minCR: document.getElementById('minCR'),
    maxCR: document.getElementById('maxCR'),
    applyCRFilter: document.getElementById('applyCRFilter'),
    sizeFilters: document.querySelectorAll('.size-filter'),
    showWildshapeFavorites: document.getElementById('showWildshapeFavorites'),
    showConjureFavorites: document.getElementById('showConjureFavorites'),
    backToListBtn: document.getElementById('backToListBtn'),
    resetFilters: document.getElementById('resetFilters'),
    
    // Action buttons
    wildshapeButton: document.getElementById('wildshapeButton'),
    conjureAnimalsButton: document.getElementById('conjureAnimalsButton'),
    wildshapeFavoriteButton: document.getElementById('wildshapeFavoriteButton'),
            conjureFavoriteButton: document.getElementById('conjureFavoriteButton'),

    // Conjure Animals tab
    advantageSelect: document.getElementById('advantage-select'),
    groupAttackBtn: document.getElementById('group-attack-btn'),
    groupDamageBtn: document.getElementById('group-damage-btn'),
    totalGroupDamage: document.getElementById('total-group-damage'),
    conjuredAnimalsList: document.getElementById('conjured-animals-list'),
    conjureStatblock: document.getElementById('conjure-statblock'),
    battlefield: document.getElementById('battlefield'),
    addEnemyBtn: document.getElementById('add-enemy-btn'),
    
    // Data management
    mdFileInput: document.getElementById('mdFileInput'),
    spellMdFileInput: document.getElementById('spellMdFileInput'),
    uploadDataBtn: document.getElementById('uploadDataBtn'),
            downloadDataBtn: document.getElementById('downloadDataBtn'),
            resetDataBtn: document.getElementById('resetDataBtn')
    };
    
    // Store available CR values
    let availableCRs = [];
    
    // Track current view state
    let currentView = 'all'; // 'all', 'wildshapeFavorites', or 'conjureFavorites'
    
    /**
     * Initializes the application
     */
    function init() {
        console.log('Initializing Druid\'s Assistant application...');
        // Initialize database
        DataManager.initDatabase()
            .then(() => {
                console.log('Database initialized, checking for beasts...');
                
                // First ensure Suturefly exists
                return DataManager.ensureSutureflyExists().catch(err => {
                    console.warn('Warning: Error ensuring Suturefly exists:', err);
                });
            })
            .then(() => {
                // Next ensure all default conjure favorites are set up correctly
                return DataManager.ensureDefaultConjureFavorites().catch(err => {
                    console.warn('Warning: Error setting up default conjure favorites:', err);
                });
            })
            .then(() => {
                // Check if we have beasts in the database
                return DataManager.getAllBeasts();
            })
            .then(beasts => {
                console.log(`Found ${beasts.length} beasts in database.`);
                if (beasts.length === 0) {
                    // No beasts found, but don't automatically show upload prompt
                    console.log('No beasts found in database. User can upload data from the Manage Data button.');
                    // Still need to render an empty beast list with helpful message
                    document.getElementById('beastList').innerHTML = '<div class="text-center p-4">No beasts found. Click "Manage Data" at the bottom of the page to upload beast data.</div>';
                } else {
                    // Render the beast list
                    UIManager.renderBeastList(beasts);
                    
                    // Initialize the CR filter options
                    initCRFilterOptions(beasts);
                }
            })
            .catch(error => {
                console.error('Initialization error:', error);
                showFormattedAlert('Error', 'Error initializing application. Please check console for details.');
            });
        
        // Set up event listeners
        setupEventListeners();
    }
    
    /**
     * Initializes CR filter dropdown options based on available beasts
     * @param {Array} beasts - Array of beast objects
     */
    function initCRFilterOptions(beasts) {
        // Extract unique CR values
        const crValues = new Set();
        
        // Helper function to convert CR to numeric value for sorting
        const crToValue = (cr) => {
            if (cr === '0') return 0;
            if (cr === '1/8') return 0.125;
            if (cr === '1/4') return 0.25;
            if (cr === '1/2') return 0.5;
            return parseFloat(cr);
        };
        
        // Extract and convert CR values
        beasts.forEach(beast => {
            if (beast.cr) {
                crValues.add(beast.cr);
            }
        });
        
        // Convert to array and sort
        availableCRs = Array.from(crValues);
        availableCRs.sort((a, b) => crToValue(a) - crToValue(b));
        
        // Clear existing options
        elements.minCR.innerHTML = '<option value="all">Any</option>';
        elements.maxCR.innerHTML = '<option value="all">Any</option>';
        
        // Add options to select dropdowns
        availableCRs.forEach(cr => {
            const minOption = document.createElement('option');
            minOption.value = cr;
            minOption.textContent = `CR ${cr}`;
            elements.minCR.appendChild(minOption);
            
            const maxOption = document.createElement('option');
            maxOption.value = cr;
            maxOption.textContent = `CR ${cr}`;
            elements.maxCR.appendChild(maxOption);
        });
    }
    
    /**
     * Shows a prompt to upload beast data if none exists
     */
    function showUploadPrompt() {
        const modal = new bootstrap.Modal(document.getElementById('dataModal'));
        modal.show();
        
        // No need to check for beasts and show alert - we've removed this functionality
    }
    
    /**
     * Sets up all event listeners
     */
    function setupEventListeners() {
        // Collapsible filter headers
        const collapsibleHeaders = document.querySelectorAll('.card-header.collapsible');
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', function() {
                this.classList.toggle('collapsed');
                const filterId = this.dataset.filter;
                const content = document.getElementById(`${filterId}-filter-content`);
                if (content) {
                    content.classList.toggle('collapsed');
                }
            });
        });
        
        // Reset Wildshape button
        document.getElementById('resetWildshape').addEventListener('click', function() {
            document.getElementById('wildshapeStatblock').innerHTML = `
                <div class="text-center p-5">
                    <h3>No beast selected</h3>
                    <p class="text-muted">Select a beast from the Statblock tab first</p>
                </div>
            `;
            document.getElementById('wildshapeTitle').textContent = 'Wildshape Form';
            
            // Reset health tracker
            resetWildshapeHealthTracker();
            
            // Return to statblock tab
            const statblockTabEl = new bootstrap.Tab(elements.statblockTab);
            statblockTabEl.show();
        });
        
        // Wildshape damage button
        document.getElementById('wildshapeDamageBtn').addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (!currentBeast) return;
            
            const damageInput = document.getElementById('wildshapeDamageInput');
            const damageAmount = parseInt(damageInput.value);
            
            if (isNaN(damageAmount) || damageAmount <= 0) {
                showFormattedAlert('Invalid input', 'Please enter a valid positive number');
                return;
            }
            
            updateWildshapeHealth(-damageAmount);
        });
        
        // Wildshape heal button
        document.getElementById('wildshapeHealBtn').addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (!currentBeast) return;
            
            const healInput = document.getElementById('wildshapeHealInput');
            const healAmount = parseInt(healInput.value);
            
            if (isNaN(healAmount) || healAmount <= 0) {
                showFormattedAlert('Invalid input', 'Please enter a valid positive number');
                return;
            }
            
            updateWildshapeHealth(healAmount);
        });
        
        // Beast search
        elements.beastSearch.addEventListener('input', function() {
            UIManager.setFilter('name', this.value);
            
            // Apply filter but maintain current view
            if (currentView === 'wildshapeFavorites') {
                UIManager.showOnlyWildshapeFavorites();
            } else if (currentView === 'conjureFavorites') {
                UIManager.showOnlyConjureFavorites();
            } else {
                UIManager.applyFilters();
            }
        });
        
        // Clear search
        elements.clearSearch.addEventListener('click', function() {
            elements.beastSearch.value = '';
            UIManager.setFilter('name', '');
            
            // Apply filter but maintain current view
            if (currentView === 'wildshapeFavorites') {
                UIManager.showOnlyWildshapeFavorites();
            } else if (currentView === 'conjureFavorites') {
                UIManager.showOnlyConjureFavorites();
            } else {
                UIManager.applyFilters();
            }
        });
        
        // Enable CR Range filter
        elements.enableCRRange.addEventListener('change', function() {
            elements.crRangeInputs.style.display = this.checked ? 'flex' : 'none';
            elements.minCR.disabled = !this.checked;
            elements.maxCR.disabled = !this.checked;
            
            if (!this.checked) {
                // If unchecked, reset to "all" CRs
                UIManager.setFilter('cr', 'all');
                
                // Apply filter but maintain current view
                if (currentView === 'wildshapeFavorites') {
                    UIManager.showOnlyWildshapeFavorites();
                } else if (currentView === 'conjureFavorites') {
                    UIManager.showOnlyConjureFavorites();
                } else {
                    UIManager.applyFilters();
                }
            }
        });
        
        // Apply CR filter button
        elements.applyCRFilter.addEventListener('click', function() {
            if (elements.enableCRRange.checked) {
                const minCR = elements.minCR.value;
                const maxCR = elements.maxCR.value;
                
                if (minCR === 'all' && maxCR === 'all') {
                    // Both set to "Any", apply no CR filter
                    UIManager.setFilter('cr', 'all');
                } else if (minCR === 'all') {
                    // Only max specified
                    UIManager.setFilter('cr', `<=${maxCR}`);
                } else if (maxCR === 'all') {
                    // Only min specified
                    UIManager.setFilter('cr', `>=${minCR}`);
                } else {
                    // Both specified
                    UIManager.setFilter('cr', `${minCR}-${maxCR}`);
                }
                
                // Apply filter but maintain current view
                if (currentView === 'wildshapeFavorites') {
                    UIManager.showOnlyWildshapeFavorites();
                } else if (currentView === 'conjureFavorites') {
                    UIManager.showOnlyConjureFavorites();
                } else {
                    UIManager.applyFilters();
                }
            }
        });
        
        // Size filter buttons
        elements.sizeFilters.forEach(button => {
            button.addEventListener('click', function() {
                // First, remove active class from all size buttons
                elements.sizeFilters.forEach(btn => {
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-success');
                });
                
                // Then highlight this button
                this.classList.remove('btn-outline-success');
                this.classList.add('btn-success');
                
                // Apply size filter
                const size = this.dataset.size;
                UIManager.setFilter('size', size);
                
                // Apply filter but maintain current view
                if (currentView === 'wildshapeFavorites') {
                    UIManager.showOnlyWildshapeFavorites();
                } else if (currentView === 'conjureFavorites') {
                    UIManager.showOnlyConjureFavorites();
                } else {
                    UIManager.applyFilters();
                }
            });
        });
        
        // Sort options
        const sortOptions = document.querySelectorAll('.sort-option');
        sortOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const sortType = this.dataset.sort;
                const sortDirection = this.dataset.direction;
                
                UIManager.setSort(sortType);
                UIManager.setSortDirection(sortDirection);
                
                // Apply sort but maintain current view
                if (currentView === 'wildshapeFavorites') {
                    UIManager.showOnlyWildshapeFavorites();
                } else if (currentView === 'conjureFavorites') {
                    UIManager.showOnlyConjureFavorites();
                } else {
                    UIManager.applyFilters();
                }
                
                // Update sort dropdown text - make compact for UI
                let sortText = this.textContent;
                // Make size text shorter
                if (sortText.includes('(Small-Large)')) {
                    sortText = sortText.replace('(Small-Large)', '(S→L)');
                } else if (sortText.includes('(Large-Small)')) {
                    sortText = sortText.replace('(Large-Small)', '(L→S)');
                }
                document.getElementById('sortDropdown').textContent = `Sort: ${sortText}`;
            });
        });
        
        // Show wildshape favorites
        elements.showWildshapeFavorites.addEventListener('click', function() {
            // Set the current view state
            currentView = 'wildshapeFavorites';
            UIManager.showOnlyWildshapeFavorites();
            
            // Update button appearances
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-success');
            elements.showConjureFavorites.classList.remove('btn-success');
            elements.showConjureFavorites.classList.add('btn-outline-success');
            
            // Show back button
            document.getElementById('backToListBtn').style.display = 'block';
            this.style.display = 'none';
            elements.showConjureFavorites.style.display = 'none';
        });
        
        // Show conjure favorites
        elements.showConjureFavorites.addEventListener('click', function() {
            // Set the current view state
            currentView = 'conjureFavorites';
            UIManager.showOnlyConjureFavorites();
            
            // Update button appearances
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-success');
            elements.showWildshapeFavorites.classList.remove('btn-success');
            elements.showWildshapeFavorites.classList.add('btn-outline-success');
            
            // Show back button
            document.getElementById('backToListBtn').style.display = 'block';
            this.style.display = 'none';
            elements.showWildshapeFavorites.style.display = 'none';
        });
        
        // Back to list button
        document.getElementById('backToListBtn').addEventListener('click', function() {
            // Reset the view state
            currentView = 'all';
            
            // Show all beasts but retain current filters
            UIManager.applyFilters();
            
            // Update button appearances
            this.style.display = 'none';
            elements.showWildshapeFavorites.style.display = 'block';
            elements.showConjureFavorites.style.display = 'block';
            elements.showWildshapeFavorites.classList.remove('btn-success');
            elements.showWildshapeFavorites.classList.add('btn-outline-success');
            elements.showConjureFavorites.classList.remove('btn-success');
            elements.showConjureFavorites.classList.add('btn-outline-success');
        });
        
        // Reset filters
        elements.resetFilters.addEventListener('click', function() {
            // Reset the view state
            currentView = 'all';
            
            UIManager.resetFilters();
            
            // Reset all UI filter indicators
            elements.beastSearch.value = '';
            
            // Reset CR filter
            elements.enableCRRange.checked = false;
            elements.crRangeInputs.style.display = 'none';
            elements.minCR.disabled = true;
            elements.maxCR.disabled = true;
            elements.minCR.value = 'all';
            elements.maxCR.value = 'all';
            
            // Reset size filter buttons
            elements.sizeFilters.forEach(btn => {
                btn.classList.remove('btn-success');
                btn.classList.add('btn-outline-success');
                if (btn.dataset.size === 'all') {
                    btn.classList.remove('btn-outline-success');
                    btn.classList.add('btn-success');
                }
            });
            
            // Reset sort dropdown
            document.getElementById('sortDropdown').textContent = 'Sort: Name (A-Z)';
            
            // Reset favorites and back button
            elements.showWildshapeFavorites.classList.remove('btn-success');
            elements.showWildshapeFavorites.classList.add('btn-outline-success');
            elements.showWildshapeFavorites.style.display = 'block';
            elements.showConjureFavorites.classList.remove('btn-success');
            elements.showConjureFavorites.classList.add('btn-outline-success');
            elements.showConjureFavorites.style.display = 'block';
            elements.backToListBtn.style.display = 'none';
        });
        
        // Wildshape button
        elements.wildshapeButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                // Render the wildshape statblock
                UIManager.renderWildshapeStatblock(currentBeast);
                
                // Initialize health tracker
                initWildshapeHealthTracker(currentBeast);
                
                // Switch to wildshape tab
                const wildshapeTabEl = new bootstrap.Tab(elements.wildshapeTab);
                wildshapeTabEl.show();
            }
        });
        
        // Conjure Animals button
        elements.conjureAnimalsButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                // Initialize the Conjure Animals tab
                UIManager.initConjureAnimalsTab(currentBeast);
                
                // Switch to Conjure Animals tab
                const conjureAnimalsTabEl = new bootstrap.Tab(elements.conjureAnimalsTab);
                conjureAnimalsTabEl.show();
            }
        });
        
        // Reset Conjure Animals button
        document.getElementById('reset-conjure-btn').addEventListener('click', function() {
            // Clear the conjure animals tab
            document.getElementById('conjured-animals-list').innerHTML = '';
            document.getElementById('conjure-statblock').innerHTML = '<div class="text-center p-2"><p class="text-muted">No beast selected for conjuring</p></div>';
            document.getElementById('battlefield').innerHTML = '';
            
            // Switch back to statblock tab
            const statblockTabEl = new bootstrap.Tab(elements.statblockTab);
            statblockTabEl.show();
        });
        
        // Add enemy button
        elements.addEnemyBtn.addEventListener('click', function() {
            UIManager.addEnemyToken();
        });
        
        // Release enemies button
        document.getElementById('release-enemies-btn').addEventListener('click', function() {
            UIManager.releaseEnemies();
        });
        
        // Group attack button
        elements.groupAttackBtn.addEventListener('click', function() {
            UIManager.handleGroupAttackRoll();
        });
        
        // Group damage button
        elements.groupDamageBtn.addEventListener('click', function() {
            UIManager.handleGroupDamageRoll();
        });
        
        // Select All button
        document.getElementById('select-all-btn').addEventListener('click', function() {
            UIManager.selectAllAnimals();
        });
        
        // Select None button
        document.getElementById('select-none-btn').addEventListener('click', function() {
            UIManager.selectNoAnimals();
        });
        
        // Reset Rolls button
        document.getElementById('reset-rolls-btn').addEventListener('click', function() {
            UIManager.resetRolls();
        });
        
        // Note button in conjure animals tab
        document.getElementById('noteButton').addEventListener('click', function() {
            const modalTitle = 'Not all attacks are fully supported';
            const modalContent = "Note that the following attacks (or outcomes of attacks) will require additional manual input:\n\nCharge\nTrampling charge\nSwallow\nPounce\nAdditional poison damage\nBeing knocked prone\nWeb\nConstrict\n\nUse the Dice Roller tab to complete these actions";
            showFormattedAlert(modalTitle, modalContent);
        });
        
        // Wildshape Favorite button
        elements.wildshapeFavoriteButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                UIManager.toggleWildshapeFavorite(currentBeast.id);
            }
        });
        
        // Conjure Favorite button
        elements.conjureFavoriteButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                UIManager.toggleConjureFavorite(currentBeast.id);
            }
        });
        
        // Upload data button
        elements.uploadDataBtn.addEventListener('click', function() {
            const beastFileInput = elements.mdFileInput;
            const spellFileInput = elements.spellMdFileInput;
            let beastData = null;
            let spellData = null;
            let beastCount = 0;
            let spellCount = 0;
            
            // Check if beast file is selected
            if (beastFileInput.files.length > 0) {
                const file = beastFileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    beastData = e.target.result;
                    
                    // Process the markdown file
                    DataManager.loadBeastData(beastData)
                        .then(count => {
                            beastCount = count;
                            console.log(`Successfully loaded ${count} beasts!`);
                            
                            // Reload the beast list
                            DataManager.getAllBeasts()
                                .then(beasts => {
                                    UIManager.renderBeastList(beasts);
                                    
                                    // Refresh CR filter options
                                    initCRFilterOptions(beasts);
                                });
                                
                            // Reset the file input
                            beastFileInput.value = '';
                            
                            // Show success message after processing both files
                            if (spellFileInput.files.length === 0 || spellCount > 0) {
                                let message = `Successfully loaded ${beastCount} beasts!`;
                                if (spellCount > 0) {
                                    message += `\nSuccessfully loaded ${spellCount} spells!`;
                                }
                                showFormattedAlert('Success', message);
                                
                                // Close the modal
                                const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                                modal.hide();
                            }
                        })
                        .catch(error => {
                            console.error('Error loading beast data:', error);
                            showFormattedAlert('Error', 'Error loading beast data: ' + error);
                        });
                };
                
                reader.onerror = function() {
                    showFormattedAlert('Error', 'Error reading beast file');
                };
                
                reader.readAsText(file);
            }
            
            // Check if spell file is selected
            if (spellFileInput.files.length > 0) {
                const file = spellFileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    spellData = e.target.result;
                    
                    // Process the markdown file
                    if (typeof SpellManager !== 'undefined') {
                        // Make sure we're accessing the actual parseSpellsMarkdown method correctly
                        console.log('Found SpellManager, parsing spells');
                        const spells = SpellManager.parseSpellsMarkdown(spellData);
                        console.log(`Parsed ${spells.length} spells from file`);
                        
                        // Check if saveSpellsToDB is a function
                        if (typeof SpellManager.saveSpellsToDB === 'function') {
                            SpellManager.saveSpellsToDB(spells)
                                .then(() => {
                                    spellCount = spells.length;
                                    console.log(`Successfully loaded ${spellCount} spells!`);
                                    
                                    // Reset the file input
                                    spellFileInput.value = '';
                                    
                                    // Show success message after processing both files
                                    if (beastFileInput.files.length === 0 || beastCount > 0) {
                                        let message = '';
                                        if (beastCount > 0) {
                                            message = `Successfully loaded ${beastCount} beasts!\n`;
                                        }
                                        message += `Successfully loaded ${spellCount} spells!`;
                                        showFormattedAlert('Success', message);
                                        
                                        // Close the modal
                                        const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                                        modal.hide();
                                    }
                                    
                                    // Refresh the spell list if we're on the spells tab
                                    if (document.getElementById('spells').classList.contains('active')) {
                                        if (SpellManager.init) {
                                            SpellManager.init();
                                        }
                                    }
                                })
                                .catch(error => {
                                    console.error('Error saving spell data:', error);
                                    showFormattedAlert('Error', 'Error saving spell data: ' + error);
                                });
                        } else {
                            console.error('SpellManager.saveSpellsToDB is not a function');
                            console.dir(SpellManager);
                            // Create a custom implementation to save spells if the method is missing
                            if (window.indexedDB && typeof SpellManager.getSpellDatabase === 'function') {
                                SpellManager.getSpellDatabase()
                                    .then(db => {
                                        const transaction = db.transaction(['spells'], 'readwrite');
                                        const store = transaction.objectStore('spells');
                                        let savedCount = 0;
                                        
                                        spells.forEach(spell => {
                                            try {
                                                store.put(spell);
                                                savedCount++;
                                            } catch (e) {
                                                console.error(`Error saving spell ${spell.name}:`, e);
                                            }
                                        });
                                        
                                        transaction.oncomplete = () => {
                                            spellCount = savedCount;
                                            console.log(`Successfully saved ${savedCount} spells!`);
                                            
                                            // Show success message
                                            let message = '';
                                            if (beastCount > 0) {
                                                message = `Successfully loaded ${beastCount} beasts!\n`;
                                            }
                                            message += `Successfully loaded ${spellCount} spells!`;
                                            showFormattedAlert('Success', message);
                                            
                                            // Close the modal
                                            const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                                            modal.hide();
                                            
                                            // Refresh spell list if on spells tab
                                            if (document.getElementById('spells').classList.contains('active') && SpellManager.init) {
                                                SpellManager.init();
                                            }
                                        };
                                    })
                                    .catch(error => {
                                        console.error('Error getting spell database:', error);
                                        showFormattedAlert('Error', 'Error saving spell data: Database access failed');
                                    });
                            } else {
                                showFormattedAlert('Error', 'Error saving spell data: SpellManager not properly initialized');
                            }
                        }
                    } else {
                        console.error('SpellManager is not defined');
                        showFormattedAlert('Error', 'Error loading spell data: SpellManager not properly initialized');
                    }
                };
                
                reader.onerror = function() {
                    showFormattedAlert('Error', 'Error reading spell file');
                };
                
                reader.readAsText(file);
            }
            
            // Show message if no files were selected
            if (beastFileInput.files.length === 0 && spellFileInput.files.length === 0) {
                showFormattedAlert('Missing file', 'Please select at least one file to upload');
            }
        });
        
        // Download data button
        elements.downloadDataBtn.addEventListener('click', function() {
            // Get all beasts from the database
            DataManager.getAllBeasts()
                .then(beasts => {
                    if (beasts.length === 0) {
                        showFormattedAlert('No data', 'No beasts found in the database to download.');
                        return;
                    }
                    
                    // Convert beasts to markdown format
                    let markdown = '';
                    
                    beasts.forEach(beast => {
                        // Start with the beast header
                        markdown += `>## ${beast.name}\n`;
                        markdown += `>*${beast.size} ${beast.type}${beast.subtype ? ` (${beast.subtype})` : ''}, ${beast.alignment}*\n\n`;
                        
                        // Add basic properties
                        markdown += `>- **Armor Class** ${beast.ac}\n`;
                        markdown += `>- **Hit Points** ${beast.hp}\n`;
                        markdown += `>- **Speed** ${beast.speed}\n\n`;
                        
                        // Add ability scores as a table
                        markdown += `>|STR|DEX|CON|INT|WIS|CHA|\n`;
                        markdown += `>|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
                        markdown += `>|${beast.abilities.str}|${beast.abilities.dex}|${beast.abilities.con}|${beast.abilities.int}|${beast.abilities.wis}|${beast.abilities.cha}|\n\n`;
                        
                        // Add other properties
                        if (beast.skills) markdown += `>- **Skills** ${beast.skills}\n`;
                        if (beast.damageResistances) markdown += `>- **Damage Resistances** ${beast.damageResistances}\n`;
                        if (beast.damageVulnerabilities) markdown += `>- **Damage Vulnerabilities** ${beast.damageVulnerabilities}\n`;
                        if (beast.damageImmunities) markdown += `>- **Damage Immunities** ${beast.damageImmunities}\n`;
                        if (beast.conditionImmunities) markdown += `>- **Condition Immunities** ${beast.conditionImmunities}\n`;
                        markdown += `>- **Senses** ${beast.senses}\n`;
                        markdown += `>- **Languages** ${beast.languages}\n`;
                        markdown += `>- **Challenge** ${beast.cr} (${beast.xp})\n\n`;
                        
                        // Add traits
                        if (beast.traits && beast.traits.length > 0) {
                            beast.traits.forEach(trait => {
                                markdown += `>***${trait.name}.*** ${trait.desc}\n\n`;
                            });
                        }
                        
                        // Add actions
                        if (beast.actions && beast.actions.length > 0) {
                            markdown += `>### Actions\n\n`;
                            beast.actions.forEach(action => {
                                markdown += `>***${action.name}.*** ${action.desc}\n\n`;
                            });
                        }
                        
                        // Add reactions
                        if (beast.reactions && beast.reactions.length > 0) {
                            markdown += `>### Reactions\n\n`;
                            beast.reactions.forEach(reaction => {
                                markdown += `>***${reaction.name}.*** ${reaction.desc}\n\n`;
                            });
                        }
                        
                        // Add legendary actions
                        if (beast.legendaryActions && beast.legendaryActions.length > 0) {
                            markdown += `>### Legendary Actions\n\n`;
                            beast.legendaryActions.forEach(legendaryAction => {
                                markdown += `>***${legendaryAction.name}.*** ${legendaryAction.desc}\n\n`;
                            });
                        }
                        
                        // End of statblock marker
                        markdown += `null\n\n`;
                        
                        // Add description if available
                        if (beast.description) {
                            markdown += `## ${beast.name}\n\n${beast.description}\n\n`;
                        }
                        
                        // Add separator between beasts
                        markdown += `___\n\n`;
                    });
                    
                    // Create and trigger download
                    const blob = new Blob([markdown], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'druid-assistant-beasts.md';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Error downloading beasts:', error);
                    showFormattedAlert('Error', 'Error downloading beasts: ' + error);
                });
        });
        
        // Reset data button
        elements.resetDataBtn.addEventListener('click', function() {
            showFormattedConfirm(
                'Reset Data Confirmation',
                'Are you sure you want to reset all data? This will delete all beasts, spells, and favorites.',
                () => {
                    // User confirmed, proceed with data reset
                    // First clear beast data
                    DataManager.clearAllData()
                        .then(() => {
                            // Then clear spell data if SpellManager is available
                            if (typeof SpellManager !== 'undefined') {
                                if (typeof SpellManager.clearAllSpellData === 'function') {
                                    return SpellManager.clearAllSpellData();
                                } else if (typeof SpellManager.getSpellDatabase === 'function') {
                                    // Alternative approach if clearAllSpellData is not available
                                    return SpellManager.getSpellDatabase().then(db => {
                                        const transaction = db.transaction(['spells'], 'readwrite');
                                        const store = transaction.objectStore('spells');
                                        const clearRequest = store.clear();
                                        
                                        return new Promise((resolve, reject) => {
                                            clearRequest.onsuccess = () => resolve();
                                            clearRequest.onerror = (event) => reject(event.target.error);
                                        });
                                    });
                                }
                            }
                            return Promise.resolve(); // Continue if SpellManager is not available
                        })
                        .then(() => {
                            showFormattedAlert('Data reset', 'All data has been reset');
                            
                            // Clear the beast list
                            document.getElementById('beastList').innerHTML = '<div class="text-center p-4">No beasts found</div>';
                            
                            // Clear the statblock display
                            document.getElementById('statblockDisplay').innerHTML = `
                                <div class="text-center p-5">
                                    <h3>Select a beast to view its statblock</h3>
                                    <p class="text-muted">The statblock will appear here</p>
                                </div>
                            `;
                            
                            // Reset CR filter options
                            elements.minCR.innerHTML = '<option value="all">Any</option>';
                            elements.maxCR.innerHTML = '<option value="all">Any</option>';
                            availableCRs = [];
                            
                            // Disable buttons
                            elements.wildshapeButton.disabled = true;
                            elements.conjureAnimalsButton.disabled = true;
                            elements.wildshapeFavoriteButton.disabled = true;
                            elements.conjureFavoriteButton.disabled = true;
                            
                            // Clear the spell list if we're on the spells tab
                            if (document.getElementById('spellList')) {
                                document.getElementById('spellList').innerHTML = '<div class="text-center p-4">No spells found</div>';
                            }
                            
                            // Close the modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                            modal.hide();
                            
                            // Show upload prompt
                            showUploadPrompt();
                        })
                        .catch(error => {
                            console.error('Error resetting data:', error);
                            showFormattedAlert('Error', 'Error resetting data: ' + error);
                        });
                },
                null  // No special action on cancel
            );
        });
    }
    
    /**
     * Updates the wildshape health tracker
     * @param {Object} beast - Beast object
     */
    function initWildshapeHealthTracker(beast) {
        if (!beast) return;
        
        // Extract max HP from beast's hp string
        const maxHp = extractMaxHP(beast.hp);
        
        // Store current and max HP in a data attribute
        const hpBar = document.getElementById('wildshapeHpBar');
        hpBar.dataset.currentHp = maxHp;
        hpBar.dataset.maxHp = maxHp;
        
        // Update display
        updateWildshapeHealthDisplay();
    }
    
    /**
     * Resets the wildshape health tracker
     */
    function resetWildshapeHealthTracker() {
        const hpBar = document.getElementById('wildshapeHpBar');
        hpBar.dataset.currentHp = 0;
        hpBar.dataset.maxHp = 100;
        
        // Reset display
        hpBar.style.width = '100%';
        hpBar.className = 'progress-bar bg-secondary';
        document.getElementById('wildshapeHpText').textContent = 'No beast selected';
    }
    
    /**
     * Updates the wildshape health
     * @param {number} change - Amount to change health by (positive for healing, negative for damage)
     */
    function updateWildshapeHealth(change) {
        const hpBar = document.getElementById('wildshapeHpBar');
        const currentHp = parseInt(hpBar.dataset.currentHp);
        const maxHp = parseInt(hpBar.dataset.maxHp);
        
        // Calculate new HP value and potential excess damage
        const rawNewHp = currentHp + change;
        const newHp = Math.max(0, Math.min(maxHp, rawNewHp));
        
        // Check if there is excess damage (HP would be below 0)
        if (rawNewHp < 0) {
            const excessDamage = Math.abs(rawNewHp);
            
            // Show formatted confirmation dialog
            showFormattedConfirm(
                'Wildshape Form at 0 HP',
                `Your wildshape form has dropped to 0 HP with ${excessDamage} excess damage.\n\nClick OK to return to your normal form (statblock tab) or Cancel to remain in wildshape form with 0 HP.`,
                () => {
                    // User clicked OK - reset and return to statblock tab
                    resetWildshapeHealthTracker();
                    
                    // Return to statblock tab
                    const statblockTabEl = new bootstrap.Tab(elements.statblockTab);
                    statblockTabEl.show();
                },
                () => {
                    // User clicked Cancel - stay in form with 0 HP
                    hpBar.dataset.currentHp = 0;
                    updateWildshapeHealthDisplay();
                }
            );
            return; // Return early to prevent double update of display
        } else {
            // Normal update
            hpBar.dataset.currentHp = newHp;
        }
        
        // Update display
        updateWildshapeHealthDisplay();
    }
    
    /**
     * Updates the wildshape health display
     */
    function updateWildshapeHealthDisplay() {
        const hpBar = document.getElementById('wildshapeHpBar');
        const currentHp = parseInt(hpBar.dataset.currentHp);
        const maxHp = parseInt(hpBar.dataset.maxHp);
        
        // Calculate percentage
        const percentage = (currentHp / maxHp) * 100;
        
        // Update progress bar width
        hpBar.style.width = percentage + '%';
        
        // Update text
        document.getElementById('wildshapeHpText').textContent = `${currentHp}/${maxHp} HP`;
        
        // Update color based on health percentage
        if (percentage <= 0) {
            hpBar.className = 'progress-bar bg-danger';
        } else if (percentage <= 25) {
            hpBar.className = 'progress-bar bg-danger';
        } else if (percentage <= 50) {
            hpBar.className = 'progress-bar bg-warning';
        } else {
            hpBar.className = 'progress-bar bg-success';
        }
    }
    
    /**
     * Extracts max HP from a HP string
     * @param {string} hpString - HP string (e.g. "45 (6d10 + 12)")
     * @returns {number} Max HP value
     */
    function extractMaxHP(hpString) {
        if (!hpString) return 10;
        
        // Try to extract just the number at the beginning
        const match = hpString.match(/^(\d+)/);
        if (match && match[1]) {
            return parseInt(match[1]);
        }
        
        // Fallback
        return 10;
    }
    
    // Initialize the application
    init();
});