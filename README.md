# TaskMan

TaskMan is one server with a separate account for each person. The website, the desktop window, a phone browser, and the browser extension all talk to that server. Each account has its own projects, sections, labels, filters, and tasks.

## Requirements

- Node.js 20 or newer
- npm
- Docker, when you want the home server

## Develop on this computer

```bash
npm install
npm run dev
```

That starts three processes: the API on port 8787, the website on port 5173, and the Electron window. The website calls `/api`, and Vite proxies that to the local API. Create an account on the first screen. There is no shared passphrase.

Press Ctrl+K to open quick add and Ctrl+F to search.

Quick add reads the title. `Pay rent tomorrow p1 every month #Home @bills at 9am` sets the date, priority, repeat, project, label, and time.

Saved filters match every word you type: `today`, `overdue`, `tomorrow`, `upcoming`, `next week`, `no date`, `recurring`, `completed`, `p1`, `@label`, `#project`, or text from the task name. Quote a project name that contains spaces, as in `#"Home Reno"`.

If Electron reports that it failed to install, download the runtime and start again:

```bash
node node_modules/electron/install.js
npm run dev
```

## Home server

Set a long random `TASKMAN_JWT_SECRET` before the first start, then open the site from any device on the network. People sign in with their own email and password.

```bash
set TASKMAN_JWT_SECRET=replace-with-a-long-random-string
docker compose up -d --build
```

The site and the API are the same process. Accounts and tasks are stored in the `taskman-data` volume at `/data/taskman.json`. A previous shared list at `/data/document.json` is copied into the first account created on that server. A phone can use Add to Home Screen. The sidebar collapses behind a menu button on a narrow screen.

The browser uses `/api` on the same origin. Set `VITE_API_URL` at build time when the API lives on another origin.

## Browser extension

```bash
npm run build:extension
```

In Chrome or Edge, open `chrome://extensions`, turn on Developer mode, and load `extension/dist`. The toolbar button opens the same TaskMan app as the website in a floating window. It signs in to `https://taskman.aamoghtech.org/api`. Set `VITE_API_URL` before building when the extension should use another API.

## Saved tasks on this device

After sign-in, tasks are kept in this browser under `tasks_cache_<user id>`. The list appears from that copy immediately, then refreshes from the server. Log out clears the signed-in account's copy and the tasks on screen. Another account on the same browser uses a different key.

An empty account can still import an older browser copy from `local-tasks-document`, or the desktop file `%APPDATA%\local-tasks\data.json`.

## Production desktop window

```bash
npm run build
npm start
```

`npm start` loads `dist/` inside Electron and talks to the API on `http://127.0.0.1:8787`. Build with `VITE_API_URL` when that window should use another API origin.
