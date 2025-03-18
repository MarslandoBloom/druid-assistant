/**
 * app.js - Main application module for the Druid's Assistant
 * Handles initialization, event listeners, and tab switching
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const elements = {
        // Tabs and navigation
        mainTabs: document.getElementById('mainTabs'),
        statblockTab: document.getElementById('statblock-tab'),
        wildshapeTab: document.getElementById('wildshape-tab'),
        conjureAnimalsTab: document.getElementById('conjure-animals-tab'),
        
        // Beast list and filtering
        beastSearch: document.getElementById('beastSearch'),
        clearSearch: document.getElementById('clearSearch'),
        enableCRRange: document.getElementById('enableCRRange'),
        crRangeInputs: document.getElementById('crRangeInputs'),
        minCR: document.getElementById('minCR'),
        maxCR: document.getElementById('maxCR'),
        applyCRFilter: document.getElementById('applyCRFilter'),
        sizeFilters: document.querySelectorAll('.size-filter'),
        showFavorites: document.getElementById('showFavorites'),
        backToListBtn: document.getElementById('backToListBtn'),
        resetFilters: document.getElementById('resetFilters'),
        
        // Action buttons
        wildshapeButton: document.getElementById('wildshapeButton'),
        conjureAnimalsButton: document.getElementById('conjureAnimalsButton'),
        favoriteButton: document.getElementById('favoriteButton'),

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
        uploadDataBtn: document.getElementById('uploadDataBtn'),
        resetDataBtn: document.getElementById('resetDataBtn')
    };
    
    // Store available CR values
    let availableCRs = [];
    
    /**
     * Initializes the application
     */
    function init() {
        // Initialize database
        DataManager.initDatabase()
            .then(() => {
                // Check if we have beasts in the database
                return DataManager.getAllBeasts();
            })
            .then(beasts => {
                if (beasts.length === 0) {
                    // No beasts found, show upload prompt
                    showUploadPrompt();
                } else {
                    // Render the beast list
                    UIManager.renderBeastList(beasts);
                    
                    // Initialize the CR filter options
                    initCRFilterOptions(beasts);
                }
            })
            .catch(error => {
                console.error('Initialization error:', error);
                alert('Error initializing application. Please check console for details.');
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
        
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-info';
        alertElement.innerHTML = `
            <strong>Welcome!</strong> No beast data found. Please upload a markdown file with beast data to get started.
        `;
        
        const modalBody = document.querySelector('#dataModal .modal-body');
        modalBody.insertBefore(alertElement, modalBody.firstChild);
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
            
            // Return to statblock tab
            const statblockTabEl = new bootstrap.Tab(elements.statblockTab);
            statblockTabEl.show();
        });
        
        // Beast search
        elements.beastSearch.addEventListener('input', function() {
            UIManager.setFilter('name', this.value);
            UIManager.applyFilters();
        });
        
        // Clear search
        elements.clearSearch.addEventListener('click', function() {
            elements.beastSearch.value = '';
            UIManager.setFilter('name', '');
            UIManager.applyFilters();
        });
        
        // Enable CR Range filter
        elements.enableCRRange.addEventListener('change', function() {
            elements.crRangeInputs.style.display = this.checked ? 'flex' : 'none';
            elements.minCR.disabled = !this.checked;
            elements.maxCR.disabled = !this.checked;
            
            if (!this.checked) {
                // If unchecked, reset to "all" CRs
                UIManager.setFilter('cr', 'all');
                UIManager.applyFilters();
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
                
                UIManager.applyFilters();
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
                UIManager.applyFilters();
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
                UIManager.applyFilters();
                
                // Update sort dropdown text
                const sortText = this.textContent;
                document.getElementById('sortDropdown').textContent = `Sort: ${sortText}`;
            });
        });
        
        // Show favorites
        elements.showFavorites.addEventListener('click', function() {
            UIManager.showOnlyFavorites();
            
            // Update button appearances
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-success');
            
            // Show back button
            document.getElementById('backToListBtn').style.display = 'block';
            this.style.display = 'none';
        });
        
        // Back to list button
        document.getElementById('backToListBtn').addEventListener('click', function() {
            // Reset filters and show all beasts
            UIManager.resetFilters();
            UIManager.applyFilters();
            
            // Update button appearances
            this.style.display = 'none';
            elements.showFavorites.style.display = 'block';
            elements.showFavorites.classList.remove('btn-success');
            elements.showFavorites.classList.add('btn-outline-success');
        });
        
        // Reset filters
        elements.resetFilters.addEventListener('click', function() {
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
            elements.showFavorites.classList.remove('btn-success');
            elements.showFavorites.classList.add('btn-outline-success');
            elements.showFavorites.style.display = 'block';
            elements.backToListBtn.style.display = 'none';
        });
        
        // Wildshape button
        elements.wildshapeButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                // Render the wildshape statblock
                UIManager.renderWildshapeStatblock(currentBeast);
                
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
        
        // Favorite button
        elements.favoriteButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                UIManager.toggleFavorite(currentBeast.id);
            }
        });
        
        // Upload data button
        elements.uploadDataBtn.addEventListener('click', function() {
            const fileInput = elements.mdFileInput;
            if (fileInput.files.length === 0) {
                alert('Please select a file to upload');
                return;
            }
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                
                // Process the markdown file
                DataManager.loadBeastData(content)
                    .then(count => {
                        alert(`Successfully loaded ${count} beasts!`);
                        
                        // Reload the beast list
                        DataManager.getAllBeasts()
                            .then(beasts => {
                                UIManager.renderBeastList(beasts);
                                
                                // Refresh CR filter options
                                initCRFilterOptions(beasts);
                            });
                        
                        // Close the modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                        modal.hide();
                        
                        // Reset the file input
                        fileInput.value = '';
                    })
                    .catch(error => {
                        console.error('Error loading data:', error);
                        alert('Error loading data: ' + error);
                    });
            };
            
            reader.onerror = function() {
                alert('Error reading file');
            };
            
            reader.readAsText(file);
        });
        
        // Reset data button
        elements.resetDataBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all data? This will delete all beasts and favorites.')) {
                DataManager.clearAllData()
                    .then(() => {
                        alert('All data has been reset');
                        
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
                        elements.favoriteButton.disabled = true;
                        
                        // Close the modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                        modal.hide();
                        
                        // Show upload prompt
                        showUploadPrompt();
                    })
                    .catch(error => {
                        console.error('Error resetting data:', error);
                        alert('Error resetting data: ' + error);
                    });
            }
        });
    }
    
    // Initialize the application
    init();
});