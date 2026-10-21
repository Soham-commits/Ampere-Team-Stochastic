<div align="center">

# ⚡ Ampere

**One app to find EV charging.**

Find reachable, connector-compatible chargers around Pune and book community chargers hosted by cafés, offices and homes.

</div>

![Ampere project mockup: landing page on a laptop with the Pune Search mobile app in front](assets/project-mockup.png)

> **Demo only.** Listings are synthetic. Payments, refunds, metering, receipts and payouts are simulated. Ampere is a working name, with brand clearance pending.

## What is Ampere?

Ampere brings public EV charger discovery and private charger sharing into one application for India. A driver searches once, sees only the chargers their car can actually reach and plug into, compares access and price, and requests a confirmed slot. Hosts such as cafés, offices and homeowners offer their chargers through a managed journey.

The full product thinking lives in the [Ampere Product Solution Document](Ampere_Solution_Document.md).

## Repository layout

This repository holds two separate projects:

| Path | What it is | Stack |
| --- | --- | --- |
| [`/`](package.json) (`src/`, `index.html`, `public/`) | Marketing landing page with scroll animation and a phone-mockup hero | Vite, GSAP, Lenis |
| [`frontend/`](frontend/README.md) | The Ampere charging app, an installable front-end PWA | React 19, TypeScript, Tailwind CSS 4, Leaflet, Vite, Vitest |

## Key features (charging app)

- **Strict discovery.** Only chargers within the car's estimated road range *and* matching its connector are shown. The same rules drive the map, the list and the console.
- **Community booking.** Request a slot, host confirmation, demo checkout, arrival code, charging session and receipt.
- **Event-sourced bookings.** Each booking is an append-only event stream and its state is derived by replay. Five lifecycle labels are shown: requested, host confirmed, on the way, charging and done.
- **Live updates across tabs.** Driver and host sessions stay in sync through a simulated realtime channel.
- **Jury Console.** A plain-text console that accepts `TICKET` and `READY` commands and writes through the same booking services as the app.
- **Installable PWA** with a service worker.

Everything runs in the browser. The server, database and realtime channel are simulated in `frontend/src/server/` using `localStorage`, Web Locks and a `BroadcastChannel`.

## Getting started

### Charging app

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # domain and flow tests (vitest)
npm run build && npm run preview   # production build with service worker
```

### Landing page

```bash
npm install        # from the repository root
npm run dev        # http://localhost:5173
npm run build
npm run preview    # http://localhost:4173
```

Both dev servers default to port 5173, so run one at a time or pass a different port.

## Quick demo walkthrough

1. Sign in as **Aarav**, a driver with a Nexon EV at 4% battery. Home shows a 4.0 km road budget.
2. Open **Stations**. Out-of-range or incompatible chargers are hidden, and only the hidden count is shown.
3. Open **Ember & Ohm Café**, choose 90 min and 8 kWh. The demo total is ₹112 + ₹20 = **₹132**. Send the request.
4. In a second tab, sign in as **Rohan**, the café host, and confirm.
5. Pay (demo), start the journey, show the arrival code, then start and complete the session as the host.
6. Sign in as *Jury panel* and open `/jury`:
   ```
   TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2
   READY|<printed ref>|<ISO time>
   ```
   Reload the page and the booking is restored from the persisted event stream.

See [`frontend/README.md`](frontend/README.md) for the architecture table and known limits.

## Honest limits

- Synthetic listings only. Real-world verified records are not yet included.
- Map tiles come from the public OpenStreetMap tile server, which is suitable for demos only.
- Data lives in the browser's storage, so tabs of one browser share it but separate devices do not.
- The 4% battery scenario demonstrates careful filtering. It is not a rescue guarantee.

## Documentation

- [Ampere Product Solution Document](Ampere_Solution_Document.md): product, operating model, pricing assumptions and pilot plan.
- [Charging app README](frontend/README.md): run instructions, demo script and architecture.
