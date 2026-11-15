# ASTROBASE — Junior Astronaut Mission Trainer

**Build Your Base. Protect Your Crew. Explore Mars.**

ASTROBASE is a self-contained 2D top-down pixel-art Mars colony survival and management game built for younger players using **HTML5**, **CSS3**, **vanilla JavaScript**, **Canvas 2D**, and **LocalStorage**.

## Features

- **Top-Down Pixel-Art Mars World**: Red-orange Martian regolith, distant ridged mountain horizon, boulders, craters, landing pad, interactive supply crates, and rock sample sites rendered directly with Canvas 2D pixel art (no external images required).
- **Smooth Controls (Desktop & Mobile)**: `WASD` / Arrow keys, tap-to-walk, virtual on-screen D-pad, and large touch action buttons.
- **6 Base Buildings**: Habitat Dome, Solar Panel, Oxygen Generator, Water Extractor, Greenhouse, and Research Laboratory with grid-snapped placement preview and collision prevention.
- **Resource & Turn-Based Sol System**: Track Oxygen, Water, Food, Energy, Crew Health, and Base Parts with non-negative clamping, low-resource warnings, and an **End Day** Daily Report.
- **5-Mission Progressive Campaign**: Establish the Base → Secure Water → Grow Food → Scientific Research → Survive the Dust Storm.
- **5 Environmental Events**: Dust Storms, Oxygen Leaks, Frozen Water Lines, Power Breaker Trips, and Solar Radiation Warnings with clear explanations and player responses.
- **Educational Info Panels**: Kid-friendly science cards for every resource, building, and Martian safety topic.
- **LocalStorage Autosave & Settings**: Automatic saving, Continue, New Mission, Reset with confirmation, and corruption recovery.
- **Procedural Web Audio Synth**: Optional retro SFX and gentle ambient loop with mute controls.

## Controls

- **Move**: `W A S D` or Arrow keys (or virtual D-pad / tap empty ground on touch screens)
- **Interact / Repair / Shelter / Collect**: `E` or **Interact** button
- **Build Menu**: `B` or click the **Build** tab (`Base Menu` on mobile)
- **End Sol (Turn)**: `Space` or **End Day** button
- **Cancel Placement / Pause**: `Esc` or **Pause** button

## Running Locally

Because ASTROBASE uses classic deferred `<script defer>` tags and procedural Canvas/Web Audio assets without ES module imports or `fetch()` calls, you can run it either way:

1. **Direct Browser Open (`file://`)**: Double-click `index.html` to open directly in any modern desktop browser. *(Note: some strict mobile browsers restrict `localStorage` under `file://`, so a local web server is recommended for testing saves.)*
2. **Local Static Server (Recommended)**:
   ```bash
   python3 -m http.server 8080
   ```
   Then visit `http://localhost:8080`.

## Deploying to GitHub Pages

1. Create a public GitHub repository and push `index.html`, `css/`, `js/`, `assets/`, and `README.md` to the `main` branch.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose **`main`** and **`/ (root)`**, and click **Save**.
4. Your playable game will be published at `https://<username>.github.io/<repo-name>/`.

## Educational Disclaimer

All resource quantities, power costs, crop yields, and storm durations use **simplified fictional game units** designed for young learners. ASTROBASE is an educational game and is not an official NASA simulator or real-world aerospace engineering tool.

## Known Limitations

- Canvas logical resolution is fixed at `960 × 660` (`16 × 11` tiles) and scales proportionally to fit desktop and mobile viewports.
- Browser `localStorage` saves remain stored locally per browser/origin and do not sync across devices.
