/**
 * Dice Roller Module
 * Handles dice rolling functionality for the Druid's Assistant
 */

// Initialize dice roller when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDiceRoller();
});

// Initialize dice roller
function initDiceRoller() {
    // Add event listeners to dice buttons
    document.querySelectorAll('.dice-btn').forEach(btn => {
        btn.addEventListener('click', handleDiceRoll);
    });
    
    // Add event listener to reset button
    document.getElementById('reset-dice').addEventListener('click', resetDiceResults);
    
    // Add dice icons
    addDiceIcons();
}

// Add SVG icons to each dice tile
function addDiceIcons() {
    // Simple polygon SVG paths for each dice type
    const diceIcons = {
        'd20': `<svg viewBox="0 0 100 100" width="40" height="40">
                <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`,
        'd12': `<svg viewBox="0 0 100 100" width="40" height="40">
                <polygon points="50,5 85,15 95,50 85,85 50,95 15,85 5,50 15,15" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`,
        'd10': `<svg viewBox="0 0 100 100" width="40" height="40">
                <polygon points="50,5 80,30 80,70 50,95 20,70 20,30" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`,
        'd8': `<svg viewBox="0 0 100 100" width="40" height="40">
                <polygon points="50,5 90,50 50,95 10,50" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`,
        'd6': `<svg viewBox="0 0 100 100" width="40" height="40">
                <rect x="15" y="15" width="70" height="70" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`,
        'd4': `<svg viewBox="0 0 100 100" width="40" height="40">
                <polygon points="50,5 95,95 5,95" fill="none" stroke="#198754" stroke-width="2"/>
                </svg>`
    };
    
    // Add icons to each dice tile
    for (const [diceType, iconSvg] of Object.entries(diceIcons)) {
        document.querySelectorAll(`.dice-tile .dice-title .dice-icon`).forEach(iconDiv => {
            if (iconDiv.closest('.dice-tile').querySelector('.dice-label').textContent === diceType) {
                iconDiv.innerHTML = iconSvg;
            }
        });
    }
}

// Handle dice roll when a button is clicked
function handleDiceRoll(event) {
    const button = event.currentTarget;
    const diceType = button.getAttribute('data-dice');
    const diceCount = parseInt(button.getAttribute('data-count'));
    
    const rollType = document.querySelector('input[name="rollType"]:checked').value;
    const modifier = parseInt(document.getElementById('dice-modifier').value) || 0;
    const shouldSum = document.getElementById('sum-dice').checked;
    
    // Get max value for this dice type
    const diceMax = parseInt(diceType.substring(1));
    
    // Get results container
    const resultsContainer = document.getElementById(`${diceType}-results`);
    
    // Generate and display results
    const results = rollDice(diceType, diceCount, diceMax, rollType, modifier);
    displayDiceResults(resultsContainer, results, rollType, modifier, shouldSum);
}

// Roll dice and return results
function rollDice(diceType, diceCount, diceMax, rollType, modifier) {
    const results = [];
    
    for (let i = 0; i < diceCount; i++) {
        if (rollType === 'advantage' || rollType === 'disadvantage') {
            // Roll twice for advantage/disadvantage
            const roll1 = Math.floor(Math.random() * diceMax) + 1;
            const roll2 = Math.floor(Math.random() * diceMax) + 1;
            
            const chosenRoll = (rollType === 'advantage') 
                ? Math.max(roll1, roll2) 
                : Math.min(roll1, roll2);
            
            results.push({
                roll: chosenRoll,
                rollA: roll1,
                rollB: roll2,
                modifier: modifier,
                total: chosenRoll + modifier
            });
        } else {
            // Normal roll
            const roll = Math.floor(Math.random() * diceMax) + 1;
            results.push({
                roll: roll,
                modifier: modifier,
                total: roll + modifier
            });
        }
    }
    
    return results;
}

// Display dice results in the results container
function displayDiceResults(container, results, rollType, modifier, shouldSum) {
    let html = '';
    let grandTotal = 0;
    
    // Check if this is a d20 roll to highlight critical success/failure
    const isDTwenty = container.id === 'd20-results';
    
    results.forEach((result, index) => {
        grandTotal += result.total;
        
        // Determine class for d20 rolls
        let diceValueClass = '';
        if (isDTwenty) {
            if (result.roll === 20) {
                diceValueClass = 'critical-success';
            } else if (result.roll === 1) {
                diceValueClass = 'critical-failure';
            } else if (rollType !== 'normal') {
                diceValueClass = rollType;
            }
        }
        // Remove rollType class for non-d20 dice
        // No special styling for non-d20 dice
        
        if (rollType === 'advantage' || rollType === 'disadvantage') {
            // Determine classes for the individual rolls in advantage/disadvantage
            let rollAClass = '';
            let rollBClass = '';
            
            // Only apply critical success/failure styling to d20 rolls
            if (isDTwenty) {
                if (result.rollA === 20) rollAClass = 'critical-success';
                else if (result.rollA === 1) rollAClass = 'critical-failure';
                
                if (result.rollB === 20) rollBClass = 'critical-success';
                else if (result.rollB === 1) rollBClass = 'critical-failure';
            }
            // Non-d20 dice get no special styling
            
            html += `<div class="dice-result">
                <span class="dice-value ${diceValueClass}">${result.roll}</span> 
                [<span class="${rollAClass}">${result.rollA}</span>, <span class="${rollBClass}">${result.rollB}</span>] + 
                <span class="dice-modifier">${modifier}</span> = 
                <strong>${result.total}</strong>
            </div>`;
        } else {
            html += `<div class="dice-result">
                <span class="dice-value ${diceValueClass}">${result.roll}</span> + 
                <span class="dice-modifier">${modifier}</span> = 
                <strong>${result.total}</strong>
            </div>`;
        }
    });
    
    if (shouldSum && results.length > 1) {
        html += `<div class="dice-grand-total" style="column-span: all; -webkit-column-span: all;">
            Total: <strong>${grandTotal}</strong>
        </div>`;
    }
    
    container.innerHTML = html;
}

// Reset all dice results
function resetDiceResults() {
    document.querySelectorAll('.dice-results').forEach(container => {
        container.innerHTML = '';
    });
}