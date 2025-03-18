/**
 * conjure-animals.js - Module for Conjure Animals functionality
 * Handles summoned creature management, attack rolls, and battlefield visualization
 */

const ConjureAnimalsManager = (function() {
    // Store summoned creatures and enemies
    let summonedCreatures = [];
    let enemyTokens = [];
    
    // Battlefield selection variables
    let isSelecting = false;
    let selectionStartX = 0;
    let selectionStartY = 0;
    let selectionBox = null;
    
    /**
     * Initializes the conjure animals tab
     */
    function init() {
        // Set up event handlers for the tab
        setupEventHandlers();
    }
    
    /**
     * Sets up event handlers for the conjure animals tab
     */
    function setupEventHandlers() {
        // Reset button
        const resetButton = document.getElementById('resetConjure');
        if (resetButton) {
            resetButton.addEventListener('click', resetConjure);
        }
        
        // Toggle battlefield button
        const toggleButton = document.getElementById('toggleBattlefield');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleBattlefield);
        }
        
        // Battlefield mouse events for selection box
        const battlefield = document.querySelector('.battlefield-container');
        if (battlefield) {
            battlefield.addEventListener('mousedown', handleBattlefieldMouseDown);
            battlefield.addEventListener('mousemove', handleBattlefieldMouseMove);
            battlefield.addEventListener('mouseup', handleBattlefieldMouseUp);
        }
        
        // Add enemy and clear enemies buttons - use dedicated event listeners to avoid multiple triggers
        const addEnemyBtn = document.getElementById('add-enemy-btn');
        if (addEnemyBtn) {
            // Remove any existing listeners to prevent duplicates
            const newAddEnemyBtn = addEnemyBtn.cloneNode(true);
            addEnemyBtn.parentNode.replaceChild(newAddEnemyBtn, addEnemyBtn);
            
            // Add new listener with event prevention
            newAddEnemyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                addEnemyToken();
            });
        }
        
        const clearEnemiesBtn = document.getElementById('clear-enemies-btn');
        if (clearEnemiesBtn) {
            // Remove any existing listeners to prevent duplicates
            const newClearEnemiesBtn = clearEnemiesBtn.cloneNode(true);
            clearEnemiesBtn.parentNode.replaceChild(newClearEnemiesBtn, clearEnemiesBtn);
            
            // Add new listener with event prevention
            newClearEnemiesBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                clearEnemyTokens();
            });
        }
    }
    
    /**
     * Toggles the battlefield visibility
     */
    function toggleBattlefield() {
        const battlefield = document.getElementById('battlefield');
        if (battlefield) {
            if (battlefield.style.display === 'none') {
                battlefield.style.display = 'block';
            } else {
                battlefield.style.display = 'none';
            }
        }
    }
    
    /**
     * Resets the conjure animals tab
     */
    function resetConjure() {
        // Clear summoned creatures and enemies
        summonedCreatures = [];
        enemyTokens = [];
        
        // Reset UI
        document.getElementById('conjuredBeastInfo').innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">No beast summoned</p>
            </div>
        `;
        document.getElementById('summonedCreaturesContainer').innerHTML = '';
        
        // Clear battlefield
        const battlefield = document.querySelector('.battlefield-container');
        if (battlefield) {
            // Preserve selection box
            const selectionBoxElement = document.getElementById('selectionBox');
            battlefield.innerHTML = '';
            if (selectionBoxElement) {
                battlefield.appendChild(selectionBoxElement);
            }
        }
    }
    
    /**
     * Calculates the number of creatures to summon based on CR
     * @param {string} cr - Challenge rating
     * @returns {number} Number of creatures to summon
     */
    function getNumCreatures(cr) {
        const crValue = parseCR(cr);
        
        if (crValue <= 0.25) return 8;  // CR 1/4 or lower = 8 creatures
        if (crValue <= 0.5) return 4;   // CR 1/2 = 4 creatures  
        if (crValue <= 1) return 2;     // CR 1 = 2 creatures
        return 1;                       // CR 2+ = 1 creature
    }
    
    /**
     * Parses CR string to numeric value
     * @param {string} cr - Challenge rating string (e.g., "1/4", "2")
     * @returns {number} Numeric CR value
     */
    function parseCR(cr) {
        if (cr === '0') return 0;
        if (cr === '1/8') return 0.125;
        if (cr === '1/4') return 0.25;
        if (cr === '1/2') return 0.5;
        return parseFloat(cr);
    }
    
    /**
     * Summons creatures based on the selected beast
     * @param {Object} beast - Beast to summon
     */
    function summonCreatures(beast) {
        if (!beast) return;
        
        // Determine number of creatures to summon
        const numCreatures = getNumCreatures(beast.cr);
        
        // Clear previous summoned creatures
        summonedCreatures = [];
        
        // Calculate max HP for each creature
        let maxHp = 10; // Default
        const hpMatch = beast.hp.match(/(\d+)/);
        if (hpMatch) {
            maxHp = parseInt(hpMatch[1]);
        }
        
        // Parse attack actions
        const attackActions = parseAttackActions(beast);
        
        // Create creature objects
        for (let i = 0; i < numCreatures; i++) {
            const creatureId = `creature-${Date.now()}-${i}`;
            summonedCreatures.push({
                id: creatureId,
                index: i,
                name: beast.name,
                maxHp: maxHp,
                currentHp: maxHp,
                attackActions: attackActions,
                actions: beast.actions || [],
                traits: beast.traits || [],
                selected: false,
                position: {
                    x: 50 + (i % 4) * 60,
                    y: 50 + Math.floor(i / 4) * 60
                }
            });
        }
        
        // Update UI
        updateUI(beast);
    }
    
    /**
     * Updates all UI components for conjured animals
     * @param {Object} beast - Original beast that was summoned
     */
    function updateUI(beast) {
        const numCreatures = summonedCreatures.length;
        
        // Update info panel
        document.getElementById('conjuredBeastInfo').innerHTML = `
            <div class="alert alert-success">
                <h5>Summoned: ${numCreatures}× ${beast.name}</h5>
                <p><strong>CR:</strong> ${beast.cr} | <strong>HP:</strong> ${beast.hp.split(' ')[0]} each</p>
            </div>
        `;
        
        // Render creature cards
        renderCreatureCards();
        
        // Render battlefield
        renderBattlefield();
    }
    
    /**
     * Parses attack actions from a beast
     * @param {Object} beast - Beast to parse actions from
     * @returns {Array} Array of attack action objects
     */
    function parseAttackActions(beast) {
        const attackActions = [];
        
        // Look through actions for attacks
        if (beast.actions) {
            beast.actions.forEach(action => {
                // Check if this is an attack action (contains "to hit" in description)
                if (action.desc && action.desc.includes('to hit')) {
                    // Extract attack bonus
                    let attackBonus = 0;
                    const bonusMatch = action.desc.match(/\+(\d+) to hit/);
                    if (bonusMatch) {
                        attackBonus = parseInt(bonusMatch[1]);
                    }
                    
                    // Extract damage info
                    let damageExpr = '';
                    let damageType = '';
                    const damageMatch = action.desc.match(/Hit: (\d+) \(([^\)]+)\) ([a-z]+) damage/);
                    if (damageMatch) {
                        damageExpr = damageMatch[2];
                        damageType = damageMatch[3];
                    }
                    
                    // Add to attack actions
                    attackActions.push({
                        name: action.name,
                        desc: action.desc,
                        attackBonus: attackBonus,
                        damageExpr: damageExpr,
                        damageType: damageType
                    });
                }
            });
        }
        
        return attackActions;
    }
    
    /**
     * Renders creature cards for all summoned creatures
     */
    function renderCreatureCards() {
        const container = document.getElementById('summonedCreaturesContainer');
        container.innerHTML = '';
        
        summonedCreatures.forEach((creature, index) => {
            const card = createCreatureCard(creature, index);
            container.appendChild(card);
        });
    }
    
    /**
     * Creates a creature card with integrated health tracking and attack options
     * @param {Object} creature - Creature to create card for
     * @param {number} index - Index of the creature
     * @returns {HTMLElement} The creature card element
     */
    function createCreatureCard(creature, index) {
        const healthPercent = (creature.currentHp / creature.maxHp) * 100;
        let healthColor = '#198754'; // Green
        
        if (healthPercent <= 25) {
            healthColor = '#dc3545'; // Red
        } else if (healthPercent <= 50) {
            healthColor = '#ffc107'; // Yellow
        }
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'creature-card';
        cardDiv.dataset.creatureId = creature.id;
        cardDiv.dataset.index = index;
        
        // Determine if this creature has multiple attack options
        const hasMultipleAttacks = creature.attackActions.length > 1;
        
        let attackOptionsHtml = '';
        if (creature.attackActions.length > 0) {
            attackOptionsHtml = `
                <div class="attack-controls">
                    <div class="mb-2">
                        <label class="form-label">Attack Type</label>
                        <select class="form-select form-select-sm attack-select">
                            ${creature.attackActions.map((action, i) => 
                                `<option value="${i}">${action.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Roll Type</label>
                        <div class="btn-group btn-group-sm" role="group">
                            <input type="radio" class="btn-check" name="roll-type-${index}" id="roll-normal-${index}" value="normal" checked>
                            <label class="btn btn-outline-success" for="roll-normal-${index}">Normal</label>
                            
                            <input type="radio" class="btn-check" name="roll-type-${index}" id="roll-advantage-${index}" value="advantage">
                            <label class="btn btn-outline-success" for="roll-advantage-${index}">Advantage</label>
                            
                            <input type="radio" class="btn-check" name="roll-type-${index}" id="roll-disadvantage-${index}" value="disadvantage">
                            <label class="btn btn-outline-success" for="roll-disadvantage-${index}">Disadvantage</label>
                        </div>
                    </div>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-success roll-single-attack-btn">Roll Attack</button>
                        ${hasMultipleAttacks ? 
                            `<button class="btn btn-sm btn-primary roll-all-attacks-btn">Roll All Attacks</button>` : 
                            ''}
                        <button class="btn btn-sm btn-danger roll-damage-btn">Roll Damage</button>
                    </div>
                    <div class="attack-results mt-2" style="display: none;">
                        <!-- Attack results will be displayed here -->
                    </div>
                </div>
            `;
        } else {
            attackOptionsHtml = `
                <div class="alert alert-warning mt-3">
                    <p class="mb-0">No attack actions available for this creature.</p>
                </div>
            `;
        }
        
        cardDiv.innerHTML = `
            <div class="creature-card-header">
                <span>${creature.name} #${index + 1}</span>
                <div class="form-check form-switch">
                    <input class="form-check-input creature-select" type="checkbox" 
                        id="creature-select-${index}" ${creature.selected ? 'checked' : ''}>
                </div>
            </div>
            <div class="creature-card-body">
                <!-- Health Tracker -->
                <div class="health-tracker">
                    <div class="health-tracker-header">
                        <span class="health-tracker-name">HP:</span>
                        <span class="health-tracker-hp">${creature.currentHp}/${creature.maxHp}</span>
                    </div>
                    <div class="health-tracker-controls mb-2">
                        <div class="input-group input-group-sm">
                            <input type="number" class="form-control health-modifier" placeholder="Amount" min="1" max="999" value="1">
                            <button class="btn btn-outline-danger damage-btn">
                                −
                            </button>
                            <button class="btn btn-outline-success heal-btn">
                                +
                            </button>
                        </div>
                    </div>
                    <div class="health-tracker-bar">
                        <div class="health-tracker-fill" style="width: ${healthPercent}%; background-color: ${healthColor};"></div>
                    </div>
                </div>
                
                <!-- Attack Options and Results -->
                ${attackOptionsHtml}
            </div>
        `;
        
        // Add event listeners
        addCreatureCardEventListeners(cardDiv, creature, index);
        
        return cardDiv;
    }
    
    /**
     * Adds event listeners to a creature card
     * @param {HTMLElement} cardDiv - The creature card element
     * @param {Object} creature - The creature object
     * @param {number} index - Index of the creature
     */
    function addCreatureCardEventListeners(cardDiv, creature, index) {
        // Select/deselect creature
        const selectCheckbox = cardDiv.querySelector('.creature-select');
        if (selectCheckbox) {
            selectCheckbox.addEventListener('change', () => {
                summonedCreatures[index].selected = selectCheckbox.checked;
                renderBattlefield();
            });
        }
        
        // Damage button
        const damageBtn = cardDiv.querySelector('.damage-btn');
        if (damageBtn) {
            damageBtn.addEventListener('click', () => {
                const input = cardDiv.querySelector('.health-modifier');
                const amount = parseInt(input.value) || 0;
                
                if (amount > 0) {
                    applyDamage(index, amount);
                }
            });
        }
        
        // Heal button
        const healBtn = cardDiv.querySelector('.heal-btn');
        if (healBtn) {
            healBtn.addEventListener('click', () => {
                const input = cardDiv.querySelector('.health-modifier');
                const amount = parseInt(input.value) || 0;
                
                if (amount > 0) {
                    applyHealing(index, amount);
                }
            });
        }
        
        // Roll single attack button
        const rollSingleBtn = cardDiv.querySelector('.roll-single-attack-btn');
        if (rollSingleBtn) {
            rollSingleBtn.addEventListener('click', () => {
                const attackSelect = cardDiv.querySelector('.attack-select');
                const attackIndex = parseInt(attackSelect.value);
                const rollType = cardDiv.querySelector('input[name^="roll-type"]:checked').value;
                
                const attack = creature.attackActions[attackIndex];
                const result = rollAttack(attack, creature, rollType);
                
                displayAttackResult(cardDiv.querySelector('.attack-results'), result);
            });
        }
        
        // Roll all attacks button
        const rollAllBtn = cardDiv.querySelector('.roll-all-attacks-btn');
        if (rollAllBtn) {
            rollAllBtn.addEventListener('click', () => {
                const rollType = cardDiv.querySelector('input[name^="roll-type"]:checked').value;
                const results = [];
                
                // Loop through all attack actions and generate results for each
                creature.attackActions.forEach(attack => {
                    const result = rollAttack(attack, creature, rollType);
                    results.push(result);
                });
                
                // Display all results
                displayAttackResults(cardDiv.querySelector('.attack-results'), results);
            });
        }
        
        // Roll damage button
        const rollDamageBtn = cardDiv.querySelector('.roll-damage-btn');
        if (rollDamageBtn) {
            rollDamageBtn.addEventListener('click', () => {
                const attackSelect = cardDiv.querySelector('.attack-select');
                const attackIndex = parseInt(attackSelect.value);
                const attack = creature.attackActions[attackIndex];
                
                // Roll damage for the selected attack
                const damageResults = rollDamage(attack, creature, true);
                
                // Display damage results
                displayDamageResults(cardDiv.querySelector('.attack-results'), [damageResults]);
            });
        }
    }
    
    /**
     * Applies damage to a creature
     * @param {number} index - Index of creature in the summonedCreatures array
     * @param {number} amount - Amount of damage to apply
     */
    function applyDamage(index, amount) {
        if (index < 0 || index >= summonedCreatures.length) return;
        
        // Apply damage
        summonedCreatures[index].currentHp = Math.max(0, summonedCreatures[index].currentHp - amount);
        
        // Check if creature is dead
        if (summonedCreatures[index].currentHp === 0) {
            removeCreature(index);
        } else {
            // Update UI
            updateCreatureHealth(index);
            renderBattlefield();
        }
    }
    
    /**
     * Applies healing to a creature
     * @param {number} index - Index of creature in the summonedCreatures array
     * @param {number} amount - Amount of healing to apply
     */
    function applyHealing(index, amount) {
        if (index < 0 || index >= summonedCreatures.length) return;
        
        // Apply healing
        summonedCreatures[index].currentHp = Math.min(
            summonedCreatures[index].maxHp,
            summonedCreatures[index].currentHp + amount
        );
        
        // Update UI
        updateCreatureHealth(index);
        renderBattlefield();
    }
    
    /**
     * Updates the health display for a specific creature
     * @param {number} index - Index of the creature
     */
    function updateCreatureHealth(index) {
        if (index < 0 || index >= summonedCreatures.length) return;
        
        const creature = summonedCreatures[index];
        const card = document.querySelector(`.creature-card[data-index="${index}"]`);
        if (!card) return;
        
        const healthPercent = (creature.currentHp / creature.maxHp) * 100;
        let healthColor = '#198754'; // Green
        
        if (healthPercent <= 25) {
            healthColor = '#dc3545'; // Red
        } else if (healthPercent <= 50) {
            healthColor = '#ffc107'; // Yellow
        }
        
        // Update HP text
        const hpText = card.querySelector('.health-tracker-hp');
        if (hpText) {
            hpText.textContent = `${creature.currentHp}/${creature.maxHp}`;
        }
        
        // Update progress bar
        const healthFill = card.querySelector('.health-tracker-fill');
        if (healthFill) {
            healthFill.style.width = `${healthPercent}%`;
            healthFill.style.backgroundColor = healthColor;
        }
    }
    
    /**
     * Removes a dead creature from the battle
     * @param {number} index - Index of creature to remove
     */
    function removeCreature(index) {
        if (index < 0 || index >= summonedCreatures.length) return;
        
        // Remove the creature
        summonedCreatures.splice(index, 1);
        
        // Update UI by re-rendering everything
        // This is simpler than trying to update indices of all elements
        renderCreatureCards();
        renderBattlefield();
    }
    
    /**
     * Rolls an attack for a creature
     * @param {Object} attack - The attack to roll
     * @param {Object} creature - The creature making the attack
     * @param {string} rollType - Type of roll (normal, advantage, disadvantage)
     * @returns {Object} Attack result object
     */
    function rollAttack(attack, creature, rollType) {
        // Roll d20(s) based on roll type
        let roll1 = Math.floor(Math.random() * 20) + 1;
        let roll2 = null;
        let finalRoll;
        
        if (rollType === 'advantage' || rollType === 'disadvantage') {
            roll2 = Math.floor(Math.random() * 20) + 1;
            
            if (rollType === 'advantage') {
                finalRoll = Math.max(roll1, roll2);
            } else {
                finalRoll = Math.min(roll1, roll2);
            }
        } else {
            finalRoll = roll1;
        }
        
        // Check if critical hit or fumble
        const isCritical = finalRoll === 20;
        const isFumble = finalRoll === 1;
        
        // Calculate total
        const total = finalRoll + attack.attackBonus;
        
        // Calculate damage
        const damage = calculateDamage(attack, isCritical);
        
        return {
            creatureId: creature.id,
            creatureName: creature.name,
            attack: attack.name,
            rollType: rollType,
            roll1: roll1,
            roll2: roll2,
            finalRoll: finalRoll,
            attackBonus: attack.attackBonus,
            total: total,
            isCritical: isCritical,
            isFumble: isFumble,
            damage: damage
        };
    }
    
    /**
     * Calculates damage for an attack
     * @param {Object} attack - The attack to calculate damage for
     * @param {boolean} isCritical - Whether the attack is a critical hit
     * @returns {Object} Damage result object
     */
    function calculateDamage(attack, isCritical) {
        if (!attack.damageExpr) return null;
        
        // Parse the damage expression (e.g., "2d6+3")
        const damageParts = parseDamageExpression(attack.damageExpr);
        const critMultiplier = isCritical ? 2 : 1;
        
        // Roll damage dice
        let diceTotal = 0;
        let rolls = [];
        
        for (let i = 0; i < damageParts.diceCount * critMultiplier; i++) {
            const roll = Math.floor(Math.random() * damageParts.diceFaces) + 1;
            rolls.push(roll);
            diceTotal += roll;
        }
        
        // Add the modifier (only once, even on crits)
        const damageTotal = diceTotal + damageParts.modifier;
        
        return {
            attackName: attack.name,
            rolls: rolls,
            modifier: damageParts.modifier,
            total: damageTotal,
            type: attack.damageType,
            isCritical: isCritical
        };
    }
    
    /**
     * Rolls damage for an attack (direct access method)
     * @param {Object} attack - The attack to roll damage for
     * @param {Object} creature - The creature making the attack
     * @param {boolean} forceCrit - Whether to force a critical hit
     * @returns {Object} Damage result object
     */
    function rollDamage(attack, creature, forceCrit = false) {
        return calculateDamage(attack, forceCrit);
    }
    
    /**
     * Parses a damage expression into its components
     * @param {string} expr - Damage expression (e.g., "2d6+3")
     * @returns {Object} Object with dice count, faces, and modifier
     */
    function parseDamageExpression(expr) {
        const result = {
            diceCount: 1,
            diceFaces: 6,
            modifier: 0
        };
        
        // Match pattern like "2d6+3" or "1d10" or "3d8-1"
        const diceMatch = expr.match(/(\d+)d(\d+)(?:([-+])(\d+))?/);
        
        if (diceMatch) {
            result.diceCount = parseInt(diceMatch[1]);
            result.diceFaces = parseInt(diceMatch[2]);
            
            // Handle modifier
            if (diceMatch[3] && diceMatch[4]) {
                const modValue = parseInt(diceMatch[4]);
                result.modifier = diceMatch[3] === '+' ? modValue : -modValue;
            }
        }
        
        return result;
    }
    
    /**
     * Displays a single attack result
     * @param {HTMLElement} container - Container to display the result in
     * @param {Object} result - Attack result object
     */
    function displayAttackResult(container, result) {
        container.style.display = 'block';
        container.innerHTML = '';
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'attack-result';
        
        // Generate roll display (showing both dice for advantage/disadvantage)
        let rollDisplay = '';
        if (result.roll2 !== null) {
            const roll1Class = result.rollType === 'advantage' ? 
                (result.roll1 >= result.roll2 ? 'text-success fw-bold' : 'text-muted') :
                (result.roll1 <= result.roll2 ? 'text-success fw-bold' : 'text-muted');
                
            const roll2Class = result.rollType === 'advantage' ? 
                (result.roll2 >= result.roll1 ? 'text-success fw-bold' : 'text-muted') :
                (result.roll2 <= result.roll1 ? 'text-success fw-bold' : 'text-muted');
                
            rollDisplay = `
                <div><strong>Rolls:</strong> 
                    <span class="${roll1Class}">${result.roll1}</span> / 
                    <span class="${roll2Class}">${result.roll2}</span> 
                    ${result.rollType === 'advantage' ? '(advantage)' : '(disadvantage)'}
                </div>
            `;
        } else {
            rollDisplay = `<div><strong>Roll:</strong> ${result.finalRoll}</div>`;
        }
        
        resultDiv.innerHTML = `
            <h6 class="${result.isCritical ? 'text-success' : (result.isFumble ? 'text-danger' : '')}">
                ${result.attack} 
                ${result.isCritical ? '(Critical Hit!)' : (result.isFumble ? '(Fumble!)' : '')}
            </h6>
            ${rollDisplay}
            <div><strong>Attack bonus:</strong> +${result.attackBonus}</div>
            <div><strong>Total:</strong> ${result.total}</div>
        `;
        
        // Add damage details if available
        if (result.damage) {
            const damageDiv = document.createElement('div');
            damageDiv.className = 'mt-2 p-2 bg-light rounded';
            
            const diceStr = result.damage.rolls.join(', ');
            const bonusStr = result.damage.modifier > 0 ? 
                ` + ${result.damage.modifier}` : 
                (result.damage.modifier < 0 ? ` - ${Math.abs(result.damage.modifier)}` : '');
            
            damageDiv.innerHTML = `
                <h6 class="${result.damage.isCritical ? 'text-success' : ''}">Damage</h6>
                <div><strong>Dice:</strong> ${diceStr}</div>
                <div><strong>Modifier:</strong> ${bonusStr}</div>
                <div><strong>Total:</strong> ${result.damage.total} ${result.damage.type}</div>
            `;
            
            resultDiv.appendChild(damageDiv);
        }
        
        container.appendChild(resultDiv);
    }
    
    /**
     * Displays multiple attack results
     * @param {HTMLElement} container - Container to display the results in
     * @param {Array} results - Array of attack result objects
     */
    function displayAttackResults(container, results) {
        container.style.display = 'block';
        container.innerHTML = '';
        
        results.forEach(result => {
            displayAttackResult(container, result);
        });
    }
    
    /**
     * Displays damage results
     * @param {HTMLElement} container - Container to display the results in
     * @param {Array} damageResults - Array of damage result objects
     */
    function displayDamageResults(container, damageResults) {
        container.style.display = 'block';
        container.innerHTML = '';
        
        damageResults.forEach(result => {
            if (!result) return;
            
            const damageDiv = document.createElement('div');
            damageDiv.className = 'mt-2 p-2 bg-light rounded';
            
            const rolls = result.rolls || [];
            const diceStr = rolls.join(', ');
            const bonusStr = result.modifier > 0 ? 
                ` + ${result.modifier}` : 
                (result.modifier < 0 ? ` - ${Math.abs(result.modifier)}` : '');
            
            damageDiv.innerHTML = `
                <h6 class="${result.isCritical ? 'text-success' : ''}">Damage: ${result.attackName}</h6>
                <div><strong>Dice:</strong> ${diceStr}</div>
                <div><strong>Modifier:</strong> ${bonusStr}</div>
                <div><strong>Total:</strong> ${result.total} ${result.type}</div>
            `;
            
            container.appendChild(damageDiv);
        });
    }
    
    /**
     * Renders the battlefield visualization
     */
    function renderBattlefield() {
        const container = document.querySelector('.battlefield-container');
        if (!container) return;
        
        // Preserve the selection box element
        const selectionBox = document.getElementById('selectionBox');
        
        // Clear other elements
        Array.from(container.children).forEach(child => {
            if (child.id !== 'selectionBox') {
                container.removeChild(child);
            }
        });
        
        // Add creature tokens
        summonedCreatures.forEach(creature => {
            const token = document.createElement('div');
            token.className = `token token-friendly${creature.selected ? ' token-selected' : ''}`;
            token.textContent = creature.name.charAt(0);
            token.style.left = `${creature.position.x}px`;
            token.style.top = `${creature.position.y}px`;
            token.dataset.creatureId = creature.id;
            token.dataset.hp = `${creature.currentHp}/${creature.maxHp}`;
            
            // Add tooltip
            token.title = `${creature.name} (${creature.currentHp}/${creature.maxHp} HP)`;
            
            // Make token draggable
            makeDraggable(token);
            
            container.appendChild(token);
        });
        
        // Add enemy tokens
        enemyTokens.forEach(enemy => {
            const token = document.createElement('div');
            token.className = `token token-enemy${enemy.selected ? ' token-selected' : ''}`;
            token.textContent = 'E';
            token.style.left = `${enemy.position.x}px`;
            token.style.top = `${enemy.position.y}px`;
            token.dataset.enemyId = enemy.id;
            
            // Make token draggable
            makeDraggable(token);
            
            container.appendChild(token);
        });
    }
    
    /**
     * Makes an element draggable
     * @param {HTMLElement} element - Element to make draggable
     */
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to prevent battlefield click handler
            
            // Handle group selection with shift key
            if (e.shiftKey) {
                // Toggle selection for this element
                const creatureId = element.dataset.creatureId;
                if (creatureId) {
                    const index = summonedCreatures.findIndex(c => c.id === creatureId);
                    if (index !== -1) {
                        summonedCreatures[index].selected = !summonedCreatures[index].selected;
                        renderBattlefield();
                        return; // Don't start dragging, just toggle selection
                    }
                }
                
                const enemyId = element.dataset.enemyId;
                if (enemyId) {
                    const index = enemyTokens.findIndex(e => e.id === enemyId);
                    if (index !== -1) {
                        enemyTokens[index].selected = !enemyTokens[index].selected;
                        renderBattlefield();
                        return; // Don't start dragging, just toggle selection
                    }
                }
            }
            
            // Get cursor position
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Check if this is a selected creature
            const isSelectedCreature = element.classList.contains('token-selected');
            
            // If not selected and not shift key, deselect all others
            if (!isSelectedCreature && !e.shiftKey) {
                // Deselect all creatures except this one
                summonedCreatures.forEach(c => c.selected = false);
                enemyTokens.forEach(e => e.selected = false);
                
                // Select this one if it's a token
                const creatureId = element.dataset.creatureId;
                if (creatureId) {
                    const index = summonedCreatures.findIndex(c => c.id === creatureId);
                    if (index !== -1) {
                        summonedCreatures[index].selected = true;
                    }
                }
                
                const enemyId = element.dataset.enemyId;
                if (enemyId) {
                    const index = enemyTokens.findIndex(e => e.id === enemyId);
                    if (index !== -1) {
                        enemyTokens[index].selected = true;
                    }
                }
                
                renderBattlefield();
            }
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            
            // Calculate movement delta
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Check if this is a selected token or if there are any selected tokens
            const isSelectedToken = element.classList.contains('token-selected');
            const hasSelectedTokens = document.querySelectorAll('.token-selected').length > 0;
            
            if (isSelectedToken) {
                // Move all selected tokens
                document.querySelectorAll('.token-selected').forEach(token => {
                    // Set token's new position
                    const newTop = token.offsetTop - pos2;
                    const newLeft = token.offsetLeft - pos1;
                    token.style.top = `${newTop}px`;
                    token.style.left = `${newLeft}px`;
                    
                    // Update creature position if this is a creature token
                    const creatureId = token.dataset.creatureId;
                    if (creatureId) {
                        const index = summonedCreatures.findIndex(c => c.id === creatureId);
                        if (index !== -1) {
                            summonedCreatures[index].position.x = newLeft;
                            summonedCreatures[index].position.y = newTop;
                        }
                    }
                    
                    // Update enemy position if this is an enemy token
                    const enemyId = token.dataset.enemyId;
                    if (enemyId) {
                        const index = enemyTokens.findIndex(e => e.id === enemyId);
                        if (index !== -1) {
                            enemyTokens[index].position.x = newLeft;
                            enemyTokens[index].position.y = newTop;
                        }
                    }
                });
            } else if (!hasSelectedTokens) {
                // Move just this token if no tokens are selected
                // Set element's new position
                const newTop = element.offsetTop - pos2;
                const newLeft = element.offsetLeft - pos1;
                element.style.top = `${newTop}px`;
                element.style.left = `${newLeft}px`;
                
                // Update creature position if this is a creature token
                const creatureId = element.dataset.creatureId;
                if (creatureId) {
                    const index = summonedCreatures.findIndex(c => c.id === creatureId);
                    if (index !== -1) {
                        summonedCreatures[index].position.x = newLeft;
                        summonedCreatures[index].position.y = newTop;
                    }
                }
                
                // Update enemy position if this is an enemy token
                const enemyId = element.dataset.enemyId;
                if (enemyId) {
                    const index = enemyTokens.findIndex(e => e.id === enemyId);
                    if (index !== -1) {
                        enemyTokens[index].position.x = newLeft;
                        enemyTokens[index].position.y = newTop;
                    }
                }
            }
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    /**
     * Handles mousedown on the battlefield for selection box
     * @param {Event} e - Mouse event
     */
    function handleBattlefieldMouseDown(e) {
        // Only proceed if this is a direct click on the battlefield (not on a token)
        if (e.target !== e.currentTarget && !e.target.classList.contains('selection-box')) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        selectionStartX = e.clientX - rect.left;
        selectionStartY = e.clientY - rect.top;
        
        isSelecting = true;
        
        // Clear selection if not holding shift
        if (!e.shiftKey) {
            summonedCreatures.forEach(c => c.selected = false);
            enemyTokens.forEach(e => e.selected = false);
            renderCreatureCards();
            renderBattlefield();
        }
        
        // Show and position the selection box
        selectionBox = document.getElementById('selectionBox');
        if (selectionBox) {
            selectionBox.style.display = 'block';
            selectionBox.style.left = `${selectionStartX}px`;
            selectionBox.style.top = `${selectionStartY}px`;
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
        }
    }
    
    /**
     * Handles mousemove on the battlefield for selection box
     * @param {Event} e - Mouse event
     */
    function handleBattlefieldMouseMove(e) {
        if (!isSelecting || !selectionBox) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Calculate selection box dimensions
        const width = Math.abs(currentX - selectionStartX);
        const height = Math.abs(currentY - selectionStartY);
        const left = Math.min(currentX, selectionStartX);
        const top = Math.min(currentY, selectionStartY);
        
        // Update selection box
        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
    }
    
    /**
     * Handles mouseup on the battlefield for selection box
     * @param {Event} e - Mouse event
     */
    function handleBattlefieldMouseUp(e) {
        if (!isSelecting || !selectionBox) return;
        
        isSelecting = false;
        
        // Get selection box dimensions
        const selectionRect = selectionBox.getBoundingClientRect();
        const containerRect = e.currentTarget.getBoundingClientRect();
        
        const left = selectionRect.left - containerRect.left;
        const top = selectionRect.top - containerRect.top;
        const right = left + selectionRect.width;
        const bottom = top + selectionRect.height;
        
        // Select tokens within the selection box
        const tokens = document.querySelectorAll('.token');
        tokens.forEach(token => {
            const tokenRect = token.getBoundingClientRect();
            const tokenLeft = tokenRect.left - containerRect.left;
            const tokenTop = tokenRect.top - containerRect.top;
            const tokenRight = tokenLeft + tokenRect.width;
            const tokenBottom = tokenTop + tokenRect.height;
            
            // Check if token is within selection
            if (tokenLeft < right && tokenRight > left && tokenTop < bottom && tokenBottom > top) {
                // Select creature or enemy
                if (token.classList.contains('token-friendly')) {
                    const creatureId = token.dataset.creatureId;
                    const index = summonedCreatures.findIndex(c => c.id === creatureId);
                    if (index !== -1) {
                        summonedCreatures[index].selected = true;
                    }
                } else if (token.classList.contains('token-enemy')) {
                    const enemyId = token.dataset.enemyId;
                    const index = enemyTokens.findIndex(e => e.id === enemyId);
                    if (index !== -1) {
                        enemyTokens[index].selected = true;
                    }
                }
            }
        });
        
        // Hide selection box
        selectionBox.style.display = 'none';
        
        // Update UI
        renderCreatureCards();
        renderBattlefield();
    }
    
    /**
     * Adds an enemy token to the battlefield
     */
    function addEnemyToken() {
        const container = document.querySelector('.battlefield-container');
        if (!container) return;
        
        // Create enemy object
        const enemy = {
            id: `enemy-${Date.now()}-${enemyTokens.length}`,
            selected: false,
            position: {
                x: Math.random() * (container.offsetWidth - 60) + 30,
                y: Math.random() * (container.offsetHeight - 60) + 30
            }
        };
        
        // Add to enemies array
        enemyTokens.push(enemy);
        
        // Render battlefield
        renderBattlefield();
    }
    
    /**
     * Clears all enemy tokens from the battlefield
     */
    function clearEnemyTokens() {
        enemyTokens = [];
        renderBattlefield();
    }
    
    // Public API
    return {
        init,
        summonCreatures,
        getNumCreatures
    };
})();

// Initialize the module when the DOM is ready
document.addEventListener('DOMContentLoaded', ConjureAnimalsManager.init);
