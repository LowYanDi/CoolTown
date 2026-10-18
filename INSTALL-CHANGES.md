# Install the final reliability update

Apply this patch to your existing latest CoolTown Planner project (the version with 59 algorithm tests). This is not a replacement for the whole project.

1. Back up your project. Copy the supplied src and scripts files into the matching project folders, replacing matching files. Keep all other existing source files. The original supplied GeoJSON is included under src/assets/case-studies.
2. Copy README.md, VALIDATION.txt and UPGRADE-NOTES.md. Keep your existing .env.local and hosting VITE_MAPTILER_KEY value; .env.example contains no key. Configure the public key's allowed domains in MapTiler.
3. In the project terminal run npm.cmd test and npm.cmd run build. Use npm on Linux/macOS. No new dependencies are required. This regenerates dist and BUILD-MANIFEST.json and verifies every recorded hash.
4. If deploying the included compiled output directly, replace the whole previous dist folder with the supplied dist folder so old assets do not remain. Rebuilding locally is preferred when using your own MapTiler configuration.
5. Open the application: Malaysian 2026 Case Study is selected by default. Switch to demo or import custom GeoJSON as needed. Assumptions remain local session state and reset on refresh.

## Changed and new files

- src/algorithms/planning.test.ts
- src/algorithms/summary.ts
- src/assets/case-studies/CoolTown_Real_Zones_2026.geojson
- src/components/DatasetControls.tsx
- src/data/bundledCaseStudy.ts
- src/data/caseStudyModel.ts
- src/main.tsx
- scripts/build-manifest.mjs
- scripts/verify-manifest.mjs

Also included: updated documentation, key-free .env.example, BUILD-MANIFEST.json, and complete rebuilt dist. No node_modules or .env.local is included.

## Validation

63 test groups passed; TypeScript and production build passed. All 41 manifest hashes verified. Original dataset SHA256: 89e578f069ed0a5582d46a3bdad6d93d2410059a9071a9cd6c540263bff7a1be. The compiled browser app necessarily contains a public browser key when built with one; never use private credentials in Vite configuration.
