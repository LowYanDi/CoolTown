# Clean source and deployment

The maintained workspace has no tracked node_modules, env.download or .env.local files (checked with git ls-files). The earlier reported 9,363 files/history may exist in the separate VS Code repository. That repository and provider settings have not been changed. No history was rewritten. The clean source ZIP uses an explicit allowlist and contains no .git, dependencies, compiled dist or local environment files.

Copy env.example to .env.local for local use. Set VITE_MAPTILER_KEY to your restricted PUBLIC browser key only. Empty configuration gives street fallback. Local .env.local was preserved. Vite exposes this key in compiled JS; frontend keys cannot be hidden. Example files contain no actual value. Do not upload env.download.

In your existing repository, run from its root (these commands remove tracked copies only, retaining local files):
```powershell
git rm -r --cached --ignore-unmatch node_modules dist
git rm --cached --ignore-unmatch .env .env.local env.download
git add .gitignore env.example .env.example
git status
```
Review remaining tracked .env.* files and explicitly untrack any local configuration. Commit the reviewed source changes and push. Removing a file from the latest commit DOES NOT remove it from earlier history. Do not run destructive history rewrites without a separate backup and approval.

For an unrelated-history submission, extract the clean source ZIP to a NEW empty folder, then:
```powershell
git init
git add .
git commit -m "Clean CoolTown Planner source submission"
git branch -M main
```
Create a new empty GitHub repository and use its exact remote URL for git remote add origin, then git push -u origin main. No old history is included. Do not initialise over your existing repository.

User actions in MapTiler: review the public browser key's allowed website origins (including https://cooltownplanner.netlify.app), development origins if needed and usage limits. Review usage for unexpected activity. Replace/revoke a published key only after deciding the appropriate response; no key was rotated by this upgrade. In Netlify, set VITE_MAPTILER_KEY under build environment variables, use npm run build and publish dist, then redeploy. Provider-side restrictions and configuration cannot be verified from this source package. Keep required MapTiler/OpenStreetMap attribution. No unofficial Google tiles are used.

Clean install/build (Node 24 tested): npm.cmd ci; npm.cmd test; npm.cmd run build. These are separate commands in the project directory. Build regenerates dist and the manifest. The clean source package intentionally excludes dist: Netlify builds from source. A separate changed-files package includes the tested production build; its public browser key is necessarily visible in compiled output and is not a server secret.
