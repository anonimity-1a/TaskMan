# Local Tasks

A standalone desktop task list. Projects, sections, labels, filters, priorities, repeating tasks, reminders, and notes stay in a JSON file on this computer. The app has no account, subscription, or shared projects.

The layout is a sidebar, a task list or board, a task panel, and a quick-add overlay. It is an independent app.

## Requirements

- Node.js 20 or newer
- npm

## Install and run

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite renderer and opens the Electron window. Press Ctrl+K to open quick add and Ctrl+F to search.

Quick add reads the title. `Pay rent tomorrow p1 every month #Home @bills at 9am` sets the date, priority, repeat, project, label, and time.

Saved filters match every word you type: `today`, `overdue`, `tomorrow`, `upcoming`, `next week`, `no date`, `recurring`, `completed`, `p1`, `@label`, `#project`, or text from the task name. Quote a project name that contains spaces, as in `#"Home Reno"`.

If Electron reports that it failed to install, download the runtime and start again:

```bash
node node_modules/electron/install.js
npm run dev
```

## Where data is stored

Windows stores the file at:

```text
%APPDATA%\local-tasks\data.json
```

Writes go to a temporary file and then replace `data.json`. The Electron session blocks requests that are not the local window, so the UI cannot call remote APIs.

## Production build

```bash
npm run build
npm start
```

`npm start` loads the built files from `dist/`. Use `npm run dev` while changing the UI.
