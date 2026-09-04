# OwnDo

**Your local, private, offline todo app.**

> Your tasks belong to you. They stay on your device.

OwnDo is a small todo app with no account, no server, and no sync. It runs entirely in your browser using plain HTML, CSS, and JavaScript, and stores everything in `localStorage`.

## Features

- Create, edit, complete, and delete tasks
- Reorder tasks by dragging
- Filter by all / active / completed, and search by text
- Clear completed tasks in one click
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
