# The Druid's Wildshape & Conjure Animals Assistant

A web-based assistant for D&D 5e Druids to manage wildshape transformations and conjure animals spell usage.

![Druid's Assistant](images/druid-assistant-screenshot.png)

## Features

- **Comprehensive Beast Database**: Access details for beasts CR 0-6 from forest, grassland, and hill environments
- **Advanced Filtering**: Filter beasts by CR, size, and name
- **Detailed Statblocks**: View D&D 5e style statblocks with all creature stats and abilities
- **Wildshape Management**: Quick reference for your transformed shape
- **Conjure Animals Helper**: 
  - Automatically calculates the correct number of creatures based on CR
  - Tracks health for each summoned creature
  - Simulates attack rolls with advantage/disadvantage options
  - Calculates hit probability and damage output
  - Independent attack selection for each summoned creature
  - Group attack and damage rolls respect individual attack selections
  - Separate "Release Summons" and "Reset Rolls" functionality
- **Favorites System**: Save your most-used beasts for quick access
- **Data Management**: Import custom beast data from markdown files
- **Offline Capability**: Works without internet connection after initial load
- **Mobile Friendly**: Responsive design works on phones and tablets

## Installation

### Method 1: Direct Access (Recommended)
Simply visit [The Druid's Assistant](https://your-url-here.com) in your web browser.

### Method 2: Local Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/druids-assistant.git
   ```
2. Navigate to the project directory:
   ```
   cd druids-assistant
   ```
3. Open `index.html` in your web browser.

## Usage

### Beast Reference
1. **Browse Beasts**: Scroll through the list or use search/filtering.
2. **View Details**: Click any beast to display its complete statblock.
3. **Mark Favorites**: Click the "Favorite" button to save beasts for quick access.

### Wildshape
1. Select a beast from the Statblock tab.
2. Click "Wildshape" to add it to your Wildshape tab.
3. Reference the statblock during gameplay.
4. Use the "Reset" button to clear your selection.

### Conjure Animals
1. Select a beast from the Statblock tab.
2. Click "Conjure Animals" to summon the appropriate number based on CR.
3. Use health trackers to manage damage to your summoned creatures.
4. Configure attack options for each summoned creature individually.
5. Select specific creatures using the selection system.
6. Use "Group Attack" to roll attacks for all selected creatures at once.
7. Use "Group Damage" to calculate total damage for all successful hits.
8. Use "Reset Rolls" to clear attack and damage displays without removing creatures.
9. Use "Release Summons" when you're done with the current summoned creatures.

### Data Management
1. Click "Manage Data" in the footer.
2. Upload beast data in markdown format (compatible with output from 2014.5e.tools).
3. Reset data if needed (warning: this will clear all beasts and favorites).

## Beast Data Format

The application accepts markdown files in the following format:

```markdown
___
>## Beast Name
>*Size Type, alignment*
>___
>- **Armor Class** 14 (natural armor)
>- **Hit Points** 27 (5d8 + 5)
>- **Speed** 40 ft.
>___
>|STR|DEX|CON|INT|WIS|CHA|
>|:---:|:---:|:---:|:---:|:---:|:---:|
>|15 (+2)|14 (+2)|12 (+1)|3 (-4)|12 (+1)|7 (-2)|
>___
>- **Skills** Perception +3, Stealth +4
>- **Senses** passive Perception 13
>- **Languages** —
>- **Challenge** 1 (200 XP)
>___
>***Special Ability.*** Description of special ability.
>
>### Actions
>***Attack.*** *Melee Weapon Attack:* +4 to hit, reach 5 ft., one target. *Hit:* 5 (1d6 + 2) piercing damage.
```

## Technologies Used

- HTML5
- CSS3 with responsive design
- JavaScript (ES6+)
- Bootstrap 5 for UI components
- IndexedDB for client-side storage
- Progressive Web App (PWA) capabilities

## Project Structure

```
druids-assistant/
├── index.html                # Main HTML file
├── css/
│   └── style.css             # Custom styles
├── js/
│   ├── app.js                # Main application logic and event handling
│   ├── data.js               # Data management and persistence
│   └── ui.js                 # UI rendering and state management
├── images/                   # Icons and images
└── manifest.json             # PWA manifest
```

## Recent Updates

### March 2025
- Added independent attack selection for each summoned creature
- Improved group attack and damage calculations to use individual attack selections
- Split reset functionality into "Release Summons" and "Reset Rolls" buttons
- Enhanced battlefield visualization with improved creature selection
- Optimized UI layout for better usability on various screen sizes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The D&D 5e SRD for reference statblocks and rules
- 2014.5e.tools for markdown formatting inspiration
- All the druids who have ever turned into bears and bitten faces off

---

*The Druid's Assistant: Facilitating the biting off of faces since 2025*