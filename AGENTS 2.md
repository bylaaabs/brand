# AGENTS.md

guidance for any agent, or human, working in this repository. the studio-wide rules live in the handbook (bylaaabs/handbook); this file is what applies here.

## laaabs.

three people in madrid making native tools, in the open, with no telemetry. the studio is `laaabs.` (lowercase, with the dot when it stands alone). products are lowercase too and are never typed in the web: baaar, haaarness, speaaak, islaaand, clipboaaard, terminaaal.

## rules of the house

- everything lowercase; english only; never an em dash or an en dash, use " - ".
- platforms in this order: macOS, windows, iOS / iPadOS, android.
- rust for cores and services, typescript for web front ends, swift / kotlin / winui only as the native layer on a rust core.
- one repo per product, all its platforms inside; services in their own repo.
- every piece of work has an issue; branches are `<type>/<slug>`; conventional commits; pull requests only, never a push to main; never merge without being asked.
- `infra/` is the map of everything and is a submodule here; `service.yaml` at the root describes this repo and must agree with `infra/map/services.yaml`.
- `CLAUDE.md` is just `@AGENTS.md`. edit this file, not that one.

## this repository

the brand. the official folders (`laaabs/`, `baaar/`, ...) hold what ángel exports from figma by hand and are never written by a script or an agent: a change there is a design decision, made by him. `generated/` is written only by `scripts/generate.mjs` from the vectors; never edit a generated file, fix the script and rerun. read `README.md` for the rules of the brand and the tree.

when a vector changes: rerun the script, commit the whole `generated/` folder with it, open a pull request. consumers move their submodule pointer on their own.
