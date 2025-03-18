/**
 * ui.js - UI management module for the Druid's Assistant
 * Handles rendering beasts, statblocks, and UI updates
 */

const UIManager = (function() {
    // DOM references
    const elements = {
        // Beast list and filtering
        beastList: document.getElementById('beastList'),
        beastSearch: document.getElementById('beastSearch'),
        clearSearch: document.getElementById('clearSearch'),
        minCR: document.getElementById('minCR'),
        maxCR: document.getElementById('maxCR'),
        enableCRRange: document.getElementById('enableCRRange'),
        applyCRFilter: document.getElementById('applyCRFilter'),
        sizeFilters: document.querySelectorAll('.size-filter'),
        showFavorites: document.getElementById('showFavorites'),
        resetFilters: document.getElementById('resetFilters'),
        
        // Statblock display
        statblockDisplay: document.getElementById('statblockDisplay'),
        wildshapeButton: document.getElementById('wildshapeButton'),
        favoriteButton: document.getElementById('favoriteButton'),
        
        // Wildshape tab
        wildshapeTitle: document.getElementById('wildshapeTitle'),
        wildshapeStatblock: document.getElementById('wildshapeStatblock'),
        
        // Data management
        mdFileInput: document.getElementById('mdFileInput'),
        uploadDataBtn: document.getElementById('uploadDataBtn'),
        resetDataBtn: document.getElementById('resetDataBtn')
    };
    
    // Current state
    let currentBeast = null;
    let currentFilters = { name: '', cr: 'all', size: 'all' };
    let currentSort = 'name';
    let currentSortDirection = 'asc';
    
    // Source information mapping for beasts
    // This would ideally come from the data file, but we'll hardcode some examples
    const sourceMap = {
        'giant-toad': {
            mainSource: "MM",
            mainPage: 329,
            otherSources: ["WDMM", "GoS", "EGW", "TCE", "WBtW", "KftGV", "QftIS"],
            inSRD: true
        },
        'allosaurus': {
            mainSource: "MM",
            mainPage: 79,
            otherSources: ["ToA"],
            inSRD: true
        },
        'brown-bear': {
            mainSource: "MM",
            mainPage: 319,
            otherSources: ["PHB"],
            inSRD: true
        }
        // Add more as needed
    };
    
    /**
     * Gets source information for a beast
     * @param {string} beastId - ID of the beast
     * @returns {object|null} Source information object or null if not found
     */
    function getSourceInfo(beastId) {
        // In a real implementation, this might come from the beast data itself
        // For now, we'll use our hardcoded mapping with a fallback
        if (sourceMap[beastId]) {
            return sourceMap[beastId];
        }
        
        // Default fallback for beasts without specific source info
        return {
            mainSource: "MM",
            otherSources: [],
            inSRD: true
        };
    }
    
    /**
     * Formats source information into a display string
     * @param {object} sourceInfo - Source information object
     * @returns {string} Formatted source string
     */
    function formatSourceInfo(sourceInfo) {
        if (!sourceInfo) return "";
        
        let sourceText = "";
        
        // Main source
        if (sourceInfo.mainSource) {
            sourceText += `<em>${sourceInfo.mainSource}</em>`;
            if (sourceInfo.mainPage) {
                sourceText += `, page ${sourceInfo.mainPage}`;
            }
        }
        
        // Other sources
        if (sourceInfo.otherSources && sourceInfo.otherSources.length > 0) {
            sourceText += `. Also found in <em>${sourceInfo.otherSources.join('</em>; <em>')}</em>`;
        }
        
        // SRD info
        if (sourceInfo.inSRD) {
            sourceText += ". Available in the SRD.";
        }
        
        return sourceText;
    }
    
    /**
     * Renders the list of beasts based on filters
     * @param {Array} beasts - Array of beast objects to display
     */
    function renderBeastList(beasts) {
        elements.beastList.innerHTML = '';
        
        if (beasts.length === 0) {
            elements.beastList.innerHTML = '<div class="text-center p-4">No beasts found</div>';
            return;
        }
        
        // Sort beasts based on current sort option and direction
        switch (currentSort) {
            case 'name':
                beasts.sort((a, b) => {
                    const result = a.name.localeCompare(b.name);
                    return currentSortDirection === 'asc' ? result : -result;
                });
                break;
            case 'cr':
                beasts.sort((a, b) => {
                    // Convert CR to numeric value for sorting
                    const crToValue = (cr) => {
                        if (cr === '0') return 0;
                        if (cr === '1/8') return 0.125;
                        if (cr === '1/4') return 0.25;
                        if (cr === '1/2') return 0.5;
                        return parseFloat(cr);
                    };
                    const result = crToValue(a.cr) - crToValue(b.cr);
                    return currentSortDirection === 'asc' ? result : -result;
                });
                break;
            case 'size':
                const sizeOrder = { 'Tiny': 1, 'Small': 2, 'Medium': 3, 'Large': 4, 'Huge': 5, 'Gargantuan': 6 };
                beasts.sort((a, b) => {
                    const result = sizeOrder[a.size] - sizeOrder[b.size];
                    return currentSortDirection === 'asc' ? result : -result;
                });
                break;
        }
        
        beasts.forEach(beast => {
            const listItem = document.createElement('button');
            listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            listItem.dataset.beastId = beast.id;
            
            // Check if the beast is a favorite
            DataManager.isFavorite(beast.id)
                .then(isFav => {
                    if (isFav) {
                        listItem.classList.add('list-group-item-favorite');
                    }
                })
                .catch(error => console.error('Error checking favorite status:', error));
            
            const beastInfo = document.createElement('div');
            beastInfo.innerHTML = `
                <div>${beast.name}</div>
                <small class="text-muted">${beast.size} ${beast.type}, CR ${beast.cr}</small>
            `;
            
            listItem.appendChild(beastInfo);
            
            // Add CR badge
            const badge = document.createElement('span');
            badge.className = 'badge bg-success rounded-pill';
            badge.textContent = `CR ${beast.cr}`;
            listItem.appendChild(badge);
            
            // Add click event
            listItem.addEventListener('click', () => {
                selectBeast(beast.id);
            });
            
            elements.beastList.appendChild(listItem);
        });
    }
    
    /**
     * Selects a beast and displays its statblock
     * @param {string} beastId - ID of beast to select
     */
    function selectBeast(beastId) {
        // Clear previous selection
        const selectedItems = elements.beastList.querySelectorAll('.list-group-item.active');
        selectedItems.forEach(item => item.classList.remove('active'));
        
        // Mark new selection
        const selectedItem = elements.beastList.querySelector(`[data-beast-id="${beastId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Get beast data and render statblock
        DataManager.getBeastById(beastId)
            .then(beast => {
                console.log("Beast data loaded:", beast.name);
                
                // Ensure beast has ability scores
                if (!beast.abilities) {
                    console.warn(`Beast ${beast.name} is missing ability scores, adding defaults`);
                    beast.abilities = {
                        str: "10 (+0)",
                        dex: "10 (+0)",
                        con: "10 (+0)",
                        int: "10 (+0)",
                        wis: "10 (+0)",
                        cha: "10 (+0)"
                    };
                }
                
                console.log("Raw ability scores:", beast.abilities);
                
                currentBeast = beast;
                renderStatblock(beast);
                
                // Enable buttons
                elements.wildshapeButton.disabled = false;
                elements.favoriteButton.disabled = false;
                
                // Update favorite button state
                updateFavoriteButton(beastId);
            })
            .catch(error => {
                console.error('Error getting beast:', error);
                showError('Could not load beast data: ' + error);
            });
    }
    
    /**
     * Updates the favorite button state based on beast's favorite status
     * @param {string} beastId - ID of beast to check
     */
    function updateFavoriteButton(beastId) {
        DataManager.isFavorite(beastId)
            .then(isFavorite => {
                if (isFavorite) {
                    elements.favoriteButton.innerHTML = '<i class="bi bi-star-fill"></i> Favorited';
                    elements.favoriteButton.classList.remove('btn-outline-success');
                    elements.favoriteButton.classList.add('btn-success');
                } else {
                    elements.favoriteButton.innerHTML = '<i class="bi bi-star"></i> Favorite';
                    elements.favoriteButton.classList.remove('btn-success');
                    elements.favoriteButton.classList.add('btn-outline-success');
                }
            })
            .catch(error => {
                console.error('Error checking favorite status:', error);
            });
    }
    
    /**
     * Parses an ability score string and extracts the score and modifier
     * @param {string} scoreText - The ability score text (e.g., "19 (+4)")
     * @returns {Object} Object with score and modifier properties
     */
    function parseAbilityScore(scoreText) {
        if (!scoreText || typeof scoreText !== 'string') {
            return { score: 10, mod: '+0' };
        }
        
        // Simple regex to extract the score and modifier
        const match = scoreText.match(/(\d+)\s*\(([+-]\d+)\)/);
        
        if (match) {
            return {
                score: parseInt(match[1]),
                mod: match[2]
            };
        }
        
        // If we can't parse it properly, extract just the first number as score
        const scoreMatch = scoreText.match(/(\d+)/);
        if (scoreMatch) {
            const score = parseInt(scoreMatch[1]);
            // Calculate modifier: (score - 10) / 2, rounded down
            const modValue = Math.floor((score - 10) / 2);
            const mod = modValue >= 0 ? `+${modValue}` : `${modValue}`;
            
            return { score, mod };
        }
        
        // Default fallback
        return { score: 10, mod: '+0' };
    }
    
    /**
     * Renders a statblock for a beast
     * @param {Object} beast - Beast object to render
     */
    function renderStatblock(beast) {
        try {
            // Ensure abilities object exists
            if (!beast.abilities) {
                beast.abilities = {
                    str: "10 (+0)",
                    dex: "10 (+0)",
                    con: "10 (+0)",
                    int: "10 (+0)",
                    wis: "10 (+0)",
                    cha: "10 (+0)"
                };
            }
            
            // Parse ability scores
            const strParsed = parseAbilityScore(beast.abilities.str);
            const dexParsed = parseAbilityScore(beast.abilities.dex);
            const conParsed = parseAbilityScore(beast.abilities.con);
            const intParsed = parseAbilityScore(beast.abilities.int);
            const wisParsed = parseAbilityScore(beast.abilities.wis);
            const chaParsed = parseAbilityScore(beast.abilities.cha);
            
            // Get source information
            const sourceInfo = getSourceInfo(beast.id);
            const sourceText = formatSourceInfo(sourceInfo);
            
            let html = `
                <div class="statblock-container">
                    <h2 class="statblock-name">${beast.name}</h2>
                    <p class="statblock-subtitle">${beast.size} ${beast.type}${beast.subtype ? ` (${beast.subtype})` : ''}, ${beast.alignment}</p>
                    <div class="statblock-separator"></div>
                    
                    <div class="statblock-property">
                        <span class="statblock-property-name">Armor Class</span>
                        <span class="statblock-property-value"> ${beast.ac}</span>
                    </div>
                    <div class="statblock-property">
                        <span class="statblock-property-name">Hit Points</span>
                        <span class="statblock-property-value"> ${beast.hp}</span>
                    </div>
                    <div class="statblock-property">
                        <span class="statblock-property-name">Speed</span>
                        <span class="statblock-property-value"> ${beast.speed}</span>
                    </div>
                    
                    <div class="statblock-separator"></div>
                    
                    <div class="statblock-ability-scores">
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">STR</div>
                            <div class="statblock-ability-score">${strParsed.score}</div>
                            <div class="statblock-ability-mod">(${strParsed.mod})</div>
                        </div>
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">DEX</div>
                            <div class="statblock-ability-score">${dexParsed.score}</div>
                            <div class="statblock-ability-mod">(${dexParsed.mod})</div>
                        </div>
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">CON</div>
                            <div class="statblock-ability-score">${conParsed.score}</div>
                            <div class="statblock-ability-mod">(${conParsed.mod})</div>
                        </div>
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">INT</div>
                            <div class="statblock-ability-score">${intParsed.score}</div>
                            <div class="statblock-ability-mod">(${intParsed.mod})</div>
                        </div>
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">WIS</div>
                            <div class="statblock-ability-score">${wisParsed.score}</div>
                            <div class="statblock-ability-mod">(${wisParsed.mod})</div>
                        </div>
                        <div class="statblock-ability">
                            <div class="statblock-ability-name">CHA</div>
                            <div class="statblock-ability-score">${chaParsed.score}</div>
                            <div class="statblock-ability-mod">(${chaParsed.mod})</div>
                        </div>
                    </div>
                    
                    <div class="statblock-separator"></div>
            `;
            
            // Add skills if present
            if (beast.skills) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Skills</span>
                        <span class="statblock-property-value"> ${beast.skills}</span>
                    </div>
                `;
            }
            
            // Add damage resistances if present
            if (beast.damageResistances) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Damage Resistances</span>
                        <span class="statblock-property-value"> ${beast.damageResistances}</span>
                    </div>
                `;
            }
            
            // Add damage vulnerabilities if present
            if (beast.damageVulnerabilities) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Damage Vulnerabilities</span>
                        <span class="statblock-property-value"> ${beast.damageVulnerabilities}</span>
                    </div>
                `;
            }
            
            // Add damage immunities if present
            if (beast.damageImmunities) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Damage Immunities</span>
                        <span class="statblock-property-value"> ${beast.damageImmunities}</span>
                    </div>
                `;
            }
            
            // Add condition immunities if present
            if (beast.conditionImmunities) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Condition Immunities</span>
                        <span class="statblock-property-value"> ${beast.conditionImmunities}</span>
                    </div>
                `;
            }
            
            // Add senses
            html += `
                <div class="statblock-property">
                    <span class="statblock-property-name">Senses</span>
                    <span class="statblock-property-value"> ${beast.senses}</span>
                </div>
            `;
            
            // Add languages
            html += `
                <div class="statblock-property">
                    <span class="statblock-property-name">Languages</span>
                    <span class="statblock-property-value"> ${beast.languages}</span>
                </div>
            `;
            
            // Add challenge rating
            html += `
                <div class="statblock-property">
                    <span class="statblock-property-name">Challenge</span>
                    <span class="statblock-property-value"> ${beast.cr} (${beast.xp})</span>
                </div>
            `;
            
            // Add environment
            if (beast.environment) {
                html += `
                    <div class="statblock-property">
                        <span class="statblock-property-name">Environment</span>
                        <span class="statblock-property-value"> ${beast.environment}</span>
                    </div>
                `;
            }
            
            // Add traits
            if (beast.traits && beast.traits.length > 0) {
                html += `<div class="statblock-separator"></div>`;
                
                beast.traits.forEach(trait => {
                    // Format text bounded by asterisks as italics
                    const formattedDesc = trait.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    
                    html += `
                        <div class="statblock-property">
                            <div class="statblock-property-name">${trait.name}</div>
                            <div class="statblock-property-value">${formattedDesc}</div>
                        </div>
                    `;
                });
            }
            
            // Add actions
            if (beast.actions && beast.actions.length > 0) {
                html += `
                    <div class="statblock-separator"></div>
                    <div class="statblock-action-title">Actions</div>
                `;
                
                beast.actions.forEach(action => {
                    // Format text bounded by asterisks as italics
                    const formattedDesc = action.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    
                    html += `
                        <div class="statblock-action">
                            <div class="statblock-action-name">${action.name}.</div>
                            <div>${formattedDesc}</div>
                        </div>
                    `;
                });
            }
            
            // Add reactions
            if (beast.reactions && beast.reactions.length > 0) {
                html += `
                    <div class="statblock-separator"></div>
                    <div class="statblock-action-title">Reactions</div>
                `;
                
                beast.reactions.forEach(reaction => {
                    // Format text bounded by asterisks as italics
                    const formattedReactionDesc = reaction.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    
                    html += `
                        <div class="statblock-action">
                            <div class="statblock-action-name">${reaction.name}.</div>
                            <div>${formattedReactionDesc}</div>
                        </div>
                    `;
                });
            }
            
            // Add legendary actions
            if (beast.legendaryActions && beast.legendaryActions.length > 0) {
                html += `
                    <div class="statblock-separator"></div>
                    <div class="statblock-action-title">Legendary Actions</div>
                `;
                
                beast.legendaryActions.forEach(legendaryAction => {
                    // Format text bounded by asterisks as italics
                    const formattedLegendaryDesc = legendaryAction.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                    
                    html += `
                        <div class="statblock-action">
                            <div class="statblock-action-name">${legendaryAction.name}.</div>
                            <div>${formattedLegendaryDesc}</div>
                        </div>
                    `;
                });
            }
            
            // Add source information
            if (sourceText) {
                html += `
                    <div class="statblock-separator"></div>
                    <div class="statblock-source">
                        ${sourceText}
                    </div>
                `;
            }
            
            // Close the statblock container
            html += `</div>`;
            
            // Update the statblock display
            elements.statblockDisplay.innerHTML = html;
        } catch (error) {
            console.error('Error rendering statblock:', error);
            showError('Error rendering statblock: ' + error.message);
        }
    }
    
    /**
     * Renders a statblock for the Wildshape tab
     * @param {Object} beast - Beast object to render
     */
    function renderWildshapeStatblock(beast) {
        // Update the title
        elements.wildshapeTitle.textContent = `Wildshape: ${beast.name}`;
        
        // Render the statblock (same as regular statblock for now)
        elements.wildshapeStatblock.innerHTML = '';
        const statblockClone = elements.statblockDisplay.cloneNode(true);
        elements.wildshapeStatblock.appendChild(statblockClone);
    }
    
    /**
     * Helper function to convert CR to numeric value for comparisons
     * @param {string} cr - Challenge rating (e.g., "1/4", "2")
     * @returns {number} Numeric value of CR
     */
    function crToValue(cr) {
        if (cr === '0') return 0;
        if (cr === '1/8') return 0.125;
        if (cr === '1/4') return 0.25;
        if (cr === '1/2') return 0.5;
        return parseFloat(cr);
    }
    
    /**
     * Checks if a beast's CR is within a specified range
     * @param {Object} beast - Beast object to check
     * @param {string} crFilter - CR filter string (e.g., "1-3", "<=2")
     * @returns {boolean} True if beast's CR matches the filter
     */
    function matchesCRFilter(beast, crFilter) {
        if (crFilter === 'all') return true;
        
        const beastCRValue = crToValue(beast.cr);
        
        if (crFilter.includes('-')) {
            // Range filter (e.g., "1-3")
            const [minCR, maxCR] = crFilter.split('-');
            const minValue = crToValue(minCR.trim());
            const maxValue = crToValue(maxCR.trim());
            
            return beastCRValue >= minValue && beastCRValue <= maxValue;
        } else if (crFilter.startsWith('<=')) {
            // Less than or equal filter (e.g., "<=2")
            const maxCR = crFilter.substring(2).trim();
            const maxValue = crToValue(maxCR);
            
            return beastCRValue <= maxValue;
        } else if (crFilter.startsWith('>=')) {
            // Greater than or equal filter (e.g., ">=1")
            const minCR = crFilter.substring(2).trim();
            const minValue = crToValue(minCR);
            
            return beastCRValue >= minValue;
        } else {
            // Exact match (e.g., "2")
            return beast.cr === crFilter;
        }
    }
    
    /**
     * Toggles a beast's favorite status
     * @param {string} beastId - ID of beast to toggle
     */
    function toggleFavorite(beastId) {
        DataManager.isFavorite(beastId)
            .then(isFavorite => {
                if (isFavorite) {
                    return DataManager.removeFavorite(beastId);
                } else {
                    return DataManager.addFavorite(beastId);
                }
            })
            .then(() => {
                updateFavoriteButton(beastId);
                
                // Update the list item appearance
                const listItem = elements.beastList.querySelector(`[data-beast-id="${beastId}"]`);
                if (listItem) {
                    DataManager.isFavorite(beastId)
                        .then(isFav => {
                            if (isFav) {
                                listItem.classList.add('list-group-item-favorite');
                            } else {
                                listItem.classList.remove('list-group-item-favorite');
                            }
                        });
                }
            })
            .catch(error => {
                console.error('Error toggling favorite:', error);
                showError('Could not update favorite status');
            });
    }
    
    /**
     * Displays an error message to the user
     * @param {string} message - Error message to display
     */
    function showError(message) {
        // For now, just use an alert
        alert(message);
    }
    
    /**
     * Shows beasts based on current filters
     */
    function applyFilters() {
        DataManager.getAllBeasts()
            .then(beasts => {
                // Apply name filter
                if (currentFilters.name) {
                    const nameLower = currentFilters.name.toLowerCase();
                    beasts = beasts.filter(beast => 
                        beast.name.toLowerCase().includes(nameLower)
                    );
                }
                
                // Apply CR filter
                if (currentFilters.cr !== 'all') {
                    beasts = beasts.filter(beast => matchesCRFilter(beast, currentFilters.cr));
                }
                
                // Apply size filter
                if (currentFilters.size !== 'all') {
                    beasts = beasts.filter(beast => beast.size === currentFilters.size);
                }
                
                // Render filtered beasts
                renderBeastList(beasts);
            })
            .catch(error => {
                console.error('Error applying filters:', error);
                showError('Could not filter beasts');
            });
    }
    
    /**
     * Shows only favorite beasts
     */
    function showOnlyFavorites() {
        DataManager.getAllFavorites()
            .then(beasts => {
                renderBeastList(beasts);
            })
            .catch(error => {
                console.error('Error getting favorites:', error);
                showError('Could not load favorites');
            });
    }
    
    /**
     * Resets all filters and shows all beasts
     */
    function resetFilters() {
        currentFilters = { name: '', cr: 'all', size: 'all' };
        currentSort = 'name';
        currentSortDirection = 'asc';
        elements.beastSearch.value = '';
        applyFilters();
    }
    
    // Public API
    return {
        renderBeastList,
        selectBeast,
        renderStatblock,
        renderWildshapeStatblock,
        toggleFavorite,
        applyFilters,
        showOnlyFavorites,
        resetFilters,
        
        // Internal state getter
        getCurrentBeast: () => currentBeast,
        
        // Filter setter/getter
        setFilter: (key, value) => {
            currentFilters[key] = value;
        },
        getFilter: (key) => currentFilters[key],
        
        // Sort setter/getter
        setSort: (sort) => {
            if (currentSort === sort) {
                // Toggle direction if clicking the same sort option
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = sort;
                currentSortDirection = 'asc'; // Reset direction when changing sort type
            }
        },
        setSortDirection: (direction) => {
            currentSortDirection = direction;
        },
        getSort: () => currentSort,
        getSortDirection: () => currentSortDirection
    };
})();