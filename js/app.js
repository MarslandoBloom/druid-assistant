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
        filterDropdown: document.getElementById('filterDropdown'),
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
        
        // Filter options
        const filterOptions = document.querySelectorAll('.filter-option');
        filterOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const filterType = this.dataset.filterType;
                const filterValue = this.dataset.filterValue;
                
                UIManager.setFilter(filterType, filterValue);
                UIManager.applyFilters();
                
                // Update dropdown button text
                if (filterType === 'cr') {
                    document.getElementById('filterCRDropdown').textContent = filterValue === 'all' ? 'CR: All' : `CR: ${filterValue}`;
                } else if (filterType === 'size') {
                    document.getElementById('filterSizeDropdown').textContent = filterValue === 'all' ? 'Size: All' : `Size: ${filterValue}`;
                }
            });
        });
        
        // Sort options
        const sortOptions = document.querySelectorAll('.sort-option');
        sortOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const sortType = this.dataset.sort;
                UIManager.setSort(sortType);
                UIManager.applyFilters();
                
                // Update sort dropdown text
                document.getElementById('sortDropdown').textContent = `Sort: ${sortType.charAt(0).toUpperCase() + sortType.slice(1)}`;
            });
        });
        
        // Show favorites
        elements.showFavorites.addEventListener('click', function() {
            UIManager.showOnlyFavorites();
        });
        
        // Reset filters
        elements.resetFilters.addEventListener('click', function() {
            UIManager.resetFilters();
            document.getElementById('filterCRDropdown').textContent = 'CR: All';
            document.getElementById('filterSizeDropdown').textContent = 'Size: All';
            document.getElementById('sortDropdown').textContent = 'Sort: Name';
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