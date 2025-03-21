# The Druid's Wildshape and Conjure Animals Assistant

A web-based assistant for D&D 5e Druid players to manage their Wildshape transformations and Conjure Animals spell.

## Features

- **Statblock Viewer**: Browse and search beast statblocks
- **Wildshape Tracker**: Track your current wildshape form's health
- **Conjure Animals**: Manage summoned creatures and their actions
- **Dice Roller**: Integrated dice roller for all your rolls
- **Offline Support**: Works without internet connection after initial load
- **Mobile Friendly**: Optimized for both desktop and mobile devices

## Getting Started

### Single-File Bundle (Recommended)

For the easiest experience, download the single HTML file bundle:

1. Download `druid-assistant-bundle.html`
2. Open it in any modern browser (Chrome, Firefox, Edge recommended)
3. On mobile devices, you can "Add to Home Screen" for app-like experience

### Standard Installation

If you prefer to run the full application:

1. Clone this repository
2. Open `index.html` in your browser
3. Use the "Manage Data" button to upload beast data if needed

## Usage

### Statblock Tab

- Browse beasts by name, CR, or size
- Click on a beast to view its full statblock
- Add beasts to favorites for quick access
- Use the Wildshape or Conjure Animals buttons to switch views

### Wildshape Tab

- View your current wildshape form
- Track HP with the health bar
- Apply damage or healing as needed

### Conjure Animals Tab

- Summon appropriate number of creatures based on CR
- Track HP for each summoned creature
- Roll group attacks with advantage/disadvantage options
- Use the battlefield visualization for positioning

### Dice Roller Tab

- Roll different dice combinations
- Apply modifiers and roll with advantage/disadvantage
- View detailed results of all rolls

## Data Management

- The app comes pre-loaded with forest, grassland, and hills beasts up to CR 6
- Upload additional beast data in markdown format using the "Manage Data" button
- Reset all data if needed

## Packaging

See `BUNDLING_INSTRUCTIONS.md` for details on creating a single-file package for offline use and distribution.

## Technical Details

Built using:
- HTML5, CSS3, JavaScript
- Bootstrap 5 for responsive design
- IndexedDB for local data storage
- Progressive Web App (PWA) support

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for Druids who want to manage shape-shifting and animal summoning with ease
- Inspired by the versatility and complexity of the Druid class in D&D 5e