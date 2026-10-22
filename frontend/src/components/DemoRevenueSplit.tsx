import { Card } from './ui'

/** Fixed illustrative split of the ₹132 demo booking; shown only on its receipt. */
export const SPLIT_BOOKING_REF = 'AMP-DEMO02'
export const SPLIT_TOTAL_PAISE = 13200

const DRIVER_SPLIT: { to: string; amount: string; pct: string; strong?: boolean }[] = [
  { to: 'Government (GST on energy)', amount: '₹17.08', pct: '12.9%' },
  { to: 'Electricity cost (host pays the utility)', amount: '₹76.88', pct: '58.2%' },
  { to: 'Ampere commission', amount: '₹16.80', pct: '12.7%', strong: true },
  { to: 'Ampere booking fee', amount: '₹20.00', pct: '15.2%', strong: true },
]

const SIDE_BY_SIDE = [
  { k: 'Money received', host: '₹78.12 (59.2% of ₹132)', admin: '₹36.80 gross (27.9%)' },
  { k: 'Costs', host: '₹76.88 electricity', admin: 'about ₹13.66 (GST on the fee, gateway, support and other costs)' },
]

export function DemoRevenueSplit() {
  return (
    <>
      <Card className="mt-4">
        <h2 className="font-semibold">Full split of the driver’s ₹132</h2>
        <div className="mt-2 divide-y divide-line text-sm">
          <div className="flex gap-3 py-2 text-xs text-muted">
            <span className="min-w-0 flex-1">Goes to</span>
            <span className="w-20 shrink-0 text-right">Amount</span>
            <span className="w-14 shrink-0 text-right">% of ₹132</span>
          </div>
          {DRIVER_SPLIT.map((r) => (
            <div key={r.to} className={`flex gap-3 py-2 ${r.strong ? 'font-semibold' : ''}`}>
              <span className="min-w-0 flex-1 break-words">{r.to}</span>
              <span className="w-20 shrink-0 text-right">{r.amount}</span>
              <span className="w-14 shrink-0 text-right">{r.pct}</span>
            </div>
          ))}
          <div className="flex gap-3 py-2 font-semibold">
            <span className="min-w-0 flex-1">Total</span>
            <span className="w-20 shrink-0 text-right">₹132.00</span>
            <span className="w-14 shrink-0 text-right font-normal">100%</span>
          </div>
        </div>
      </Card>
      <Card className="mt-4">
        <h2 className="font-semibold">Host and admin side by side</h2>
        <div className="mt-2 divide-y divide-line text-sm">
          {SIDE_BY_SIDE.map((r) => (
            <div key={r.k} className="py-2.5">
              <div className="text-xs font-normal text-muted">{r.k}</div>
              <div className="mt-1 grid grid-cols-1 gap-1 min-[420px]:grid-cols-2 min-[420px]:gap-4">
                <div className="min-w-0 break-words">
                  <span className="text-xs font-normal text-muted">Host · </span>
                  {r.host}
                </div>
                <div className="min-w-0 break-words">
                  <span className="text-xs font-normal text-muted">Ampere (admin) · </span>
                  {r.admin}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Illustrative demo figures. Not a tax invoice or a payout.</p>
      </Card>
    </>
  )
}
