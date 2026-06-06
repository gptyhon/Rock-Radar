# Source Modules

`src/` is the staging area for the next refactor step: extracting the current
large HTML scripts into maintainable frontend modules.

Recommended ownership:

- `src/radar/`: radar geometry, value mapping, canvas drawing, and transition state.
- `src/effects/`: background effects, audio-reactive effects, and visual overlays.
- `src/admin/`: admin page state, forms, image editor, CSV import/export.
- `src/shared/`: data normalization, asset URL helpers, validation, and utilities.

The current runtime still loads `public/index.html` and `public/admin.html`.
Move code into this directory gradually, with each extraction keeping `/` and
`/radar` behavior compatible.
