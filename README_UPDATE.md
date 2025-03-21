# Druid's Wildshape and Conjure Animals Assistant - Update

## Changes Made

The following changes have been implemented:

1. **Dice Roller Tab**: Modified the dice roller to remove the "Roll X:" prefix from results to make them more compact and ensure they fit within two columns without requiring scrolling. The two-column layout helps maximize space usage.

2. **Dice Roller Format**: Changed the display format for advantage/disadvantage rolls to use square brackets instead of parentheses, making them more visually distinct.

3. **Dice Styling**: Modified the formatting of dice results:
   - Applied bold formatting only to:
     - The final total of each roll
     - Natural 20s on d20 rolls (colored green)
     - Natural 1s on d20 rolls (colored red)
   - Removed underlining from all results
   - Regular rolls and advantage/disadvantage indicators are no longer bold
   - Only d20 rolls show color coding for natural 1s and 20s

## How to Apply Changes

The changes have been applied to the source code files:

- `css/style.css` - Updated styling for dice results (bold only for specific values, removed underlining)
- `js/dice-roller.js` - Removed "Roll X:" prefix and modified the styling application logic
- `index.html` - Kept the "Manage Data" button in the footer

## Updating the Bundled HTML File

To update the bundled HTML file with these changes, you need to run the bundler script:

1. Open a command prompt
2. Navigate to the project directory: `cd C:\Users\npara\Documents\GitHub\druid-assistant`
3. Run the following command: `node bundle-script.js`

This will generate an updated `druid-assistant-bundle.html` file with all the changes included.

## Testing

After running the bundler, open the `druid-assistant-bundle.html` file in your browser and verify:

1. The dice roller results display in two columns without scrolling
2. Only the final totals of each roll, natural 20s, and natural 1s are bold
3. Results are not underlined
4. Only d20 rolls show green/red coloring for natural 20s/1s
5. The "Manage Data" button remains in the footer
