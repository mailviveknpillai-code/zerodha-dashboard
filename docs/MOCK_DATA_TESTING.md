# UI Testing with Mock Market Data

The dashboard ships with a lightweight mock feed so designers, QA, and stakeholders can review the UI without connecting to Zerodha or waiting for market hours. You can switch between live and mock data directly from the UI, or start the dev server in mock mode.

## Enabling mock data from the dashboard

1. Open the dashboard in your browser.
2. Expand the right-hand settings panel.
3. Toggle **Mock Data Mode** → confirm the dialog.
4. The page reloads with bundled derivatives, options, and strike-monitoring data that auto-refreshes every tick.
5. Repeat the toggle to return to the live Zerodha feed.

> Behind the scenes the toggle stores your choice in `localStorage` and updates the `?mock=true` query parameter, ensuring the preference persists across reloads.

## Launching the dev server in mock mode

- Start the frontend as usual: `npm run dev`.
- Add `?mock=true` to the dashboard URL (e.g. `http://localhost:5173/?mock=true`) or use the toggle described above. Vite hot-reload keeps working because the mock responses are generated client-side.

## What the mock feed covers

- Futures, options (call/put), and strike monitoring tables.
- Volume/OI/bid/ask snapshots with realistic deltas to exercise the new colour-coding tiers.
- Auto-nudged spot/futures prices to validate the 0.75 s polling cadence and flash animations.

If you need additional fixtures (e.g. edge expiries, illiquid contracts), update `frontend/dashboard-ui/src/api/mockData.js`. The mock client automatically replays the new dataset once the bundle reloads.

