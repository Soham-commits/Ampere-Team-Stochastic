import type { SearchResult } from '../../server/discovery'

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-IN')
}

/** Search only the already eligible results; typing cannot bypass booking filters. */
export function filterChargers(results: SearchResult[], query: string): SearchResult[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return results
  return results.filter(({ site }) => {
    const type = site.site_type === 'RESIDENTIAL' ? 'residential society home resident' : site.site_type
    const text = normalize(`${site.name} ${site.public_area} ${type}`)
    return words.every((word) => text.includes(word))
  })
}
