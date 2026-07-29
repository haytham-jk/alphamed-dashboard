# BioPlex calibrator reconciliation fix

Copy `apply-bioplex-calibrator-reconciliation.mjs` beside `package.json`, then run:

```bat
node .\apply-bioplex-calibrator-reconciliation.mjs
npm run lint
npm run build
```

The service file does not require a change.

Expected behavior:

- Kit first, then matching standalone calibrator: the page says the calibrator is already included with the kit.
- Standalone calibrator first, then matching kit: the standalone line is linked into the kit group and its quantity is preserved.
- A different calibrator lot remains standalone.
- The mismatch action reads `Record a different observed calibrator`.
