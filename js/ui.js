    /**
     * Select all animal tiles
     */
    function selectAllAnimals() {
        const animalTiles = document.querySelectorAll('.animal-tile');
        
        animalTiles.forEach(tile => {
            const animalId = tile.dataset.animalId;
            selectAnimalTile(tile, animalId);
        });
    }
    
    /**
     * Deselect all animal tiles
     */
    function selectNoAnimals() {
        const animalTiles = document.querySelectorAll('.animal-tile');
        
        animalTiles.forEach(tile => {
            const animalId = tile.dataset.animalId;
            deselectAnimalTile(tile, animalId);
        });
    }
    
    /**
     * Reset all attack and damage rolls
     */
    function resetRolls() {
        // Clear all roll result displays
        document.querySelectorAll('.roll-result').forEach(element => {
            element.innerHTML = '';
        });
        
        // Clear the total group damage
        const totalGroupDamage = document.getElementById('total-group-damage');
        if (totalGroupDamage) {
            totalGroupDamage.textContent = '';
        }
        
        // Clear critical hits tracking
        criticalHits = {};
    }/**
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
        conjureAnimalsButton: document.getElementById('conjureAnimalsButton'),
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
     * Formats source information into a display string - not used anymore
     * @param {object} sourceInfo - Source information object
     * @returns {string} Formatted source string
     */
    function formatSourceInfo(sourceInfo) {
        // Source information display is completely removed
        return "";
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
                elements.conjureAnimalsButton.disabled = false;
                document.getElementById('wildshapeFavoriteButton').disabled = false;
                document.getElementById('conjureFavoriteButton').disabled = false;
                
                // Update favorite buttons states
                updateFavoriteButtons(beastId);
            })
            .catch(error => {
                console.error('Error getting beast:', error);
                showError('Could not load beast data: ' + error);
            });
    }
    
    /**
     * Updates the favorite buttons states based on beast's favorite status
     * @param {string} beastId - ID of beast to check
     */
    function updateFavoriteButtons(beastId) {
        // Update Wildshape Favorite button
        DataManager.isWildshapeFavorite(beastId)
            .then(isWildshapeFavorite => {
                const wildshapeFavoriteButton = document.getElementById('wildshapeFavoriteButton');
                if (isWildshapeFavorite) {
                    wildshapeFavoriteButton.innerHTML = '<i class="bi bi-star-fill"></i> Wildshape Favorited';
                    wildshapeFavoriteButton.classList.remove('btn-outline-success');
                    wildshapeFavoriteButton.classList.add('btn-success');
                } else {
                    wildshapeFavoriteButton.innerHTML = '<i class="bi bi-star"></i> Wildshape Favorite';
                    wildshapeFavoriteButton.classList.remove('btn-success');
                    wildshapeFavoriteButton.classList.add('btn-outline-success');
                }
            })
            .catch(error => {
                console.error('Error checking wildshape favorite status:', error);
            });
            
        // Update Conjure Favorite button
        DataManager.isConjureFavorite(beastId)
            .then(isConjureFavorite => {
                const conjureFavoriteButton = document.getElementById('conjureFavoriteButton');
                if (isConjureFavorite) {
                    conjureFavoriteButton.innerHTML = '<i class="bi bi-star-fill"></i> Conjure Favorited';
                    conjureFavoriteButton.classList.remove('btn-outline-success');
                    conjureFavoriteButton.classList.add('btn-success');
                } else {
                    conjureFavoriteButton.innerHTML = '<i class="bi bi-star"></i> Conjure Favorite';
                    conjureFavoriteButton.classList.remove('btn-success');
                    conjureFavoriteButton.classList.add('btn-outline-success');
                }
            })
            .catch(error => {
                console.error('Error checking conjure favorite status:', error);
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
            
            // Source information removed completely
            
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
     * Toggles a beast's wildshape favorite status
     * @param {string} beastId - ID of beast to toggle
     */
    function toggleWildshapeFavorite(beastId) {
        DataManager.isWildshapeFavorite(beastId)
            .then(isWildshapeFavorite => {
                if (isWildshapeFavorite) {
                    return DataManager.removeWildshapeFavorite(beastId);
                } else {
                    return DataManager.addWildshapeFavorite(beastId);
                }
            })
            .then(() => {
                updateFavoriteButtons(beastId);
                
                // Update the list item appearance
                const listItem = elements.beastList.querySelector(`[data-beast-id="${beastId}"]`);
                if (listItem) {
                    DataManager.isWildshapeFavorite(beastId)
                        .then(isFav => {
                            if (isFav) {
                                listItem.classList.add('list-group-item-favorite');
                            } else {
                                // Only remove the class if it's not a conjure favorite
                                DataManager.isConjureFavorite(beastId)
                                    .then(isConjureFav => {
                                        if (!isConjureFav) {
                                            listItem.classList.remove('list-group-item-favorite');
                                        }
                                    });
                            }
                        });
                }
            })
            .catch(error => {
                console.error('Error toggling wildshape favorite:', error);
                showError('Could not update wildshape favorite status');
            });
    }
    
    /**
     * Toggles a beast's conjure favorite status
     * @param {string} beastId - ID of beast to toggle
     */
    function toggleConjureFavorite(beastId) {
        DataManager.isConjureFavorite(beastId)
            .then(isConjureFavorite => {
                if (isConjureFavorite) {
                    return DataManager.removeConjureFavorite(beastId);
                } else {
                    return DataManager.addConjureFavorite(beastId);
                }
            })
            .then(() => {
                updateFavoriteButtons(beastId);
                
                // Update the list item appearance
                const listItem = elements.beastList.querySelector(`[data-beast-id="${beastId}"]`);
                if (listItem) {
                    DataManager.isConjureFavorite(beastId)
                        .then(isFav => {
                            if (isFav) {
                                listItem.classList.add('list-group-item-favorite');
                            } else {
                                // Only remove the class if it's not a wildshape favorite
                                DataManager.isWildshapeFavorite(beastId)
                                    .then(isWildshapeFav => {
                                        if (!isWildshapeFav) {
                                            listItem.classList.remove('list-group-item-favorite');
                                        }
                                    });
                            }
                        });
                }
            })
            .catch(error => {
                console.error('Error toggling conjure favorite:', error);
                showError('Could not update conjure favorite status');
            });
    }
    
    /**
     * Toggles a beast's general favorite status (legacy - for backwards compatibility)
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
                updateFavoriteButtons(beastId);
                
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
     * Shows only wildshape favorite beasts
     */
    function showOnlyWildshapeFavorites() {
        DataManager.getAllWildshapeFavorites()
            .then(beasts => {
                renderBeastList(beasts);
            })
            .catch(error => {
                console.error('Error getting wildshape favorites:', error);
                showError('Could not load wildshape favorites');
            });
    }
    
    /**
     * Shows only conjure favorite beasts
     */
    function showOnlyConjureFavorites() {
        DataManager.getAllConjureFavorites()
            .then(beasts => {
                renderBeastList(beasts);
            })
            .catch(error => {
                console.error('Error getting conjure favorites:', error);
                showError('Could not load conjure favorites');
            });
    }
    
    /**
     * Shows only favorite beasts (both types combined)
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
    
        // Conjure Animals Tab State Variables
    let currentSummonedBeast = null;
    let selectedAnimals = [];
    let battlefieldTokens = [];
    let criticalHits = {};
    
    /**
     * Initializes the Conjure Animals tab with the selected beast
     * @param {Object} beast - Beast object to summon
     */
    function initConjureAnimalsTab(beast) {
        // Store the current beast
        currentSummonedBeast = beast;
        
        // Reset state
        selectedAnimals = [];
        battlefieldTokens = [];
        criticalHits = {};
        
        // Calculate number of creatures based on CR
        const cr = parseFloat(beast.cr.replace('1/8', '0.125').replace('1/4', '0.25').replace('1/2', '0.5'));
        let numCreatures = 1;
        
        if (cr <= 0.25) numCreatures = 8;
        else if (cr <= 0.5) numCreatures = 4;
        else if (cr <= 1) numCreatures = 2;
        
        // Render statblock
        renderConjureStatblock(beast);
        
        // Create animal tiles
        createAnimalTiles(beast, numCreatures);
        
        // Create battlefield tokens
        createBattlefieldTokens(numCreatures);
    }
    
    /**
     * Renders a statblock in the Conjure Animals tab
     * @param {Object} beast - Beast object to render
     */
    function renderConjureStatblock(beast) {
        // Get statblock HTML
        const statblockHTML = createStatblockHTML(beast);
        
        // Update Conjure tab statblock
        document.getElementById('conjure-statblock').innerHTML = statblockHTML;
    }
    
    /**
     * Creates a statblock HTML string
     * @param {Object} beast - Beast object
     * @returns {string} HTML string of statblock
     */
    function createStatblockHTML(beast) {
        // This is a full version that shows all information, similar to renderStatblock
        // Parse ability scores
        const strParsed = parseAbilityScore(beast.abilities.str);
        const dexParsed = parseAbilityScore(beast.abilities.dex);
        const conParsed = parseAbilityScore(beast.abilities.con);
        const intParsed = parseAbilityScore(beast.abilities.int);
        const wisParsed = parseAbilityScore(beast.abilities.wis);
        const chaParsed = parseAbilityScore(beast.abilities.cha);
        
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
                
                <div class="statblock-separator"></div>`;
        
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
        
        // Add actions section if present
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
        
        // Add reactions if present
        if (beast.reactions && beast.reactions.length > 0) {
            html += `
                <div class="statblock-separator"></div>
                <div class="statblock-action-title">Reactions</div>
            `;
            
            beast.reactions.forEach(reaction => {
                // Format text bounded by asterisks as italics
                const formattedDesc = reaction.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                
                html += `
                    <div class="statblock-action">
                        <div class="statblock-action-name">${reaction.name}.</div>
                        <div>${formattedDesc}</div>
                    </div>
                `;
            });
        }
        
        // Add legendary actions if present
        if (beast.legendaryActions && beast.legendaryActions.length > 0) {
            html += `
                <div class="statblock-separator"></div>
                <div class="statblock-action-title">Legendary Actions</div>
            `;
            
            beast.legendaryActions.forEach(legendaryAction => {
                // Format text bounded by asterisks as italics
                const formattedDesc = legendaryAction.desc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                
                html += `
                    <div class="statblock-action">
                        <div class="statblock-action-name">${legendaryAction.name}.</div>
                        <div>${formattedDesc}</div>
                    </div>
                `;
            });
        }
        
        // Add description if present
        if (beast.description) {
            html += `
                <div class="statblock-separator"></div>
                <div class="statblock-description">
                    ${beast.description.replace(/\n/g, '<br>')}
                </div>
            `;
        }
        // Source information removed by design
        
        // Close container
        html += `</div>`;
        
        return html;
    }
    
    /**
     * Creates tiles for summoned creatures
     * @param {Object} beast - Beast object for summoned creatures
     * @param {number} numCreatures - Number of creatures to summon
     */
    function createAnimalTiles(beast, numCreatures) {
        const container = document.getElementById('conjured-animals-list');
        container.innerHTML = '';
        
        const maxHP = extractMaxHP(beast.hp);
        
        for (let i = 1; i <= numCreatures; i++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'col-md-4 col-sm-6 mb-3';
            tileElement.innerHTML = `
                <div class="animal-tile" data-animal-id="${i}">
                    <h5 class="mb-2">${beast.name} #${i}</h5>
                    <div class="animal-hp">
                        <div class="progress w-100 me-2">
                            <div class="progress-bar bg-success" style="width: 100%" 
                                 role="progressbar" aria-valuenow="${maxHP}" 
                                 aria-valuemin="0" aria-valuemax="${maxHP}">
                              ${maxHP}/${maxHP}
                            </div>
                        </div>
                        <div class="hp-controls">
                            <button class="btn btn-sm btn-outline-danger damage-btn">-</button>
                            <button class="btn btn-sm btn-outline-success heal-btn">+</button>
                        </div>
                    </div>
                    <div class="attack-section">
                        <div class="attack-checkboxes mb-2">
                            ${createAttackOptionsHTML(beast)}
                        </div>
                        <div class="d-flex mb-2">
                            <select class="form-select form-select-sm advantage-select me-2">
                                <option value="normal">Normal</option>
                                <option value="advantage">Advantage</option>
                                <option value="disadvantage">Disadvantage</option>
                            </select>
                            <button class="btn btn-sm btn-primary attack-roll-btn">Roll</button>
                        </div>
                        <div class="d-flex">
                            <button class="btn btn-sm btn-danger damage-roll-btn me-2">Damage</button>
                            <div class="roll-result"></div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(tileElement);
            
            // Add event listeners to the new tile
            addAnimalTileEventListeners(tileElement, beast);
        }
    }
    
    /**
     * Extracts the maximum HP value from HP string
     * @param {string} hpString - HP string (e.g., "45 (6d10 + 12)")
     * @returns {number} Max HP value
     */
    function extractMaxHP(hpString) {
        if (!hpString) return 10;
        
        // Try to get just the numeric part before any parentheses
        const match = hpString.match(/^(\d+)/);
        if (match && match[1]) {
            return parseInt(match[1]);
        }
        
        // Fallback
        return 10;
    }
    
    /**
     * Creates options for attack select dropdown
     * @param {Object} beast - Beast object
     * @returns {string} HTML for select options
     */
    function createAttackOptionsHTML(beast) {
        let attacksHtml = '';
        
        if (beast.actions) {
            // Add a checkbox for each attack
            beast.actions.forEach(action => {
                // Check if it's an attack action
                if (action.desc && (action.desc.includes('Weapon Attack:') || action.desc.includes('Melee Attack:') || action.desc.includes('Ranged Attack:'))) {
                    attacksHtml += `
                    <div class="form-check">
                        <input class="form-check-input attack-checkbox" type="checkbox" value="${action.name}" id="attack-${action.name.replace(/\s+/g, '-').toLowerCase()}" checked>
                        <label class="form-check-label" for="attack-${action.name.replace(/\s+/g, '-').toLowerCase()}">
                            ${action.name}
                        </label>
                    </div>`;
                }
            });
        }
        
        return attacksHtml;
    }
    
    /**
     * Adds event listeners to animal tile
     * @param {Element} tileElement - Tile element
     * @param {Object} beast - Beast object
     */
    function addAnimalTileEventListeners(tileElement, beast) {
        const tile = tileElement.querySelector('.animal-tile');
        const animalId = tile.dataset.animalId;
        
        // Selection handling via click
        tile.addEventListener('click', (e) => {
            // Don't trigger if clicking on a button or select
            if (!e.target.closest('button') && !e.target.closest('select')) {
                toggleAnimalTileSelection(tile, animalId);
            }
        });
        
        // HP modification
        tile.querySelector('.damage-btn').addEventListener('click', () => {
            promptHPChange(animalId, -1, beast);
        });
        
        tile.querySelector('.heal-btn').addEventListener('click', () => {
            promptHPChange(animalId, 1, beast);
        });
        
        // Attack roll
        tile.querySelector('.attack-roll-btn').addEventListener('click', () => {
            const attackCheckboxes = tile.querySelectorAll('.attack-checkbox:checked');
            const selectedAttacks = Array.from(attackCheckboxes).map(checkbox => checkbox.value);
            handleAttackRoll(animalId, selectedAttacks, beast);
        });
        
        // Damage roll
        tile.querySelector('.damage-roll-btn').addEventListener('click', () => {
            const attackCheckboxes = tile.querySelectorAll('.attack-checkbox:checked');
            const selectedAttacks = Array.from(attackCheckboxes).map(checkbox => checkbox.value);
            handleDamageRoll(animalId, selectedAttacks, beast);
        });
    }
    
    /**
     * Toggles animal tile selection
     * @param {Element} tile - Tile element
     * @param {string} animalId - Animal ID
     */
    function toggleAnimalTileSelection(tile, animalId) {
        if (tile.classList.contains('selected')) {
            deselectAnimalTile(tile, animalId);
        } else {
            selectAnimalTile(tile, animalId);
        }
    }
    
    /**
     * Selects an animal tile
     * @param {Element} tile - Tile element
     * @param {string} animalId - Animal ID
     */
    function selectAnimalTile(tile, animalId) {
        tile.classList.add('selected');
        
        // Update selected animals list
        if (!selectedAnimals.includes(animalId)) {
            selectedAnimals.push(animalId);
        }
        
        // Also update battlefield token selection
        updateBattlefieldSelections();
    }
    
    /**
     * Deselects an animal tile
     * @param {Element} tile - Tile element
     * @param {string} animalId - Animal ID
     */
    function deselectAnimalTile(tile, animalId) {
        tile.classList.remove('selected');
        
        // Update selected animals list
        selectedAnimals = selectedAnimals.filter(id => id !== animalId);
        
        // Also update battlefield token selection
        updateBattlefieldSelections();
    }
    
    /**
     * Creates battlefield tokens for summoned animals
     * @param {number} numCreatures - Number of creatures to summon
     */
    function createBattlefieldTokens(numCreatures) {
        const battlefield = document.getElementById('battlefield');
        battlefield.innerHTML = '';
        
        // Clear existing tokens
        battlefieldTokens = [];
        
        // Calculate tokens per row based on battlefield width
        const tokenSize = 45; // Size + margin
        const startX = 20;
        const startY = 20;
        const tokensPerRow = Math.min(8, numCreatures); // Maximum 8 tokens per row
        
        // Create tokens for each animal in a grid formation
        for (let i = 1; i <= numCreatures; i++) {
            const token = document.createElement('div');
            token.className = 'battlefield-token animal';
            token.dataset.animalId = i;
            token.textContent = i;
            
            // Calculate position in grid
            const row = Math.floor((i - 1) / tokensPerRow);
            const col = (i - 1) % tokensPerRow;
            
            const x = startX + (col * tokenSize);
            const y = startY + (row * tokenSize);
            
            token.style.left = x + 'px';
            token.style.top = y + 'px';
            
            // Make token draggable
            makeDraggable(token);
            
            // Selection handling
            token.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent battlefield click
                toggleBattlefieldTokenSelection(token);
            });
            
            battlefield.appendChild(token);
            battlefieldTokens.push({
                element: token,
                animalId: i,
                type: 'animal'
            });
        }
        
        initBattlefield();
    }
    
    /**
     * Initializes battlefield interactions
     */
    function initBattlefield() {
        const battlefield = document.getElementById('battlefield');
        
        let isSelecting = false;
        let selectionBox = null;
        let startX, startY;
        
        // Mouse down (start selection or dragging)
        battlefield.addEventListener('mousedown', (e) => {
            // Only start selection box if clicking directly on the battlefield
            if (e.target === battlefield) {
                // Clear existing selections first when starting a new selection box
                document.querySelectorAll('.battlefield-token.selected').forEach(token => {
                    token.classList.remove('selected');
                });
                selectedAnimals = [];
                
                // Update animal tiles to match
                document.querySelectorAll('.animal-tile.selected').forEach(tile => {
                    tile.classList.remove('selected');
                });
                
                isSelecting = true;
                startX = e.clientX - battlefield.getBoundingClientRect().left;
                startY = e.clientY - battlefield.getBoundingClientRect().top;
                
                selectionBox = document.createElement('div');
                selectionBox.className = 'selection-box';
                selectionBox.style.left = startX + 'px';
                selectionBox.style.top = startY + 'px';
                selectionBox.style.width = '0px';
                selectionBox.style.height = '0px';
                
                battlefield.appendChild(selectionBox);
            }
        });
        
        // Mouse move (update selection box)
        battlefield.addEventListener('mousemove', (e) => {
            if (isSelecting && selectionBox) {
                const currentX = e.clientX - battlefield.getBoundingClientRect().left;
                const currentY = e.clientY - battlefield.getBoundingClientRect().top;
                
                const width = currentX - startX;
                const height = currentY - startY;
                
                // Set selection box size and position based on drag direction
                if (width < 0) {
                    selectionBox.style.left = currentX + 'px';
                    selectionBox.style.width = Math.abs(width) + 'px';
                } else {
                    selectionBox.style.width = width + 'px';
                }
                
                if (height < 0) {
                    selectionBox.style.top = currentY + 'px';
                    selectionBox.style.height = Math.abs(height) + 'px';
                } else {
                    selectionBox.style.height = height + 'px';
                }
            }
        });
        
        // Mouse up (finish selection)
        battlefield.addEventListener('mouseup', (e) => {
            if (isSelecting) {
                isSelecting = false;
                
                if (selectionBox) {
                    // Get selection box bounds
                    const boxRect = selectionBox.getBoundingClientRect();
                    const battlefieldRect = battlefield.getBoundingClientRect();
                    
                    // Check which tokens are inside the selection box
                    document.querySelectorAll('.battlefield-token').forEach(token => {
                        const tokenRect = token.getBoundingClientRect();
                        
                        if (
                            tokenRect.left >= boxRect.left &&
                            tokenRect.right <= boxRect.right &&
                            tokenRect.top >= boxRect.top &&
                            tokenRect.bottom <= boxRect.bottom
                        ) {
                            // Select this token
                            selectBattlefieldToken(token);
                        }
                    });
                    
                    // Remove selection box
                    battlefield.removeChild(selectionBox);
                    selectionBox = null;
                }
            }
        });
        
        // Prevent default drag behavior
        battlefield.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
    
    /**
     * Makes an element draggable
     * @param {Element} element - Element to make draggable
     */
    function makeDraggable(element) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY;
        
        // For group dragging
        let dragGroup = [];
        let dragOffsets = [];
        
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            originalX = element.offsetLeft;
            originalY = element.offsetTop;
            
            // Prepare for group dragging if applicable
            if (element.classList.contains('selected')) {
                dragGroup = Array.from(document.querySelectorAll('.battlefield-token.selected'));
                dragOffsets = dragGroup.map(el => ({
                    x: el.offsetLeft,
                    y: el.offsetTop
                }));
            } else {
                dragGroup = [element];
                dragOffsets = [{ x: originalX, y: originalY }];
            }
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Move each token in the drag group
            dragGroup.forEach((token, index) => {
                token.style.left = (dragOffsets[index].x + dx) + 'px';
                token.style.top = (dragOffsets[index].y + dy) + 'px';
            });
        }
        
        function handleMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }
    
    /**
     * Adds an enemy token to the battlefield
     */
    function addEnemyToken() {
        const battlefield = document.getElementById('battlefield');
        if (!battlefield) return;
        
        const enemyId = battlefieldTokens.filter(t => t.type === 'enemy').length + 1;
        
        const token = document.createElement('div');
        token.className = 'battlefield-token enemy';
        token.dataset.enemyId = enemyId;
        token.textContent = 'E' + enemyId;
        
        // Random position within battlefield
        const x = 50 + Math.random() * (battlefield.offsetWidth - 100);
        const y = 50 + Math.random() * (battlefield.offsetHeight - 100);
        
        token.style.left = x + 'px';
        token.style.top = y + 'px';
        
        // Make token draggable
        makeDraggable(token);
        
        // Selection handling
        token.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent battlefield click
            toggleBattlefieldTokenSelection(token);
        });
        
        battlefield.appendChild(token);
        battlefieldTokens.push({
            element: token,
            enemyId: enemyId,
            type: 'enemy'
        });
    }
    
    /**
     * Toggle battlefield token selection
     * @param {Element} token - Token element
     */
    function toggleBattlefieldTokenSelection(token) {
        if (token.classList.contains('selected')) {
            deselectBattlefieldToken(token);
        } else {
            selectBattlefieldToken(token);
        }
    }
    
    /**
     * Deselect a battlefield token and update tile
     * @param {Element} token - Token element
     */
    function deselectBattlefieldToken(token) {
        token.classList.remove('selected');
        
        // If it's an animal token, update the corresponding tile
        if (token.dataset.animalId) {
            const animalId = token.dataset.animalId;
            const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
            
            if (tile) {
                // Update tile and checkbox
                tile.classList.remove('selected');
                const selectionToggle = tile.querySelector('.selection-toggle');
                if (selectionToggle) selectionToggle.checked = false;
                
                // Update selected animals list
                selectedAnimals = selectedAnimals.filter(id => id !== animalId);
            }
        }
    }
    
    /**
     * Select a battlefield token (without toggling)
     * @param {Element} token - Token element
     */
    function selectBattlefieldToken(token) {
        token.classList.add('selected');
        
        // If it's an animal token, update the corresponding tile
        if (token.dataset.animalId) {
            const animalId = token.dataset.animalId;
            const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
            
            if (tile) {
                // Update tile and checkbox
                tile.classList.add('selected');
                const selectionToggle = tile.querySelector('.selection-toggle');
                if (selectionToggle) selectionToggle.checked = true;
                
                // Update selected animals list
                if (!selectedAnimals.includes(animalId)) {
                    selectedAnimals.push(animalId);
                }
            }
        }
    }
    
    /**
     * Update battlefield token selections based on animal tile selections
     */
    function updateBattlefieldSelections() {
        // Clear all selections first
        document.querySelectorAll('.battlefield-token.animal').forEach(token => {
            token.classList.remove('selected');
        });
        
        // Add selections based on selectedAnimals
        selectedAnimals.forEach(animalId => {
            const token = document.querySelector(`.battlefield-token.animal[data-animal-id="${animalId}"]`);
            if (token) {
                token.classList.add('selected');
            }
            
            // Also update checkbox state
            const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
            if (tile) {
                const checkbox = tile.querySelector('.selection-toggle');
                if (checkbox) checkbox.checked = true;
            }
        });
        
        // Ensure all unselected tiles have unchecked boxes
        document.querySelectorAll('.animal-tile:not(.selected)').forEach(tile => {
            const checkbox = tile.querySelector('.selection-toggle');
            if (checkbox) checkbox.checked = false;
        });
    }
    
    /**
     * Prompt for HP change
     * @param {string} animalId - Animal ID
     * @param {number} direction - 1 for healing, -1 for damage
     * @param {Object} beast - Beast object
     */
    function promptHPChange(animalId, direction, beast) {
        const amount = prompt(`Enter amount to ${direction > 0 ? 'heal' : 'damage'} creature #${animalId}:`);
        if (amount === null) return;
        
        const numAmount = parseInt(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;
        
        updateAnimalHP(animalId, direction * numAmount, beast);
    }
    
    /**
     * Update animal HP
     * @param {string} animalId - Animal ID
     * @param {number} change - Amount to change HP by (positive for healing, negative for damage)
     * @param {Object} beast - Beast object
     */
    function updateAnimalHP(animalId, change, beast) {
        const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
        if (!tile) return;
        
        const progressBar = tile.querySelector('.progress-bar');
        const maxHP = extractMaxHP(beast.hp);
        
        // Get current HP
        let currentHP = parseInt(progressBar.textContent.split('/')[0]);
        
        // Apply change
        currentHP = Math.max(0, Math.min(maxHP, currentHP + change));
        
        // Update display
        progressBar.textContent = `${currentHP}/${maxHP}`;
        progressBar.style.width = ((currentHP / maxHP) * 100) + '%';
        
        // Update class based on health percentage
        progressBar.className = 'progress-bar';
        if (currentHP <= 0) {
            progressBar.classList.add('bg-danger');
        } else if (currentHP < maxHP / 2) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-success');
        }
    }
    
    /**
     * Handle attack roll for a single animal
     * @param {string} animalId - Animal ID
     * @param {string} attackType - Attack type ("all" or specific attack name)
     * @param {Object} beast - Beast object
     */
    function handleAttackRoll(animalId, attackTypes, beast) {
        // Get advantage setting for this specific animal
        const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
        if (!tile) return;
        
        const advantage = tile.querySelector('.advantage-select').value;
        let results = [];
        
        // Get attacks to roll
        const attacks = getAttacksToRoll(attackTypes, beast);
        
        // Roll for each attack
        attacks.forEach(attack => {
            // Extract attack bonus
            const attackBonus = extractAttackBonus(attack.desc);
            
            // Roll dice with advantage/disadvantage
            const roll1 = rollD20();
            const roll2 = rollD20();
            
            let effectiveRoll, rollsDisplay;
            if (advantage === 'advantage') {
                effectiveRoll = Math.max(roll1, roll2);
                rollsDisplay = `${roll1}, ${roll2} (${effectiveRoll})`;
            } else if (advantage === 'disadvantage') {
                effectiveRoll = Math.min(roll1, roll2);
                rollsDisplay = `${roll1}, ${roll2} (${effectiveRoll})`;
            } else {
                effectiveRoll = roll1;
                rollsDisplay = `${roll1}`;
            }
            
            // Add attack bonus
            const total = effectiveRoll + attackBonus;
            
            // Check for critical hit
            const isCritical = effectiveRoll === 20;
            if (isCritical) {
                if (!criticalHits[animalId]) criticalHits[animalId] = {};
                criticalHits[animalId][attack.name] = true;
            }
            
            // Save result
            results.push({
                attack: attack.name,
                rolls: rollsDisplay,
                bonus: attackBonus,
                total: total,
                critical: isCritical
            });
        });
        
        // Display results
        displayRollResults(animalId, results, 'attack');
    }
    
    /**
     * Extract attack bonus from action description
     * @param {string} desc - Action description
     * @returns {number} Attack bonus
     */
    function extractAttackBonus(desc) {
        if (!desc) return 0;
        
        const match = desc.match(/\+([0-9]+)\s+to\s+hit/);
        if (match && match[1]) {
            return parseInt(match[1]);
        }
        
        return 0;
    }
    
    /**
     * Handle damage roll for a single animal
     * @param {string} animalId - Animal ID
     * @param {string} attackType - Attack type ("all" or specific attack name)
     * @param {Object} beast - Beast object
     */
    function handleDamageRoll(animalId, attackTypes, beast) {
        let results = [];
        
        // Get attacks to roll
        const attacks = getAttacksToRoll(attackTypes, beast);
        
        // Roll for each attack
        attacks.forEach(attack => {
            // Check if we have a critical hit for this attack
            const isCritical = criticalHits[animalId] && criticalHits[animalId][attack.name];
            
            // Parse damage formula
            const damageInfo = extractDamageFormula(attack.desc);
            
            if (damageInfo) {
                // Roll damage dice
                const { diceCount, diceType, bonus } = damageInfo;
                let rolls = [];
                
                // Double dice on critical hit - per D&D 5e rules
                const effectiveDiceCount = isCritical ? diceCount * 2 : diceCount;
                
                for (let i = 0; i < effectiveDiceCount; i++) {
                    rolls.push(Math.floor(Math.random() * diceType) + 1);
                }
                
                // Calculate total - only add the modifier once, not doubled on critical hits per D&D 5e rules
                const diceTotal = rolls.reduce((sum, roll) => sum + roll, 0);
                const damageTotal = diceTotal + bonus; // Bonus added just once, not doubled on crits
                
                // Format details
                const damageDetails = `${rolls.join(' + ')}${bonus ? ' + ' + bonus : ''} = ${damageTotal}`;
                
                // Save result
                results.push({
                    attack: attack.name,
                    formula: `${diceCount}d${diceType}${bonus ? ' + ' + bonus : ''}`,
                    damage: damageDetails,
                    total: damageTotal,
                    critical: isCritical
                });
            } else {
                // Couldn't parse damage formula
                results.push({
                    attack: attack.name,
                    formula: 'Unknown',
                    damage: 'Could not calculate',
                    total: 0,
                    critical: isCritical
                });
            }
        });
        
        // Clear critical hit flag after damage roll
        if (criticalHits[animalId]) {
            delete criticalHits[animalId];
        }
        
        // Display results
        displayRollResults(animalId, results, 'damage');
    }
    
    /**
     * Extract damage formula from action description
     * @param {string} desc - Action description
     * @returns {Object|null} Object with diceCount, diceType, and bonus
     */
    function extractDamageFormula(desc) {
        if (!desc) return null;
        
        // Example formats:
        // "13 (2d8 + 4) piercing damage"
        // "7 (2d6) slashing damage"
        // "6 (1d6 + 3) slashing damage"
        // "Claw: 11 (2d6 + 4) slashing damage"
        
        // First try the standard format with parentheses
        let match = desc.match(/\d+\s*\((\d+)d(\d+)(?:\s*\+\s*(\d+))?\)/);
        
        // If that doesn't work, try a more forgiving pattern without parentheses
        if (!match) {
            match = desc.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
        }
        
        // Additionally look for specific attack names like "Claw" if all else fails
        if (!match && (desc.includes("Claw") || desc.includes("claw"))) {
            // Default values for common claw attacks if we can't extract them
            console.log("Using fallback values for claw attack: " + desc);
            return {
                diceCount: 2, // Most claw attacks use 2 dice
                diceType: 6,  // Usually d6
                bonus: 3      // Typical modifier
            };
        }
        
        if (match) {
            return {
                diceCount: parseInt(match[1]),
                diceType: parseInt(match[2]),
                bonus: match[3] ? parseInt(match[3]) : 0
            };
        }
        
        return null;
    }
    
    /**
     * Handle group attack roll
     */
    function handleGroupAttackRoll() {
        if (!currentSummonedBeast || selectedAnimals.length === 0) {
            alert('Please select at least one animal first');
            return;
        }
        
        // Get the global advantage setting
        const advantageSelect = document.getElementById('advantage-select');
        const advantage = advantageSelect ? advantageSelect.value : 'normal';
                
        // Roll for each selected animal using their individually selected attack
        selectedAnimals.forEach(animalId => {
            // Get the selected attacks from checkboxes
            const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
            if (!tile) return;
            
            const attackCheckboxes = tile.querySelectorAll('.attack-checkbox:checked');
            const selectedAttacks = Array.from(attackCheckboxes).map(checkbox => checkbox.value);
            
            // Override the individual animal's advantage setting with the global one
            const animalAdvantageSelect = tile.querySelector('.advantage-select');
            if (animalAdvantageSelect) {
                animalAdvantageSelect.value = advantage;
            }
            
            handleAttackRoll(animalId, selectedAttacks, currentSummonedBeast);
        });
    }
    
    /**
     * Handle group damage roll
     */
    function handleGroupDamageRoll() {
        if (!currentSummonedBeast || selectedAnimals.length === 0) {
            alert('Please select at least one animal first');
            return;
        }
                
        // Roll for each selected animal and calculate total damage
        let totalDamage = 0;
        
        selectedAnimals.forEach(animalId => {
            // Get the selected attacks from checkboxes
            const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
            if (!tile) return;
            
            const attackCheckboxes = tile.querySelectorAll('.attack-checkbox:checked');
            const selectedAttacks = Array.from(attackCheckboxes).map(checkbox => checkbox.value);
            
            // Get attacks to roll
            const attacks = getAttacksToRoll(selectedAttacks, currentSummonedBeast);
            
            // Roll for each attack
            attacks.forEach(attack => {
                // Check if we have a critical hit for this attack
                const isCritical = criticalHits[animalId] && criticalHits[animalId][attack.name];
                
                // Parse damage formula
                const damageInfo = extractDamageFormula(attack.desc);
                
                if (damageInfo) {
                    // Roll damage dice
                    const { diceCount, diceType, bonus } = damageInfo;
                    let rolls = [];
                    
                    // Double dice on critical hit - per D&D 5e rules
                    const effectiveDiceCount = isCritical ? diceCount * 2 : diceCount;
                    
                    for (let i = 0; i < effectiveDiceCount; i++) {
                        rolls.push(Math.floor(Math.random() * diceType) + 1);
                    }
                    
                    // Calculate total - add bonus only once (not doubled on crits)
                    const diceTotal = rolls.reduce((sum, roll) => sum + roll, 0);
                    const damageTotal = diceTotal + bonus; // Bonus only added once per 5e rules
                    
                    // Add to total damage
                    totalDamage += damageTotal;
                }
            });
            
            // Call normal damage roll to display results
            handleDamageRoll(animalId, selectedAttacks, currentSummonedBeast);
        });
        
        // Display total group damage
        document.getElementById('total-group-damage').textContent = ' ' + totalDamage;
    }
    
    /**
     * Display roll results in animal tile
     * @param {string} animalId - Animal ID
     * @param {Array} results - Array of roll results
     * @param {string} rollType - Type of roll ('attack' or 'damage')
     */
    function displayRollResults(animalId, results, rollType) {
        const tile = document.querySelector(`.animal-tile[data-animal-id="${animalId}"]`);
        if (!tile) return;
        
        const resultElement = tile.querySelector('.roll-result');
        
        // Build result HTML
        let html = '';
        
        if (rollType === 'attack') {
            results.forEach(result => {
                html += `<div class="mb-2">
                    <div class="fw-bold">${result.attack}:</div>
                    <div class="${result.critical ? 'text-danger' : 'text-primary'}">
                        <span class="badge bg-secondary me-1">Dice: ${result.rolls}</span>
                        <span class="badge bg-secondary me-1">Bonus: +${result.bonus}</span>
                        <span class="badge bg-${result.critical ? 'danger' : 'primary'} me-1">Total: ${result.total}</span>
                        ${result.critical ? '<span class="badge bg-danger">CRITICAL HIT!</span>' : ''}
                    </div>
                </div>`;
            });
        } else if (rollType === 'damage') {
            results.forEach(result => {
                const damageDetail = result.damage.split('=');
                html += `<div class="mb-2">
                    <div class="fw-bold">${result.attack}:</div>
                    <div class="text-danger">
                        <span class="badge bg-secondary me-1">Formula: ${result.formula}</span>
                        <span class="badge bg-secondary me-1">Rolls: ${damageDetail[0].trim()}</span>
                        <span class="badge bg-danger me-1">Damage: ${damageDetail[1].trim()}</span>
                        ${result.critical ? '<span class="badge bg-danger">CRITICAL HIT!</span>' : ''}
                    </div>
                </div>`;
            });
        }
        
        resultElement.innerHTML = html;
        
        // Ensure the tile grows with content
        tile.style.height = 'auto';
        tile.style.minHeight = '200px';
    }
    
    /**
     * Get attacks to roll based on selection
     * @param {string} attackType - Attack type ("all" or specific attack name)
     * @param {Object} beast - Beast object
     * @returns {Array} Array of attack objects
     */
    function getAttacksToRoll(attackTypes, beast) {
        let attacks = [];
        
        // attackTypes can be an array of attack names or a single attack name
        if (Array.isArray(attackTypes)) {
            // Get specified attacks
            attackTypes.forEach(attackName => {
                const attack = beast.actions.find(action => action.name === attackName);
                if (attack) {
                    attacks.push(attack);
                }
            });
        } else if (typeof attackTypes === 'string') {
            // Legacy support for single attack name
            const attack = beast.actions.find(action => action.name === attackTypes);
            if (attack) {
                attacks.push(attack);
            }
        }
        
        // If no attacks were found, default to all attacks
        if (attacks.length === 0) {
            beast.actions.forEach(action => {
                if (action.desc && (action.desc.includes('Weapon Attack:') || action.desc.includes('Melee Attack:') || action.desc.includes('Ranged Attack:'))) {
                    attacks.push(action);
                }
            });
        }
        
        return attacks;
    }
    
    /**
     * Select all animal tiles
     */
    function selectAllAnimals() {
        const animalTiles = document.querySelectorAll('.animal-tile');
        
        animalTiles.forEach(tile => {
            const animalId = tile.dataset.animalId;
            selectAnimalTile(tile, animalId);
        });
    }
    
    /**
     * Deselect all animal tiles
     */
    function selectNoAnimals() {
        const animalTiles = document.querySelectorAll('.animal-tile');
        
        animalTiles.forEach(tile => {
            const animalId = tile.dataset.animalId;
            deselectAnimalTile(tile, animalId);
        });
    }
    
    /**
     * Roll a d20
     * @returns {number} Random number between 1 and 20
     */
    function rollD20() {
        return Math.floor(Math.random() * 20) + 1;
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
        
        // Conjure Animals tab functions
        initConjureAnimalsTab,
        addEnemyToken,
        handleGroupAttackRoll,
        handleGroupDamageRoll,
        selectAllAnimals,
        selectNoAnimals,
        resetRolls,
        
        // Internal state getter
        getCurrentBeast: () => currentBeast,
        
        // Expose favorites functions
        toggleWildshapeFavorite,
        toggleConjureFavorite,
        showOnlyWildshapeFavorites,
        showOnlyConjureFavorites,
        
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