/** Decorative event illustrations; alert copy and booking data stay in the parent. */
export function AlertArtwork({ kind }: { kind: 'payment' | 'confirmation' | 'charge' | 'update' }) {
  return <svg viewBox="0 0 140 76" fill="none" aria-hidden="true" className="mt-4 h-[76px] w-full text-[#3560cf]">
    {kind === 'payment' ? <>
      <rect x="22" y="13" width="82" height="48" rx="10" transform="rotate(-8 22 13)" fill="currentColor" opacity=".15" />
      <rect x="35" y="17" width="82" height="48" rx="10" fill="white" stroke="currentColor" strokeOpacity=".2" />
      <path d="M36 31h80" stroke="currentColor" strokeWidth="7" opacity=".75" />
      <rect x="45" y="45" width="15" height="9" rx="3" fill="currentColor" opacity=".25" />
      <path d="M88 50h17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </> : kind === 'confirmation' ? <>
      <path d="M24 12h92v17a9 9 0 0 0 0 18v17H24V47a9 9 0 0 0 0-18V12Z" fill="#e8efff" stroke="#c4d6fc" />
      <path d="M87 15v11m0 6v6m0 6v6m0 6v5" stroke="#a9c3f7" strokeLinecap="round" />
      <circle cx="58" cy="38" r="17" fill="currentColor" />
      <path d="m50 38 6 6 11-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </> : kind === 'charge' ? <>
      <rect x="31" y="19" width="76" height="39" rx="12" fill="#e8efff" stroke="#c4d6fc" />
      <rect x="109" y="30" width="6" height="17" rx="3" fill="currentColor" opacity=".4" />
      {[0, 1, 2, 3].map((n) => <rect key={n} x={40 + n * 15} y="27" width="10" height="23" rx="3" fill="currentColor" opacity={0.25 + n * 0.2} />)}
    </> : <>
      <path d="M30 54h28c15 0 15-32 31-32h19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" opacity=".6" />
      <circle cx="30" cy="54" r="8" fill="#dce8ff" /><circle cx="30" cy="54" r="3" fill="currentColor" />
      <circle cx="108" cy="22" r="13" fill="#e8efff" /><circle cx="108" cy="22" r="5" fill="currentColor" />
    </>}
  </svg>
}
