/* Replaces frontend/src/server/jury.ts for the app. Commands run on the server (api.juryCommand); only the help text is local. */
export interface ConsoleLine {
  text: string
  tone?: 'ok' | 'err' | 'dim' | 'accent'
}

// Keep identical to HELP_LINES in frontend/src/server/jury.ts (checked by test/parity.test.ts).
export const HELP_LINES: ConsoleLine[] = [
  { text: 'AMPERE JURY CONSOLE — one command per line, pipe-separated.', tone: 'accent' },
  { text: 'TICKET|<car model>|<battery percent>|<lat>|<lon>|<connector>' },
  { text: '  e.g. TICKET|Tata Nexon EV|4|18.5362|73.8939|CCS2', tone: 'dim' },
  { text: 'READY|<booking ref>|<ISO time>' },
  { text: '  e.g. READY|AMP-XXXXXX|2026-10-22T10:30:00+05:30  (no offset → Asia/Kolkata)', tone: 'dim' },
  { text: 'HELP, CLEAR. Origin 18.5362,73.8939 uses seeded demo road distances; other origins use a labelled demo road estimate.', tone: 'dim' },
  { text: 'All bookings, payments and energy here are simulated demo records.', tone: 'dim' },
]
