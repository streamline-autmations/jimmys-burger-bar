// An empty slot above every page, public and staff.
//
// Renders nothing in a restaurant's build. The demo build (VITE_DEMO=1) swaps
// this module for src/demo/DemoShell.tsx, which adds the demo banner and
// controls, so no demo code ships in a client build.

export const BuildOverlay = (): null => null;
