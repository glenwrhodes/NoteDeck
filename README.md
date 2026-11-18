# NoteDeck

[![Build, test and release](https://github.com/glenwrhodes/NoteDeck/actions/workflows/release.yml/badge.svg)](https://github.com/glenwrhodes/NoteDeck/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/glenwrhodes/NoteDeck?label=download)](https://github.com/glenwrhodes/NoteDeck/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small full-stack notes app with a sci-fi control-panel look. You register, log in, and write plain-text notes that only you can see.

It is also a teaching project. Everything runs with **Docker Compose**: a **React** frontend built by **Vite**, a **Node.js + Express** API, and **PostgreSQL**. This README explains each piece and how they fit together, and why the UI looks the way it does.

## Download

**[⬇ Download NoteDeck.zip (latest release)](https://github.com/glenwrhodes/NoteDeck/releases/latest/download/NoteDeck.zip)**. No GitHub account needed. Older versions are on the [releases page](https://github.com/glenwrhodes/NoteDeck/releases).

The zip contains everything needed to run the app with Docker Compose, and nothing else. Every release is built by CI, which unzips that exact file, starts it, and passes the full smoke test before publishing it ([section 10](#10-continuous-integration-and-releases)). Developers can also `git clone https://github.com/glenwrhodes/NoteDeck.git` instead, which adds the smoke test and the CI workflow.

**Requirements**

- **Docker** with Compose v2:
  - Windows 10/11 or macOS (Intel or Apple silicon): [Docker Desktop](https://www.docker.com/products/docker-desktop/), which includes Compose.
  - Linux: Docker Engine plus the Compose plugin (`docker compose version` should work).
- **An internet connection on the first run**, to download the base images and npm packages.
- **A couple of GB of free disk space** for the images.
- **Port 8088 free**, or pick another one (see below).
- You do **not** need Node.js or PostgreSQL installed: both run inside Docker.

## Contents

1. [Quick start](#1-quick-start)
2. [How it fits together](#2-how-it-fits-together)
3. [Project layout](#3-project-layout)
4. [Docker concepts](#4-docker-concepts)
5. [The backend: Express](#5-the-backend-express)
6. [The frontend: React components](#6-the-frontend-react-components)
7. [Why Vite](#7-why-vite)
8. [The design: style and UI choices](#8-the-design-style-and-ui-choices)
9. [API reference](#9-api-reference)
10. [Continuous integration and releases](#10-continuous-integration-and-releases)
11. [Troubleshooting](#11-troubleshooting)
12. [License](#12-license)

---

## 1. Quick start

Unzip the download (or clone the repo), open a terminal in the `NoteDeck` folder, and run:

```bash
docker compose up --build
```

The first run downloads the base images and builds ours, which takes a minute or two. When the log goes quiet, open **http://localhost:8088**, click **REGISTER**, and create an account.

| To... | Run |
| --- | --- |
| Start in the background (and wait until healthy) | `docker compose up --build -d --wait` |
| See what's running | `docker compose ps` |
| Follow the logs | `docker compose logs -f` (or `... logs -f api` for one service) |
| Stop (**keeps your notes**) | `Ctrl+C` in the terminal, or `docker compose down` |
| Reset everything (**deletes all notes and users**) | `docker compose down -v` |

**Port 8088 already in use?** Copy `.env.example` to `.env`, set `WEB_PORT=8090` (or any free port), and start again.

**Check that it all works** (in a clone of the repo; the script isn't in the zip): with the app running, `node scripts/smoke-test.mjs` (needs Node 20+) runs 38 checks through the whole stack: registering, logging in, every notes operation, per-user note numbers, and that one user can never see another user's notes.

---

## 2. How it fits together

```
  Your browser
      │  http://localhost:8088   ← the only port opened on your PC
      ▼
┌───────────────┐  /api/*  ┌───────────────┐   SQL    ┌───────────────┐
│     web       │ ───────► │     api       │ ───────► │      db       │
│ nginx serving │  api:3000│ Node 22 +     │  db:5432 │ PostgreSQL 17 │
│ the React app │          │ Express       │          │               │
└───────────────┘          └───────────────┘          └───────┬───────┘
 └─── frontend network ───┘ └──────── backend network ───────┘ │
                                                     volume: pgdata
```

1. The browser loads the React app (HTML, JS, CSS) from **web**.
2. When React needs data, it calls `/api/...` on the same address. nginx in **web** forwards those requests to **api**.
3. **api** checks who is logged in, runs SQL against **db**, and returns JSON.
4. **db** keeps its files in a Docker **volume**, so the data outlives the containers.

---

## 3. Project layout

```
NoteDeck/
├── docker-compose.yml      ← the three services, networks and volume
├── .env.example            ← optional settings (copy to .env)
├── LICENSE                 ← MIT
├── .gitattributes          ← store text files with LF line endings
├── .github/workflows/
│   └── release.yml         ← CI: build, smoke-test, publish the release zip
├── api/                    ← backend
│   ├── Dockerfile
│   └── src/
│       ├── server.js       ← Express app: middleware, routes, error handler
│       ├── db.js           ← Postgres connection pool + table setup
│       ├── auth.js         ← password hashing, session cookie, requireUser
│       └── routes/
│           ├── auth.js     ← /api/auth/register, login, logout, me
│           └── notes.js    ← /api/notes CRUD
├── web/                    ← frontend
│   ├── Dockerfile          ← multi-stage: Node builds, nginx serves
│   ├── nginx.conf          ← static files + /api proxy
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx        ← entry point: mounts <App /> into the page
│       ├── App.jsx         ← routes: which page for which URL
│       ├── styles.css      ← the whole visual design
│       ├── auth/AuthContext.jsx
│       ├── lib/            ← api.js (fetch wrapper), format.js
│       ├── components/     ← Layout, Sidebar, UserMenu, Bar, Pill, NoteForm...
│       └── pages/          ← Login, Register, NotesList, NoteView, NoteNew, NoteEdit, Status
└── scripts/smoke-test.mjs  ← end-to-end test of the running stack (used by CI)
```

---

## 4. Docker concepts

### 4.1 Images and containers

An **image** is a read-only package: a small Linux filesystem plus your app and the command to start it. A **container** is a running instance of an image, with its own process, network address and writable layer. One image can run as many containers. Delete a container and you can make an identical one from the image again.

This project uses four images:

| Image | Where it comes from | Used by |
| --- | --- | --- |
| `postgres:17-alpine` | Docker Hub, used as-is | `db` |
| `notedeck-api` | **built** from `api/Dockerfile` | `api` |
| `notedeck-web` | **built** from `web/Dockerfile` | `web` |
| `node:22-alpine`, `nginx:1.27-alpine` | Docker Hub, as *base* images | inside our Dockerfiles |

Try it:

```bash
docker images            # the images on your machine, with sizes
docker compose ps        # the containers of this project and their state
docker compose exec api sh    # open a shell INSIDE the running api container (type exit to leave)
```

### 4.2 Dockerfiles, layers and multi-stage builds

A **Dockerfile** is the recipe for an image. Look at [`api/Dockerfile`](api/Dockerfile):

```dockerfile
FROM node:22-alpine                 # start from Node on Alpine Linux
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev               # install dependencies
COPY src ./src                      # then copy our code
USER node                           # don't run as root
CMD ["node", "src/server.js"]       # what the container runs
```

Each instruction makes a **layer**, and Docker caches layers. Because the dependencies are installed *before* the code is copied, changing a `.js` file only rebuilds the last layers, and `npm ci` comes from the cache. Run `docker compose build` twice to see `CACHED` on the second run.

[`web/Dockerfile`](web/Dockerfile) is a **multi-stage** build. Stage 1 (`node:22-alpine`) installs Vite and builds the React app into static files. Stage 2 starts again from `nginx:1.27-alpine` and copies in **only** the finished `dist/` folder. Node, npm and `node_modules` are left behind, so the final `notedeck-web` image is about 75 MB and contains nothing but a web server and your files.

`.dockerignore` files keep `node_modules` and local junk out of the build, so builds are faster and repeatable.

### 4.3 Compose services

[`docker-compose.yml`](docker-compose.yml) describes the whole app: three **services** (`db`, `api`, `web`), two networks and one volume. `docker compose up` creates everything in the right order, and `docker compose down` removes it again. Compose prefixes every name with the project name `notedeck`, so you'll see containers like `notedeck-api-1` and a volume called `notedeck_pgdata`.

Each service says either `image:` (use a ready-made image) or `build:` (build one from a folder with a Dockerfile). It also lists its environment variables, ports, volumes and networks.

### 4.4 The Compose network: containers talk by name

Compose puts the services on private virtual networks and runs a small DNS server. Every **service name becomes a host name**:

- nginx forwards to `http://api:3000` ([`web/nginx.conf`](web/nginx.conf))
- the API connects to `postgres://...@db:5432/notedeck` (`DATABASE_URL` in the compose file)

There are two networks, to show that you control who can talk to whom:

| Network | Members | Meaning |
| --- | --- | --- |
| `frontend` | web, api | nginx can reach the API |
| `backend` | api, db | the API can reach the database |

`web` and `db` share no network, so the web container can't even find the database. Try it:

```bash
docker compose exec web wget -qO- http://api:3000/api/health   # works: {"status":"ok","db":"ok"}
docker compose exec api nslookup db                            # works: db's private IP address
docker compose exec web wget -qO- http://db:5432               # fails: "bad address 'db:5432'"
```

**Published ports vs internal ports.** Only `web` has a `ports:` entry (`"8088:80"`, meaning *host port 8088 → container port 80*). The API's port 3000 and Postgres's port 5432 exist only inside the Compose networks. That's why NoteDeck doesn't clash with a PostgreSQL already installed on your PC at 5432. It is also safer: nothing outside Docker can reach the database directly. To look inside the database, go through the container:

```bash
docker compose exec db psql -U notedeck -d notedeck -c "SELECT id, username, created_at FROM users;"
```

### 4.5 Volumes: data that survives

A container's own filesystem is thrown away when the container is removed. Postgres keeps its data in `/var/lib/postgresql/data`, so the compose file mounts a **named volume** there:

```yaml
volumes:
  - pgdata:/var/lib/postgresql/data
```

The volume is managed by Docker and lives outside every container. Try it:

1. Write a note in the app.
2. `docker compose down`. The containers and networks are deleted, but the volume isn't.
3. `docker compose up -d --wait`, then log in again. The note is still there.
4. `docker volume ls` shows `notedeck_pgdata`, and `docker volume inspect notedeck_pgdata` shows where it lives.

Only `docker compose down -v` (or `docker volume rm notedeck_pgdata`) deletes the data.

### 4.6 Health checks and start order

`depends_on` alone only waits for a container to *start*, not to be *ready*. Postgres takes a few seconds before it accepts connections, so each service has a **health check**:

- `db` runs `pg_isready` every 5 seconds.
- `api` fetches its own `/api/health`, which also runs `SELECT 1` against the database.

and each `depends_on` uses `condition: service_healthy`. The start order is then **db healthy → api starts → api healthy → web starts**. You can watch this in the output of `docker compose up`, and the STATUS column of `docker compose ps` shows `(healthy)`.

The API also handles `SIGTERM`, the signal `docker compose down` sends, by closing its connections and exiting at once. Without that, Docker waits 10 seconds and then kills it.

### 4.7 Configuration with `.env`

The compose file uses variables with defaults, such as `${WEB_PORT:-8088}`. Compose reads a `.env` file in the same folder if one exists; otherwise it uses the default after `:-`. That's why a fresh copy runs with no setup. For anything beyond your own machine, copy `.env.example` to `.env` and set a real `POSTGRES_PASSWORD` and `JWT_SECRET`. `.env` is in `.gitignore`, so secrets don't end up on GitHub.

### Docker cheat sheet

| Command | What it does |
| --- | --- |
| `docker compose up --build` | build images if needed, create and start everything, show logs |
| `docker compose up -d --wait` | same, in the background, return when healthy |
| `docker compose ps` | list this project's containers |
| `docker compose logs -f api` | follow one service's logs (every API request is logged) |
| `docker compose exec api sh` | shell inside a running container |
| `docker compose restart api` | restart one service |
| `docker compose build` | rebuild the images (after changing code) |
| `docker compose down` | remove containers + networks (keeps the volume) |
| `docker compose down -v` | ...and remove the volume (all data) |
| `docker images` / `docker volume ls` / `docker network ls` | look at images, volumes, networks |

---

## 5. The backend: Express

**Express** is a minimal web framework for Node.js. Node can already listen for HTTP requests; Express adds the things every web server needs: **routing** (which code handles `GET /api/notes/7`), **middleware**, and helpers like `res.json()`.

### Middleware: a pipeline

An Express app is a chain of functions. Every request goes through them in order, and each one can read or change the request, send a response, or call `next()` to pass it on. From [`api/src/server.js`](api/src/server.js):

```
request
  → express.json()     parse the JSON body into req.body
  → cookieParser()     parse cookies into req.cookies
  → loadUser           read the session cookie, set req.user (or null)
  → request logger     print "GET /api/notes 200 4ms" to the logs
  → router             /api/auth/* or /api/notes/* or /api/status
  → error handler      turns any thrown error into a clean JSON 500
response
```

### Routes

A route is a method + path + handler. From [`api/src/routes/notes.js`](api/src/routes/notes.js):

```js
router.get('/:number', async (req, res) => {
  const number = readNumber(req);       // "/api/notes/7" -> 7
  if (!number) return notFound(res);
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM notes WHERE user_id = $1 AND number = $2`, [
    req.user.id,                        // set by the loadUser middleware
    number,
  ]);
  if (!rows[0]) return notFound(res);
  res.json({ note: toJson(rows[0]) });
});
```

This uses **Express 5**, which passes errors from `async` handlers straight to the error handler. You don't need `try/catch` in every route.

### Accounts and sessions

- **Passwords** are never stored as text. They're hashed with **bcrypt** (`bcryptjs`), which is deliberately slow and salted.
- After register or log in, the API sets a **session cookie** containing a signed token (a JWT). It is `httpOnly` (JavaScript in the page can't read it) and `SameSite=Lax`.
- A JWT is signed, not encrypted: anyone can decode their own cookie and read what's inside. So the token identifies you by a random **public id** (a UUID made by Postgres), never by the database's counting id, which would hint at how many accounts exist.
- `loadUser` checks the token's signature *and* looks the public id up in the database. A deleted account, or an old cookie after the database was reset, simply doesn't match anyone.
- A wrong username and a wrong password give the same error and take about the same time, so the login form doesn't reveal which usernames exist.

### Each user only sees their own notes

Every notes query includes `user_id = <the logged-in user>`. A note that belongs to someone else behaves exactly like one that doesn't exist (404), so you can't even tell it's there. All SQL uses **parameters** (`$1`, `$2`), never string concatenation, which prevents SQL injection.

### Note numbers that give nothing away

The database gives every note an `id` from one counter shared by all users. If the app showed that id, your first note might be `ND-0003`, which tells you two other notes exist. A URL like `/notes/3` would leak the same thing.

So each note also gets a **per-user number**: your notes are 1, 2, 3..., whoever else uses the server. The API and the UI only ever use that number: URLs are `/notes/1`, record codes are `ND-0001`, and responses contain no database ids for notes or users. The number comes from a counter on the user's row, bumped in the same SQL statement that inserts the note:

```sql
WITH counter AS (
  UPDATE users SET note_counter = note_counter + 1 WHERE id = $1 RETURNING note_counter
)
INSERT INTO notes (user_id, number, title, body)
SELECT $1, note_counter, $2, $3 FROM counter
```

Updating the user's row locks it, so two notes saved at the same moment still get different numbers. A unique index on `(user_id, number)` guarantees it. Numbers are never reused: delete note 2 and the next note is still 4, like invoice numbers.

The tables are created by [`api/src/db.js`](api/src/db.js) when the API starts (`CREATE TABLE IF NOT EXISTS`), so there's no separate migration step. The same file also upgrades a database from the first version: it numbers existing notes per user, in the order they were written.

---

## 6. The frontend: React components

React builds the UI out of **components**: JavaScript functions that return what should be on screen, written in **JSX** (HTML-like syntax inside JavaScript). React calls your components, compares the result with what's on screen, and updates only what changed.

The component tree:

```
<App>                         routes (App.jsx)
└── <Layout>                  the frame: elbows, bars, footer
    ├── <UserMenu>            top bar: user + LOG OUT, or LOG IN / REGISTER
    ├── <Sidebar>             the left menu
    └── <Outlet>              ← the current page goes here
        ├── <Login> / <Register>
        └── <RequireAuth>     only lets logged-in users through
            ├── <NotesList>   uses <ScreenHeader>, <Pill>, <Loading>...
            ├── <NoteView>
            ├── <NoteNew> / <NoteEdit>  → both use <NoteForm>
            └── <Status>
```

Five ideas cover almost all of it:

**1. Props: components take inputs.** [`Pill.jsx`](web/src/components/Pill.jsx) is one button design used everywhere, configured by its props:

```jsx
<Pill to="/notes/new" color="peach">+ New note</Pill>        // renders a link
<Pill color="red" onClick={handleLogout}>Log out</Pill>     // renders a button
```

**2. State: components remember things.** `useState` holds values that change. When state changes, React re-renders the component. In [`NoteForm.jsx`](web/src/components/NoteForm.jsx) every keystroke updates `title`, and the character counter updates with it:

```jsx
const [title, setTitle] = useState(initial.title);
<input value={title} onChange={(e) => setTitle(e.target.value)} />
```

**3. Effects: doing things after rendering.** `useEffect` is where data is fetched. [`NotesList.jsx`](web/src/pages/NotesList.jsx) shows a loader first, fetches the notes, then renders the list. The cleanup function stops a late response from updating a page you've already left.

**4. Context: sharing data without passing props everywhere.** [`AuthContext.jsx`](web/src/auth/AuthContext.jsx) holds the logged-in user. Any component can call `useAuth()`. The top bar uses it to show your name, the sidebar to dim locked items, and `RequireAuth` to redirect to the login page.

**5. Composition: components inside components.** `Layout` draws the frame once and puts each page in its `<Outlet />`. `NoteNew` and `NoteEdit` are tiny: both render the same `NoteForm`, each with its own `onSubmit`. That's the main way React code gets reused.

**Routing** ([`App.jsx`](web/src/App.jsx)) uses React Router. The URL decides which page component shows, and navigation happens in the browser without full page reloads. nginx sends `index.html` for any unknown path (`try_files ... /index.html`), so deep links like `/notes/7` work on refresh too.

---

## 7. Why Vite

Browsers don't understand JSX, and an app made of hundreds of modules (React, the router, your components, CSS, fonts) shouldn't be shipped as hundreds of separate files. Something has to turn the source into what browsers run. **Vite** does that, in two modes:

**Development (`npm run dev`).** Vite starts almost instantly because it doesn't bundle anything up front. It serves your files to the browser as native ES modules and transforms each one (JSX → JS) only when it's requested. When you save a file, **hot module replacement** swaps just that module into the running page, usually in a few milliseconds, without losing the page's state.

**Production (`npm run build`).** Vite bundles, tree-shakes (drops unused code) and minifies everything into a few files in `dist/`, with a content hash in each name (`index-BVqZzaZW.js`). That hash lets nginx tell browsers to cache assets for a year: a new build means new file names. Here the whole app ships as one ~87 KB (gzipped) JavaScript file plus CSS and fonts.

**Why Vite rather than the alternatives?** Create React App, the old default, is deprecated. It was slow, because it bundled everything with webpack before showing anything. Vite has become the usual choice for a client-side React app, and React's own docs list it as a way to build a React app from scratch. It needs almost no config: see [`web/vite.config.js`](web/vite.config.js).

### Dev mode with hot reload (optional)

The Docker setup runs the production build. To change the UI and see edits instantly, keep the stack running and start Vite's dev server alongside it (needs Node 22 on your PC):

```bash
docker compose up -d --wait      # API + database (and the built site on 8088)
cd web
npm install
npm run dev                      # http://localhost:5173 with hot reload
```

Vite forwards `/api` requests from port 5173 to the stack on port 8088 (the `proxy` setting in `vite.config.js`), so you log in and use real data. Stop it with `Ctrl+C`. To put UI changes into the Docker version, run `docker compose up --build -d --wait`.

---

## 8. The design: style and UI choices

### The idea

A **sci-fi starship control panel**: a black screen, flat rounded colour bars, curved "elbow" corners, and big uppercase labels with number codes. It's in the spirit of the classic TV-sci-fi computer consoles, but entirely its own design: its own colours, shapes, font and wording, with no names, logos or fonts from any franchise.

Why it suits a notes app: the console metaphor maps onto the app naturally. Notes are *records* in an *archive*, each with a record code (`ND-0007`). The account is the *operator*, and the Status screen shows *system diagnostics*.

### Layout: the frame

The page is one CSS grid ([`styles.css`](web/src/styles.css), section 3). The left column holds three elbows and the sidebar; the right column holds the top bar, the page and the footer:

```
┌──────────────┬─────────────────────────────────────────────────┐
│ elbow-top  ╰ │  NOTEDECK                  LOGGED IN AS  [LOG OUT]│
│              │ ════════════════ top bar ══════════════════════ )│
├──────────────┼─────────────────────────────────────────────────┤
│ elbow-mid  ╭ │ ═══ RECORDS CONSOLE ═══ content bar ═══════════ )│
│              │                                                 │
├──────────────┤   the current page (<Outlet />)                 │
│ 01     NOTES │                                                 │
│ 02  NEW NOTE │                                                 │
│ 03    STATUS │                                                 │
│    04-ONLINE │                                                 │
├──────────────┼─────────────────────────────────────────────────┤
│ elbow-foot ╰ │  NOTEDECK V1.0 · SESSION ACTIVE                 │
│              │ ═══════════════ footer bar ════════════════════ )│
└──────────────┴─────────────────────────────────────────────────┘
```

Each bar starts in the same colour as the elbow it grows out of, so they read as one bent shape. The bars are split into segments by the same 6 px black gap used everywhere, and end in a rounded cap.

**The frame is pinned to the window; only the page inside it scrolls.** A control panel is a fixed piece of hardware: the screens change, the console doesn't. So `.frame` is exactly `100dvh` tall with `overflow: hidden`, and the grid row for the page is `minmax(0, 1fr)`, which lets it shrink below its content instead of stretching the frame. The page area (`.content__scroll`) has `overflow-y: auto` and a thin lilac scrollbar. A long note or the Status screen scrolls inside the frame, while the menu, the top bar and the bottom elbow always stay in view. Because the window itself no longer scrolls, `Layout` scrolls the page area back to the top whenever you change pages. On phones, and in windows under 560 px tall, a pinned frame would leave almost no room for the page, so there the whole page scrolls normally.

### How an elbow is made

There are no images: each elbow is a single `<div>` and two CSS rules.

```css
.elbow--top {                              /* the coloured block */
  background: var(--c);
  border-bottom-left-radius: 72px;         /* the big OUTER curve */
}
.elbow--top::after {                       /* a black box in the corner... */
  content: '';
  position: absolute; top: 0; right: 0;
  width: 44px; bottom: 22px;               /* ...stopping 22px above the bottom = bar thickness */
  background: #000;
  border-bottom-left-radius: 44px;         /* its rounded corner carves the INNER curve */
}
```

The coloured block provides the outer curve. The black box with one rounded corner cuts the inner curve out of it, leaving a vertical arm and a 22 px horizontal arm. The bar next to it is also 22 px tall, so it continues the arm.

### Colour: a palette with meaning

Colours aren't random. Each one has a job, so after a minute you read the screen by colour:

| Colour | Hex | Job |
| --- | --- | --- |
| Amber | `#ff9f2e` | brand, page titles, the **active** menu item, primary actions (Save) |
| Peach | `#ffc48a` | record titles, values, "New note" |
| Sky | `#7cb8ff` | navigation and opening things: Notes, Log in, Edit |
| Lilac | `#c99ad8` | labels and secondary actions: Cancel, Back |
| Violet | `#9a8cf0` | system: Status, input caps |
| Red | `#ff5a43` | **destructive or warning**: Delete, Log out, errors |
| Teal | `#5ed3c3` | success: "Record created", "Online" |
| Ice | `#e3ecff` | keyboard focus ring, active-item stripe |

Everything sits on pure black, and text on coloured shapes is always black. That's a very high contrast pairing (black on amber is about 10:1), which is why the bright palette stays readable. Reading text (note bodies) is a warm off-white rather than pure white, to be easier on the eyes on black.

### Typography

**Barlow Condensed** (open-source, bundled with the app through `@fontsource`, so no font CDN). A condensed face fits the tall, narrow console labels and gets long uppercase words into small pills.

- **Labels, buttons, titles:** UPPERCASE, bold, with wide letter-spacing (0.1-0.3em). This is done in CSS (`text-transform`), so the HTML and screen readers keep normal case.
- **Note text and previews:** normal case at a larger size (1.3rem) and line height 1.55, because whole paragraphs in capitals are hard to read.
- **Codes** (`ND-0007`, `02-NAV`, `SVC-2`) are decoration that makes it feel like a console. They're `aria-hidden` where they'd only be noise for screen readers.

### Components and interaction choices

- **Pills** are the only button shape. Labels sit to the right, as on a control panel. Hover brightens; press nudges down 1 px.
- **The sidebar** marks the current page three ways: it turns amber, gets a light stripe on its right edge, and carries `aria-current="page"`. On phones the menu items are round pills. The stripe is a straight inset shadow and would show as a white half-circle on a round end, so there the active pill gets an inner ring that follows its curve instead. When you're logged out the items are dimmed and coded `LCK`.
- **Record rows** each have a coloured tab with the record code, cycling through four colours so long lists stay scannable. The title, a one-line preview and a timestamp follow.
- **Delete is two steps:** DELETE turns into a pulsing red CONFIRM DELETE + CANCEL, all in place. There's no browser pop-up, so it stays in the visual language.
- **Feedback** always appears in the same place: teal notices ("RECORD CREATED"), red alerts with a title ("ACCESS DENIED"), and a row of blinking colour blocks while loading.
- **The Status screen** turns the architecture into UI. It draws the request path (`BROWSER → web → api → db` with the ports on the links) and shows live facts from each container, such as the api container's ID and the Postgres version. It ties the Docker section of this README to something you can see. Each ONLINE has a teal status light with a soft glow, which pulses but never dims below 70%, so it reads as lit at any moment.
- **Small conveniences:** `Ctrl+Enter` saves a note, title and character counters update as you type, and the tab title follows the page.

### Accessibility and responsiveness

- Visible focus rings (ice-white outline) on everything you can tab to, plus a "Skip to content" link.
- Real `<label>`s on every input, `role="alert"` on errors, `role="status"` on notices and loaders.
- `prefers-reduced-motion` turns off every animation (pulse, blink, the flowing links on Status).
- Under 760 px wide, the elbows are hidden, the sidebar turns into a row of pills under the top bar, and the whole page scrolls, so it works on a phone.

---

## 9. API reference

All endpoints are under `/api`, and they send and receive JSON. Endpoints marked 🔒 need the session cookie and return `401` without it.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/health` | | `{ status, db }`, used by Docker's health check |
| POST | `/api/auth/register` | `{ username, password }` | `201 { user }` + cookie. `400` invalid, `409` taken |
| POST | `/api/auth/login` | `{ username, password }` | `{ user }` + cookie. `401` wrong credentials |
| POST | `/api/auth/logout` | | clears the cookie |
| GET | `/api/auth/me` | | `{ user }` or `{ user: null }` |
| GET 🔒 | `/api/notes` | | `{ notes: [{ number, title, preview, createdAt, updatedAt }] }`, newest first |
| POST 🔒 | `/api/notes` | `{ title, body }` | `201 { note }` with its new `number` |
| GET 🔒 | `/api/notes/:number` | | `{ note: { number, title, body, createdAt, updatedAt } }` or `404` |
| PUT 🔒 | `/api/notes/:number` | `{ title, body }` | `{ note }` or `404` |
| DELETE 🔒 | `/api/notes/:number` | | `204` or `404` |
| GET 🔒 | `/api/status` | | facts about the api, the db and your account |

`:number` is the note's per-user number ([section 5](#note-numbers-that-give-nothing-away)): `/api/notes/1` is always *your* first note.

Rules: usernames are 3-32 characters (`a-z 0-9 . _ -`, case-insensitive), passwords 8-128 characters, note titles 1-200 characters, note text up to 50,000 characters.

---

## 10. Continuous integration and releases

Every push to `main` runs [`.github/workflows/release.yml`](.github/workflows/release.yml) on a fresh GitHub-hosted Linux machine. It is the same Docker workflow as in this README, automated:

1. **Package** `NoteDeck.zip` with `git archive`. It takes only committed files, and only `README.md`, `LICENSE`, `docker-compose.yml`, `.env.example`, `api/` and `web/`, so `node_modules`, `.env` files, the tests and the CI config can't end up in the download.
2. **Unzip it into an empty folder** and run `docker compose up --build --wait` *from there*. That proves the zip itself is complete, not just the repo.
3. **Smoke test:** `node scripts/smoke-test.mjs` runs all 38 checks against the running stack. If anything fails, the job prints the containers' logs and stops: nothing is published.
4. **Publish** a GitHub release named `v1.0.<run number>` with `NoteDeck.zip` attached, and mark it *latest*. That's why the download link at the top (`releases/latest/download/NoteDeck.zip`) always gets the newest tested build.

Things to notice in the workflow file:

- `permissions: contents: write` lets the job's built-in `GITHUB_TOKEN` create releases. No personal token or secret is needed.
- `concurrency: release` makes two quick pushes queue up instead of publishing at the same time.
- The release is created with the `gh` CLI, which is preinstalled on GitHub's runners.
- You can also start a run by hand from the repo's **Actions** tab (`workflow_dispatch`).

---

## 11. Troubleshooting

| Problem | Fix |
| --- | --- |
| `port is already allocated` / `bind: address already in use` on 8088 | Create `.env` with `WEB_PORT=8090` (any free port) and open that port instead. |
| `Cannot connect to the Docker daemon` | Start Docker Desktop and wait until it says it's running. |
| My UI/API change doesn't show up | The images contain the code: rebuild with `docker compose up --build -d --wait`. |
| Changed `POSTGRES_PASSWORD` and the API can't connect | Postgres only sets the password when it creates a new database. Either change it back, or `docker compose down -v` to start fresh (deletes data). |
| I want a completely clean slate | `docker compose down -v --rmi all` removes the containers, networks, the volume and every image the services use (ours and the downloaded Postgres image). |
| See what the API is doing | `docker compose logs -f api` shows every request with its status code and time. |

---

## 12. License

[MIT](LICENSE). Use it, change it, teach with it.
