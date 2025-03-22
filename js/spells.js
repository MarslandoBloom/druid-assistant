/**
 * spells.js - Spells management module for the Druid's Assistant
 * Handles spell list display, filtering, slot management, and preparation tracking
 */

const SpellManager = (function() {
    // State variables
    let currentSpell = null;
    let currentFilters = {
        name: '',
        level: 'all',
        school: 'all',
        prepared: false,
        druidsOnly: true
    };
    let currentSort = {
        field: 'name',
        direction: 'asc'
    };
    
    /**
     * Initialize the spells tab
     */
    function init() {
        console.log('Initializing spells tab...');
        
        // Event listeners for filter and collapsible sections
        setupFilterCollapsibles();
        
        // Setup event listeners will be implemented in Module 3
    }
    
    /**
     * Set up the collapsible behavior for filter sections
     */
    function setupFilterCollapsibles() {
        document.querySelectorAll('.collapsible').forEach(header => {
            header.addEventListener('click', function() {
                this.classList.toggle('collapsed');
                const contentId = this.dataset.filter + '-filter-content';
                const content = document.getElementById(contentId);
                
                if (content) {
                    content.classList.toggle('collapsed');
                }
            });
        });
    }
    
    // Public API
    return {
        init
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // SpellManager will be initialized from app.js in Module 4
});
