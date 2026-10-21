export const SOCIETIES = ['Koregaon Park EV circle', 'Kalyani Nagar residents', 'Baner charging community']
export type LearningCategory = 'Charging' | 'Etiquette' | 'Solar'
export interface Learning {
  id: string
  author: string
  category: LearningCategory
  title: string
  body: string
  society: string
}
export const LEARNINGS: Learning[] = [
  {
    id: 'tip-1',
    author: 'Ananya · sample member',
    category: 'Charging',
    title: 'Check the connector before you leave',
    body: 'I check the connector type and host confirmation before heading out. A pin on the map alone does not mean a slot is reserved.',
    society: SOCIETIES[0],
  },
  {
    id: 'tip-2',
    author: 'Rohan · sample host',
    category: 'Etiquette',
    title: 'Leave the bay ready for the next driver',
    body: 'Return the cable to its holder and move your car when the session ends. Message the host through your booking if you are delayed.',
    society: SOCIETIES[1],
  },
  {
    id: 'tip-3',
    author: 'Meera · sample member',
    category: 'Solar',
    title: 'Ask how the solar supply is measured',
    body: 'A rooftop installation does not mean every charging session runs entirely on solar. Ask the host about generation and grid backup.',
    society: SOCIETIES[2],
  },
]
