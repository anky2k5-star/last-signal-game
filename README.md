# Last Signal — Real-time Multiplayer Sci-fi Battler

Last Signal runs as a browser game served by a small Node.js server. Players need only the public link and a browser; there are no player accounts, downloads, or installs. The server uses native WebSockets and owns each room, team assignment, energy pool, deployment check, simulation tick, combat result, and match outcome. Clients send deployment choices and render server snapshots; they do not submit damage, score, or movement results. No third-party runtime packages are required.

## Run locally

Install Node.js 22 or newer on the machine hosting the game. From this folder, run:

```sh
npm install
npm start
```

Then open <http://localhost:3000>. `localhost` works only on the hosting machine; it is not a public link. To test on your own network, use the host machine's LAN address and allow inbound TCP port 3000 through its firewall. For players outside that network, deploy the server as described below.

The solo AI mode remains available from the entry screen. It also works when the project is served by the Node server.

## Multiplayer rules

- A room code identifies a lobby. A room has 2–8 commander seats. Players enter a callsign and code; no account is needed.
- Teams are assigned to keep cyan and orange counts as even as possible. Teams share one energy reserve and one command core each.
- The host starts once at least two players are connected and every connected seat is ready. The server starts the same three-minute battle for the room.
- Cyan deploys on the left side and orange on the right. Each team can deploy Scout, Heavy, Medic, and Drone units in any of the three lanes. Units move and fight automatically under the server simulation.
- Destroy the opposing core to win. If time expires, higher core health wins; remaining living unit health breaks a tie. If both measures tie, the result is a draw.
- A disconnected commander can reclaim their reserved seat with its browser-stored reconnect token. Lobby seats are released after 45 seconds offline. If the host leaves or disconnects, the first connected commander becomes host. Active battles continue while players reconnect.
- Room state is held in server memory. A process restart, redeploy, or sleeping host ends active rooms. This prototype is designed for one server instance; do not scale it horizontally without adding shared room storage and a Socket.IO adapter.

## Test the real-time server

With dependencies installed, run:

```sh
npm run test:multiplayer
```

The test starts an actual local server and eight independent WebSocket clients. It checks invalid and full rooms, team balancing, ready/start, server-side deployment validation, energy spending, synchronized combat damage, host migration, and reconnect. This verifies separate network clients on one machine. It does not create a public internet server or test remote devices.

For a manual device check on the same LAN, open the same `http://<host-lan-address>:3000` page on two devices, create a room on one, join its five-character code on the other, ready both players, and start from the host screen.

## Public hosting (Render example)

The repository must be available from a Git provider that Render can access. Publish the contents of `outputs/last-signal` as the repository root, or configure that directory as Render's **Root Directory**. In Render, create a **Web Service** with:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Runtime:** Node
- **Environment variables:** none required. Render supplies `PORT`; the server binds to `0.0.0.0` by default. `HOST` can be set to `0.0.0.0` if the environment requires an explicit bind address.

After deploy, Render provides an HTTPS `onrender.com` URL. Share that URL; players open it in a browser, then use the room code. WebSocket connections use the same host and need no extra player configuration. The project does not currently have a deployed public URL or hosting credentials attached, so deployment still requires the project owner to connect the repository and create the Web Service.

Render's free web services can sleep after inactivity and have ephemeral filesystems; an incoming visit wakes a sleeping service, and server restarts clear in-memory matches. Keep this single instance for prototype matches. For a reliable public challenge, use an always-on paid web-service instance. See [Render deploy guide](https://render.com/docs/your-first-deploy), [WebSocket support](https://render.com/docs/websocket), and [free instance behavior](https://render.com/docs/free).

## Project files

- `index.html`, `styles.css`, `renderer.js`, and `app.js` — responsive game and room/lobby UI.
- `game-engine.js` — shared battle rules and simulation, loaded in the browser and by the authoritative server.
- `server.js` — HTTP delivery, room codes, lobby/reconnect lifecycle, WebSocket transport, and authoritative simulation.
- `multiplayer.test.js` — independent WebSocket client integration test.

The exact working single-player version from before the multiplayer changes is preserved in `../last-signal-singleplayer-backup/`. Earlier visual redesign backups remain in `../last-signal-visual-pre-redesign/` and `../last-signal-backup/`.
