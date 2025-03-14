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
        filterDropdown: document.getElementById('filterDropdown'),
        showFavorites: document.getElementById('showFavorites'),
        resetFilters: document.getElementById('resetFilters'),
        
        // Statblock display
        statblockDisplay: document.getElementById('statblockDisplay'),
        wildshapeButton: document.getElementById('wildshapeButton'),
        favoriteButton: document.getElementById('favoriteButton'),
        conjureButton: document.getElementById('conjureButton'),
        
        // Wildshape tab
        wildshapeTitle: document.getElementById('wildshapeTitle'),
        wildshapeStatblock: document.getElementById('wildshapeStatblock'),
        
        // Conjure Animals tab
        conjuredBeastInfo: document.getElementById('conjuredBeastInfo'),
        healthTrackers: document.getElementById('healthTrackers'),
        attackOptions: document.getElementById('attackOptions'),
        combatResults: document.getElementById('combatResults'),
        
        // Battlefield
        battlefield: document.getElementById('battlefield'),
        toggleBattlefield: document.getElementById('toggleBattlefield'),
        
        // Data management
        mdFileInput: document.getElementById('mdFileInput'),
        uploadDataBtn: document.getElementById('uploadDataBtn'),
        resetDataBtn: document.getElementById('resetDataBtn')
    };
    
    // Current state
    let currentBeast = null;
    let currentFilters = { name: '', cr: 'all', size: 'all' };
    let currentSort = 'name';
    
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
        
        // Sort beasts based on current sort option
        switch (currentSort) {
            case 'name':
                beasts.sort((a, b) => a.name.localeCompare(b.name));
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
                    return crToValue(a.cr) - crToValue(b.cr);
                });
                break;
            case 'size':
                const sizeOrder = { 'Tiny': 1, 'Small': 2, 'Medium': 3, 'Large': 4, 'Huge': 5, 'Gargantuan': 6 };
                beasts.sort((a, b) => sizeOrder[a.size] - sizeOrder[b.size]);
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
                currentBeast = beast;
                renderStatblock(beast);
                
                // Enable buttons
                elements.wildshapeButton.disabled = false;
                elements.favoriteButton.disabled = false;
                elements.conjureButton.disabled = false;
                
                // Update favorite button state
                updateFavoriteButton(beastId);
            })
            .catch(error => {
                console.error('Error getting beast:', error);
                showError('Could not load beast data');
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
     * Renders a statblock for a beast
     * @param {Object} beast - Beast object to render
     */
    function renderStatblock(beast) {
        // Format ability score modifiers
        function getAbilityModifier(score) {
            const mod = Math.floor((parseInt(score) - 10) / 2);
            return mod >= 0 ? `+${mod}` : mod.toString();
        }
        
        const strMod = getAbilityModifier(beast.abilities.str);
        const dexMod = getAbilityModifier(beast.abilities.dex);
        const conMod = getAbilityModifier(beast.abilities.con);
        const intMod = getAbilityModifier(beast.abilities.int);
        const wisMod = getAbilityModifier(beast.abilities.wis);
        const chaMod = getAbilityModifier(beast.abilities.cha);
        
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
                        <div class="statblock-ability-score">${beast.abilities.str}</div>
                        <div class="statblock-ability-mod">(${strMod})</div>
                    </div>
                    <div class="statblock-ability">
                        <div class="statblock-ability-name">DEX</div>
                        <div class="statblock-ability-score">${beast.abilities.dex}</div>
                        <div class="statblock-ability-mod">(${dexMod})</div>
                    </div>
                    <div class="statblock-ability">
                        <div class="statblock-ability-name">CON</div>
                        <div class="statblock-ability-score">${beast.abilities.con}</div>
                        <div class="statblock-ability-mod">(${conMod})</div>
                    </div>
                    <div class="statblock-ability">
                        <div class="statblock-ability-name">INT</div>
                        <div class="statblock-ability-score">${beast.abilities.int}</div>
                        <div class="statblock-ability-mod">(${intMod})</div>
                    </div>
                    <div class="statblock-ability">
                        <div class="statblock-ability-name">WIS</div>
                        <div class="statblock-ability-score">${beast.abilities.wis}</div>
                        <div class="statblock-ability-mod">(${wisMod})</div>
                    </div>
                    <div class="statblock-ability">
                        <div class="statblock-ability-name">CHA</div>
                        <div class="statblock-ability-score">${beast.abilities.cha}</div>
                        <div class="statblock-ability-mod">(${chaMod})</div>
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
                        <div class="statblock-property-name">${trait.name}.</div>
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
        
        // Close the statblock container
        html += `</div>`;
        
        // Remove description section as requested
        
        // Update the statblock display
        elements.statblockDisplay.innerHTML = html;
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
     * Renders the conjured animals information
     * @param {Object} beast - Beast object that was conjured
     */
    function renderConjuredBeast(beast) {
        // Determine number of creatures based on CR
        let numCreatures = 1;
        
        switch(beast.cr) {
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
        
        // Update conjured beast info
        elements.conjuredBeastInfo.innerHTML = `
            <div class="alert alert-success">
                <h5>Summoned: ${numCreatures}× ${beast.name}</h5>
                <p><strong>CR:</strong> ${beast.cr} | <strong>HP:</strong> ${beast.hp.split(' ')[0]} each</p>
            </div>
        `;
        
        // Create health trackers
        renderHealthTrackers(beast, numCreatures);
        
        // Create attack options
        renderAttackOptions(beast, numCreatures);
        
        // Reset combat results
        elements.combatResults.innerHTML = `
            <div class="text-center p-5">
                <h3>No combat results</h3>
                <p class="text-muted">Make an attack to see results</p>
            </div>
        `;
    }
    
    /**
     * Renders health trackers for conjured creatures
     * @param {Object} beast - Beast object that was conjured
     * @param {number} numCreatures - Number of creatures conjured
     */
    function renderHealthTrackers(beast, numCreatures) {
        elements.healthTrackers.innerHTML = '';
        
        // Extract max HP from string like "45 (6d10 + 12)"
        const maxHpMatch = beast.hp.match(/(\d+)/);
        const maxHp = maxHpMatch ? parseInt(maxHpMatch[1]) : 10;
        
        for (let i = 1; i <= numCreatures; i++) {
            const tracker = document.createElement('div');
            tracker.className = 'health-tracker';
            tracker.innerHTML = `
                <div class="health-tracker-header">
                    <span class="health-tracker-name">${beast.name} #${i}</span>
                    <span class="health-tracker-hp">${maxHp}/${maxHp}</span>
                </div>
                <div class="health-tracker-controls">
                    <div class="input-group input-group-sm">
                        <input type="number" class="form-control" placeholder="Amount" min="0" max="999">
                        <button class="btn btn-outline-danger damage-btn" data-creature="${i}" data-max-hp="${maxHp}">
                            Damage
                        </button>
                        <button class="btn btn-outline-success heal-btn" data-creature="${i}" data-max-hp="${maxHp}">
                            Heal
                        </button>
                    </div>
                </div>
                <div class="health-tracker-bar">
                    <div class="health-tracker-fill" style="width: 100%;"></div>
                </div>
            `;
            
            elements.healthTrackers.appendChild(tracker);
        }
        
        // Add event listeners to the damage and heal buttons
        const damageButtons = elements.healthTrackers.querySelectorAll('.damage-btn');
        const healButtons = elements.healthTrackers.querySelectorAll('.heal-btn');
        
        damageButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const trackerElement = event.target.closest('.health-tracker');
                const input = trackerElement.querySelector('input');
                const amount = parseInt(input.value) || 0;
                const maxHp = parseInt(event.target.dataset.maxHp);
                const hpElement = trackerElement.querySelector('.health-tracker-hp');
                const fillElement = trackerElement.querySelector('.health-tracker-fill');
                
                // Get current HP
                const currentHpText = hpElement.textContent;
                const currentHpMatch = currentHpText.match(/(\d+)\/(\d+)/);
                let currentHp = currentHpMatch ? parseInt(currentHpMatch[1]) : maxHp;
                
                // Apply damage
                currentHp = Math.max(0, currentHp - amount);
                
                // Update HP display
                hpElement.textContent = `${currentHp}/${maxHp}`;
                
                // Update health bar
                const percentage = (currentHp / maxHp) * 100;
                fillElement.style.width = `${percentage}%`;
                
                // Change color based on health percentage
                if (percentage <= 25) {
                    fillElement.style.backgroundColor = '#dc3545';
                } else if (percentage <= 50) {
                    fillElement.style.backgroundColor = '#ffc107';
                } else {
                    fillElement.style.backgroundColor = '#198754';
                }
                
                // Clear input
                input.value = '';
            });
        });
        
        healButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const trackerElement = event.target.closest('.health-tracker');
                const input = trackerElement.querySelector('input');
                const amount = parseInt(input.value) || 0;
                const maxHp = parseInt(event.target.dataset.maxHp);
                const hpElement = trackerElement.querySelector('.health-tracker-hp');
                const fillElement = trackerElement.querySelector('.health-tracker-fill');
                
                // Get current HP
                const currentHpText = hpElement.textContent;
                const currentHpMatch = currentHpText.match(/(\d+)\/(\d+)/);
                let currentHp = currentHpMatch ? parseInt(currentHpMatch[1]) : maxHp;
                
                // Apply healing
                currentHp = Math.min(maxHp, currentHp + amount);
                
                // Update HP display
                hpElement.textContent = `${currentHp}/${maxHp}`;
                
                // Update health bar
                const percentage = (currentHp / maxHp) * 100;
                fillElement.style.width = `${percentage}%`;
                
                // Change color based on health percentage
                if (percentage <= 25) {
                    fillElement.style.backgroundColor = '#dc3545';
                } else if (percentage <= 50) {
                    fillElement.style.backgroundColor = '#ffc107';
                } else {
                    fillElement.style.backgroundColor = '#198754';
                }
                
                // Clear input
                input.value = '';
            });
        });
    }
    
    /**
     * Renders attack options for conjured creatures
     * @param {Object} beast - Beast object that was conjured
     * @param {number} numCreatures - Number of creatures conjured
     */
    function renderAttackOptions(beast, numCreatures) {
        // Filter out actions that have attack bonuses
        const attackActions = beast.actions.filter(action => 
            action.attackBonus && action.damageAvg
        );
        
        if (attackActions.length === 0) {
            elements.attackOptions.innerHTML = `
                <div class="alert alert-warning">
                    <p>No attack actions found for this beast.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="mb-3">
                <label for="numAttackers" class="form-label">Number of Attackers</label>
                <input type="number" class="form-control" id="numAttackers" min="1" max="${numCreatures}" value="${numCreatures}">
            </div>
            
            <div class="mb-3">
                <label for="attackSelect" class="form-label">Attack</label>
                <select class="form-control" id="attackSelect">
        `;
        
        // Add attack options
        attackActions.forEach((action, index) => {
            html += `<option value="${index}">${action.name} (+${action.attackBonus} to hit, ${action.damageAvg} ${action.damageType} damage)</option>`;
        });
        
        html += `
                </select>
            </div>
            
            <div class="mb-3">
                <label for="attackType" class="form-label">Attack Type</label>
                <select class="form-control" id="attackType">
                    <option value="normal">Normal</option>
                    <option value="advantage">Advantage</option>
                    <option value="disadvantage">Disadvantage</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label for="targetAC" class="form-label">Target AC</label>
                <input type="number" class="form-control" id="targetAC" min="1" max="30" value="15">
            </div>
            
            <button class="btn btn-success" id="rollAttackBtn">Roll Attacks</button>
        `;
        
        elements.attackOptions.innerHTML = html;
        
        // Add event listener to roll attack button
        const rollAttackBtn = document.getElementById('rollAttackBtn');
        if (rollAttackBtn) {
            rollAttackBtn.addEventListener('click', () => {
                // Get attack parameters
                const numAttackers = parseInt(document.getElementById('numAttackers').value) || 1;
                const attackIndex = parseInt(document.getElementById('attackSelect').value) || 0;
                const attackType = document.getElementById('attackType').value;
                const targetAC = parseInt(document.getElementById('targetAC').value) || 15;
                
                // Get the selected attack
                const attack = attackActions[attackIndex];
                
                // Roll the attacks
                rollAttacks(attack, numAttackers, attackType, targetAC);
            });
        }
    }
    
    /**
     * Simulates attack rolls for conjured creatures
     * @param {Object} attack - Attack action object
     * @param {number} numAttackers - Number of creatures attacking
     * @param {string} attackType - Type of attack (normal, advantage, disadvantage)
     * @param {number} targetAC - Target's armor class
     */
    function rollAttacks(attack, numAttackers, attackType, targetAC) {
        // Initialize results
        const rolls = [];
        let hits = 0;
        let misses = 0;
        let criticalHits = 0;
        let totalDamage = 0;
        
        // Roll for each attacker
        for (let i = 0; i < numAttackers; i++) {
            // Roll d20 for attack
            let roll1 = Math.floor(Math.random() * 20) + 1;
            let roll2 = Math.floor(Math.random() * 20) + 1;
            let finalRoll;
            
            // Handle advantage/disadvantage
            if (attackType === 'advantage') {
                finalRoll = Math.max(roll1, roll2);
            } else if (attackType === 'disadvantage') {
                finalRoll = Math.min(roll1, roll2);
            } else {
                finalRoll = roll1;
            }
            
            // Add attack bonus
            const attackRoll = finalRoll + parseInt(attack.attackBonus);
            
            // Determine if hit
            const isCritical = finalRoll === 20;
            const isHit = isCritical || attackRoll >= targetAC;
            
            // Add to results
            rolls.push({
                attacker: i + 1,
                roll: finalRoll,
                bonus: parseInt(attack.attackBonus),
                total: attackRoll,
                hit: isHit,
                critical: isCritical
            });
            
            if (isHit) {
                hits++;
                if (isCritical) {
                    criticalHits++;
                    totalDamage += parseInt(attack.damageAvg) * 2;
                } else {
                    totalDamage += parseInt(attack.damageAvg);
                }
            } else {
                misses++;
            }
        }
        
        // Display results
        renderAttackResults(attack, rolls, hits, misses, criticalHits, totalDamage);
    }
    
    /**
     * Renders attack results in the combat results section
     * @param {Object} attack - Attack action object
     * @param {Array} rolls - Array of roll result objects
     * @param {number} hits - Number of successful hits
     * @param {number} misses - Number of misses
     * @param {number} criticalHits - Number of critical hits
     * @param {number} totalDamage - Total damage dealt
     */
    function renderAttackResults(attack, rolls, hits, misses, criticalHits, totalDamage) {
        let html = `
            <div class="alert alert-info">
                <h5>Attack Results: ${attack.name}</h5>
                <p><strong>Summary:</strong> ${hits} hits (${criticalHits} critical), ${misses} misses</p>
                <p><strong>Total Damage:</strong> ${totalDamage} ${attack.damageType}</p>
            </div>
            
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Attacker</th>
                            <th>Roll</th>
                            <th>Bonus</th>
                            <th>Total</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        rolls.forEach(roll => {
            let resultClass = roll.hit ? (roll.critical ? 'table-success' : 'table-info') : 'table-danger';
            let resultText = roll.hit ? (roll.critical ? 'Critical hit!' : 'Hit') : 'Miss';
            
            html += `
                <tr class="${resultClass}">
                    <td>#${roll.attacker}</td>
                    <td>${roll.roll}</td>
                    <td>+${roll.bonus}</td>
                    <td>${roll.total}</td>
                    <td>${resultText}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        elements.combatResults.innerHTML = html;
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
        DataManager.getFilteredBeasts(currentFilters)
            .then(beasts => {
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
        elements.beastSearch.value = '';
        applyFilters();
    }
    
    // Public API
    return {
        renderBeastList,
        selectBeast,
        renderStatblock,
        renderWildshapeStatblock,
        renderConjuredBeast,
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
            currentSort = sort;
        },
        getSort: () => currentSort
    };
})();