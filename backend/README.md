# Ampere server

Node + Postgres backend for the Ampere charging app. Bookings, holds, the jury console and live updates move out of the browser and into a real database. **Nothing in `frontend/` or the landing page changes.**

| Feature | What it does | Where |
| --- | --- | --- |
| Append-only booking events | Every booking action is a row in `booking_events`. Postgres refuses updates, deletes and gaps in a stream. Lifecycle state is rebuilt by replay, so a booking survives a refresh, a cleared browser and a server restart. | `db/migrations/`, `src/store/` |
| Booking services and jury console over HTTP | The app's own booking rules (`frontend/src/server/*`) run on the server behind an RPC endpoint. `TICKET` and `READY` use the same services as the app's buttons. | `src/rpc.ts`, `src/server.ts` |
| Signed sessions | One token per browser tab, derived actor on every request. Drivers cannot confirm their own bookings; hosts see only their sites. | `src/auth.ts` |
| Live updates and per-account replicas | Server-sent events carry new booking events to the devices allowed to see them. Each tab gets a snapshot with only its own data: exact addresses, entrance details and arrival-code hashes stay on the server. | `src/realtime.ts`, `src/snapshot.ts` |
| Unchanged app, wired to the server | A build config swaps the in-browser simulation for network clients with the same exports. | `web/`, `client/`, `scripts/` |
| Real public chargers | 17 real chargers from Open Charge Map, with driving distances from the demo origin measured by OSRM. They pass through the same strict range and connector filter, and cannot be reserved. | `src/seed/`, `data/real-chargers.json` |

No double booking is enforced twice: by the booking engine, and by a Postgres exclusion constraint on `resource_holds`.

## How it fits together

```
browser (unchanged app + client/*)  ──RPC──▶  Hono server  ──▶  Postgres
                                   ◀──SSE──   in-memory engine (frontend/src/server)
```

The engine runs in memory, exactly as it does in the browser build. Every write it makes is queued and committed to Postgres before the request is answered. On startup, and after any failed write, memory is rebuilt from Postgres. The server is therefore a single instance by design.

## Run locally

Needs Node 22+ and Postgres 15+. Homebrew `postgresql@17` works.

```bash
createdb ampere
cd backend
npm install
npm run build:web        # landing page + server-backed app into ../dist
npm start                # http://localhost:8787, app at /app/
```

- **First start:** applies migrations and seeds the demo. Later starts load from Postgres.
- **Phones:** devices on the same Wi-Fi can use the network address printed at startup. Discovery searches from the fixed MIT-WPU origin, so no location permission is needed.
- **Hot reload:** with `npm start` running, `npm run dev:web` serves the app at http://localhost:5173/app/.
- **Reset:** with the server running, `npm run reset` reseeds the database and refreshes every open device. The app itself has no reset button.

Configuration comes from environment variables. See `example.env`.

| Variable | Default |
| --- | --- |
| `DATABASE_URL` | `postgres://localhost:5432/ampere` |
| `TOKEN_SECRET` | Random per process, so sessions end on restart. Set it for any shared deployment. |
| `CORS_ORIGIN` | localhost dev ports. Only needed when the app is served from another origin. |
| `PORT` | `8787` |

## Real charger data

`data/real-chargers.json` is a committed snapshot, so the demo never depends on Open Charge Map or OSRM being reachable. To refresh it:

```bash
OCM_API_KEY=<your key> npm run import:chargers
```

- **API key:** a free key from https://openchargemap.org/profile/applications. Never commit it.
- **Selection:** the importer keeps chargers within 20 km with connectors the car catalogue understands (CCS2, Type 2, CHAdeMO). It drops two-wheeler points and inconsistent records.
- **Licence:** Open Charge Map data is CC BY 4.0. Each listing's note carries the attribution, and the app shows it on the charger page.

Real chargers are directory listings that Ampere cannot reserve, so the app's Discover screen (bookable chargers only) leaves them out. They appear in the jury console and in the `searchChargers` API. At 4% battery (4 km budget), every real charger is outside the road budget and hidden. Raising the battery shows them with their measured distance. From a Baner origin, some are inside the budget and some outside:

```
TICKET|Tata Nexon EV|4|18.5590|73.7868|CCS2
```

## Tests

```bash
createdb ampere_test
npm test                 # persistence, HTTP journey, console, collisions, privacy, client parity, real chargers
npm run typecheck
```

## Jury proof (solution document §21)

1. **Strict filtering:** as Aarav (4%), Stations hides Aundh (out of range), Lane 7 (wrong connector) and every real charger beyond 4 km.
2. **Console booking:** as Jury panel on another device, run `TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2`. Rohan's dashboard shows the request without a reload. Run the printed `READY|…` line, and the console prints `host confirmed`.
3. **Cleared browser:** clear site data, sign in again and open the booking. It replays to `host confirmed` from Postgres. Inspect the rows with:
   ```bash
   psql ampere -c "select booking_id, sequence, event_type, source from booking_events order by inserted_at desc limit 5"
   ```
4. **Server restart:** restart the server. Nothing is lost, and clients reconnect.

## Limits

- **Instances:** one server instance only. The engine is in memory with write-through.
- **Accounts:** synthetic demo accounts. Anyone can pick any of them, but tokens still enforce ownership per tab.
- **Shared controls:** the booking page's demo clock step and `npm run reset` affect every device. Clock steps are audited.
- **Simulated values:** payments, metering and payouts remain simulated.
