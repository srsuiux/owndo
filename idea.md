# OwnDo

**OwnDo — Your local, private, offline Todo app.**

## Project Idea

OwnDo is a lightweight Todo application designed around one simple principle:

> **Your tasks belong to you. They stay on your device.**

There is no cloud backend, no account, no server, and no automatic data synchronization.

OwnDo should feel **fast, clean, private, and personal**.

## Core Principles

* **Local-first** — data is stored locally on the user's device.
* **Offline** — the app works without an internet connection.
* **Private** — no data is sent to a cloud service.
* **Secure** — no unnecessary external dependencies or tracking.
* **Fast** — instant task creation and updates.
* **Clean** — minimal and distraction-free interface.
* **Customizable** — users can personalize the theme and UI.

## Core Features

### Todo Management

* Create todos
* Complete/uncomplete todos
* Edit todos
* Delete todos
* Organize tasks
* Clear completed tasks
* Search/filter tasks

### Local Storage

All application data should remain locally on the user's device.

No:

* Cloud database
* User accounts
* Login
* Server API
* Analytics
* Tracking
* Automatic cloud sync

Use browser/device-local storage for persistence.

## Customization

Allow users to customize the application without making the UI complicated.

Possible options:

* Light / dark mode
* Accent color
* Background
* UI density
* Rounded / minimal interface
* Font preferences
* Todo list appearance

The customization should remain simple and clean.

## Technology

Use only plain web technologies:

* **HTML**
* **CSS**
* **JavaScript**

No React, Vue, Angular, or other frontend frameworks.

No backend is required.

The application should be capable of running entirely as a local web application.

## Design Direction

OwnDo should have a:

* Minimal interface
* Clean typography
* Generous spacing
* Fast interactions
* Responsive layout
* Simple navigation
* Subtle animations
* Customizable theme

Avoid unnecessary features and visual clutter.

## Privacy Statement

OwnDo should make its privacy model obvious:

**Your tasks never need to leave your device.**

The application should not require an account or internet connection to perform its core functionality.

## Future Possibilities

Potential future additions, while keeping the local-first philosophy:

* Export/import tasks
* Local backup
* Encrypted local storage
* Keyboard shortcuts
* PWA support
* Installable desktop experience
* Optional user-controlled synchronization

Any future sync feature should be **explicitly opt-in**, never the default.

## Project Goal

Build a small, polished Todo application that demonstrates how useful software can be created without requiring a cloud backend.

**OwnDo = Own your tasks. Own your data.**
