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
        conjureTab: document.getElementById('conjure-tab'),
        
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
        resetFilters: document.getElementById('resetFilters'),
        
        // Action buttons
        wildshapeButton: document.getElementById('wildshapeButton'),
        favoriteButton: document.getElementById('favoriteButton'),
        conjureButton: document.getElementById('conjureButton'),
        
        // Battlefield
        toggleBattlefield: document.getElementById('toggleBattlefield'),
        battlefield: document.getElementById('battlefield'),
        
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
        // Reset Wildshape button
        document.getElementById('resetWildshape').addEventListener('click', function() {
            document.getElementById('wildshapeStatblock').innerHTML = `
                <div class="text-center p-5">
                    <h3>No beast selected</h3>
                    <p class="text-muted">Select a beast from the Statblock tab first</p>
                </div>
            `;
            document.getElementById('wildshapeTitle').textContent = 'Wildshape Form';
        });
        
        // Reset Conjure Animals button
        document.getElementById('resetConjure').addEventListener('click', function() {
            document.getElementById('conjuredBeastInfo').innerHTML = `
                <div class="text-center p-3">
                    <p class="text-muted">No beast summoned</p>
                </div>
            `;
            document.getElementById('healthTrackers').innerHTML = '';
            document.getElementById('attackOptions').innerHTML = `
                <div class="text-center p-3">
                    <p class="text-muted">Select a beast to see attack options</p>
                </div>
            `;
            document.getElementById('combatResults').innerHTML = `
                <div class="text-center p-5">
                    <h3>No combat results</h3>
                    <p class="text-muted">Make an attack to see results</p>
                </div>
            `;
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
            
            // Reset favorites button
            elements.showFavorites.classList.remove('btn-success');
            elements.showFavorites.classList.add('btn-outline-success');
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
        
        // Favorite button
        elements.favoriteButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                UIManager.toggleFavorite(currentBeast.id);
            }
        });
        
        // Conjure button
        elements.conjureButton.addEventListener('click', function() {
            const currentBeast = UIManager.getCurrentBeast();
            if (currentBeast) {
                // Render the conjured beast
                UIManager.renderConjuredBeast(currentBeast);
                
                // Switch to conjure tab
                const conjureTabEl = new bootstrap.Tab(elements.conjureTab);
                conjureTabEl.show();
            }
        });
        
        // Toggle battlefield visibility
        elements.toggleBattlefield.addEventListener('click', function() {
            if (elements.battlefield.style.display === 'none') {
                elements.battlefield.style.display = 'block';
                initBattlefield();
            } else {
                elements.battlefield.style.display = 'none';
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
                        elements.conjureButton.disabled = true;
                        
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
    
    /**
     * Initializes the battlefield visualization
     */
    function initBattlefield() {
        const battlefield = document.querySelector('.battlefield-container');
        if (!battlefield) return;
        
        // Clear previous battlefield
        battlefield.innerHTML = '';
        
        const currentBeast = UIManager.getCurrentBeast();
        if (!currentBeast) return;
        
        // Determine number of creatures based on CR
        let numCreatures = 1;
        
        switch(currentBeast.cr) {
            case '2':
                numCreatures = 1;
                break;
            case '1':
                numCreatures = 2;
                break;
            case '1/2':
                numCreatures = 4;
                break;
            case '1/4':
                numCreatures = 8;
                break;
            default:
                numCreatures = 1;
        }
        
        // Add friendly tokens
        for (let i = 0; i < numCreatures; i++) {
            const token = document.createElement('div');
            token.className = 'token token-friendly';
            token.textContent = (i + 1).toString();
            token.style.left = `${50 + (i % 4) * 50}px`;
            token.style.top = `${50 + Math.floor(i / 4) * 50}px`;
            
            // Make tokens draggable
            makeTokenDraggable(token);
            
            battlefield.appendChild(token);
        }
        
        // Add enemy token button
        const addEnemyBtn = document.createElement('button');
        addEnemyBtn.className = 'btn btn-danger position-absolute';
        addEnemyBtn.style.right = '10px';
        addEnemyBtn.style.top = '10px';
        addEnemyBtn.textContent = 'Add Enemy';
        
        addEnemyBtn.addEventListener('click', function() {
            const token = document.createElement('div');
            token.className = 'token token-enemy';
            token.textContent = 'E';
            token.style.left = '200px';
            token.style.top = '200px';
            
            // Make token draggable
            makeTokenDraggable(token);
            
            battlefield.appendChild(token);
        });
        
        battlefield.appendChild(addEnemyBtn);
        
        // Add clear battlefield button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-secondary position-absolute';
        clearBtn.style.right = '110px';
        clearBtn.style.top = '10px';
        clearBtn.textContent = 'Clear';
        
        clearBtn.addEventListener('click', function() {
            initBattlefield();
        });
        
        battlefield.appendChild(clearBtn);
    }
    
    /**
     * Makes a token draggable
     * @param {HTMLElement} token - Token element to make draggable
     */
    function makeTokenDraggable(token) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        token.onmousedown = dragMouseDown;
        token.ontouchstart = dragTouchStart;
        
        function dragMouseDown(e) {
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // Call a function whenever the cursor moves
            document.onmousemove = elementDrag;
        }
        
        function dragTouchStart(e) {
            e.preventDefault();
            // Get the touch position at startup
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            document.ontouchend = closeDragElement;
            // Call a function whenever the touch moves
            document.ontouchmove = elementTouchDrag;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set the element's new position
            token.style.top = (token.offsetTop - pos2) + "px";
            token.style.left = (token.offsetLeft - pos1) + "px";
        }
        
        function elementTouchDrag(e) {
            e.preventDefault();
            // Calculate the new touch position
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            // Set the element's new position
            token.style.top = (token.offsetTop - pos2) + "px";
            token.style.left = (token.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
    
    // Initialize the application
    init();
});