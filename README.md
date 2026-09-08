# OwnDo

**Your local, private, offline todo app.**

> Your tasks belong to you. They stay on your device.

OwnDo is a small todo app with no account, no server, and no sync. It runs entirely in your browser using plain HTML, CSS, and JavaScript, and stores everything in `localStorage`.

## Features

- A clean Kanban board — To do, In progress, Done — with only Add Task, Filter, and Settings on the main page; everything else lives in a side panel so the board stays front and center
- A compact **Add Task** button pops a form open with sensible defaults already filled in: due today, Low priority, tagged "Todo" — edit or clear any of them before saving. Task titles support multiple lines
- Drag a card between columns to change its status, or reorder within a column; each column has its own quick "+ Add a card" composer
- **Filter & sort** panel (opens from the header, closes on outside click or Escape): search, sort, and tag/favorite filters, all synced live with the board without covering it
- Create, edit, and delete tasks, each with a full-screen detail page split into a record (metadata) on the left and a scrollable log (comments) on the right
- Set status, priority (none/low/medium/high), due dates, and repeat rules (daily/weekly/monthly)
- Add notes, subtasks (a checklist within a task), tags, and comments to any task
- Mark tasks as favorites
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
