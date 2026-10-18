# TaskMan

TaskMan keeps one task list on a server you run at home. The website, the desktop window, a phone browser, and the browser extension all read and write that same list.

Projects, sections, labels, filters, priorities, repeating tasks, reminders, and notes live in one JSON file on the server. There is no account service. A passphrase you choose is required for every API call.

## Requirements

- Node.js 20 or newer
- npm
- Docker, when you want the home server

## Develop on this computer

```bash
npm install
npm run dev
```

That starts three processes: the API on port 8787, the website on port 5173, and the Electron window. The website proxies `/api` to the local API. The dev passphrase is `taskman-dev`.

Press Ctrl+K to open quick add and Ctrl+F to search.

Quick add reads the title. `Pay rent tomorrow p1 every month #Home @bills at 9am` sets the date, priority, repeat, project, label, and time.

Saved filters match every word you type: `today`, `overdue`, `tomorrow`, `upcoming`, `next week`, `no date`, `recurring`, `completed`, `p1`, `@label`, `#project`, or text from the task name. Quote a project name that contains spaces, as in `#"Home Reno"`.

If Electron reports that it failed to install, download the runtime and start again:

```bash
node node_modules/electron/install.js
npm run dev
```

## Home server

Build and run the container, then open `http://192.168.1.9:5173` from any device on the network. Set a passphrase before the first start. The default in Compose is `change-me`; replace it.

```bash
set TASKMAN_TOKEN=your-passphrase
docker compose up -d --build
```

The site and the API are the same process. Tasks are stored in the `taskman-data` volume at `/data/document.json`. Recreating the Portainer stack uses this Compose file. Data that used to live only in a browser is not in the old container.

Each device asks for the server address and passphrase once, then keeps them on that device. A phone can use Add to Home Screen. The sidebar collapses behind a menu button on a narrow screen.

## Browser extension

```bash
npm run build:extension
```

In Chrome or Edge, open `chrome://extensions`, turn on Developer mode, and load `extension/dist`. The popup shows Today and quick add. Projects, the board, and the calendar stay on the website.

## Moving an older copy

Desktop settings now live in `%APPDATA%\TaskMan`. If the server list is still empty, TaskMan offers a one-time copy from `%APPDATA%\local-tasks\data.json` or from the previous browser key `local-tasks-document`. After that, those locations are only an import source. If the server cannot be reached, the screen says so and does not keep a second copy.

## Production desktop window

```bash
npm run build
npm start
```

`npm start` loads `dist/` inside Electron. Point it at the home server on the first screen.
