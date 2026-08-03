# BioPlex Complete Build

## Copy location

The project root is the folder that already contains `package.json`, `package-lock.json`, and `src`.

1. Back up that project folder.
2. Extract this ZIP.
3. Copy `package.json`, `package-lock.json`, and the `src` folder from this ZIP directly into the project root.
4. Allow folder merging and file replacement.
5. Do not place the ZIP contents inside `src/pages` or a new BioPlex folder.
6. Open a terminal in the project root and run `npm install`.
7. Run `npm run build`.

The SQL migration must already have completed successfully.

## Required test order

1. Run `npm install`.
2. Run `npm run build`.
3. Sign in as an administrator.
4. Open **BioPlex Matching Imports**.
5. Upload the matching workbook in **Replace** mode.
6. Review and resolve or exclude all blocking rows.
7. Click **Final import**.
8. Test **BioPlex Matching Check** with reagent, calibrator, and QC lots.
9. Create a draft BioPlex count, save it, resume it, and complete it.
10. Test quick Excel, detailed Excel, PDF, correction, deletion, restoration, and customer history.

If `npm run build` fails, stop and send the complete terminal error.
