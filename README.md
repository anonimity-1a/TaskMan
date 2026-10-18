# Local Tasks

A standalone desktop task list. Projects, tasks, subtasks, due dates, Today, Upcoming, and labels stay in a JSON file on this computer. The app has no account, subscription, or network API.

The layout is a sidebar, a task list, and a quick-add overlay. It is an independent app, not a Doist product.

## Requirements

- Node.js 20 or newer
- npm

## Install and run

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite renderer and opens the Electron window. Press Ctrl+K to open quick add.

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
