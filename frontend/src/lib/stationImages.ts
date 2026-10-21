/** Illustrative scenes featuring the same SUV as the profile, never actual site photos. */
export function stationImage(siteId: string) {
  const scene = siteId === 'site-home' ? 'residence' : ['site-bund', 'site-aundh', 'site-courtyard', 'site-directory', 'site-studio', 'site-cowork'].includes(siteId) ? 'office' : 'cafe'
  return `${import.meta.env.BASE_URL}station-${scene}.webp`
}
