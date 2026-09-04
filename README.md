# OwnDo

**Your local, private, offline todo app.**

> Your tasks belong to you. They stay on your device.

OwnDo is a small todo app with no account, no server, and no sync. It runs entirely in your browser using plain HTML, CSS, and JavaScript, and stores everything in `localStorage`.

## Features

- A Kanban board — To do, In progress, Done — with a sticky header and a slim footer, so the board itself always fills the middle of the screen
- Drag a card between columns to change its status, or reorder within a column; each column has its own quick "+ Add a card" composer
- Create, edit, and delete tasks, each with a full-screen detail page laid out like an open ledger spread — a record page for its metadata on the left, a scrollable log for comments on the right
- Set status, priority (none/low/medium/high), due dates, and repeat rules (daily/weekly/monthly)
- Add notes, subtasks (a checklist within a task), tags, and comments to any task
- Mark tasks as favorites, and filter the board by favorite or by tag
- Sort each column by priority, due date, date added, or A–Z, or leave it on manual order for drag-and-drop
- Search across titles, notes, and tags
- Clear an entire column of done tasks in one click, with an undo toast for accidental deletes
- Export your tasks to a JSON file and import them back — your own backup, on your terms
- Customize appearance: light/dark/system theme, accent color, density, corner style, and list font
- Zero network requests — works fully offline, no fonts or scripts loaded from a CDN

## Running it

No build step, no dependencies. Either:

- Open `index.html` directly in a browser, or
- Serve the folder locally, e.g. `npx serve .` or `python3 -m http.server`, then visit the printed URL.

## Privacy

OwnDo never sends your tasks anywhere. There is no backend, no analytics, and no tracking. All data — your tasks and your customization settings — is stored only in your browser's local storage on this device. Clearing your browser's site data for OwnDo will remove it, so use **Export tasks** in the customize panel to keep a backup.

## Project structure

```
index.html        entry point / markup
css/styles.css     design tokens + styles
js/app.js          app logic (state, rendering, storage)
assets/            favicon
```

## License

MIT
