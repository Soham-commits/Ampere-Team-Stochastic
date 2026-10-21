import { Check, MessageCircle, Plus, ThumbsUp, Users } from 'lucide-react'
import { useState } from 'react'
import { uuid } from '../../lib/ids'
import { useSession } from '../../app/hooks'
import { Page, PageHeader } from '../../components/Shell'
import { Button, Card, Sheet } from '../../components/ui'
import { LEARNINGS, SOCIETIES, type Learning, type LearningCategory } from './fixtures'
import { useDemoState } from '../shared/useDemoState'

export default function Society() {
  const user = useSession()!
  const [society, setSociety] = useDemoState(user.id, 'society', SOCIETIES[0])
  const [joined, setJoined] = useDemoState<string[]>(user.id, 'joined-societies', [])
  const [posts, setPosts] = useDemoState<Learning[]>(user.id, 'learnings', [])
  const [liked, setLiked] = useDemoState<string[]>(user.id, 'helpful', [])
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<LearningCategory>('Charging')
  const isJoined = joined.includes(society)
  const feed = [...posts, ...LEARNINGS].filter((post) => post.society === society && (filter === 'All' || post.category === filter))
  function share() {
    if (!title.trim() || !body.trim() || !isJoined) return
    setPosts([{ id: uuid(), author: user.display_name, category, title: title.trim(), body: body.trim(), society }, ...posts])
    setTitle('')
    setBody('')
    setOpen(false)
  }
  return (
    <>
      <PageHeader back title="Society hub" subtitle="Small learnings. Better charging." />
      <Page className="mx-auto max-w-2xl">
        <p className="mb-5 text-xs leading-relaxed text-muted">
          Demo communities and sample posts. Your contributions stay in this browser and are not published to other people.
        </p>
        <Card className="border border-line !rounded-[2rem] !p-5">
          <Users className="size-8 text-volt" />
          <label className="mt-5 block text-xs font-medium text-muted">
            Your society
            <select
              value={society}
              onChange={(e) => setSociety(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm text-ink"
            >
              {SOCIETIES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-2">{isJoined ? 'You joined this demo circle.' : 'Join to share a learning with this circle.'}</p>
            <Button
              size="sm"
              variant={isJoined ? 'secondary' : 'primary'}
              onClick={() => setJoined(isJoined ? joined.filter((name) => name !== society) : [...joined, society])}
            >
              {isJoined ? (
                <>
                  <Check className="size-4" />
                  Leave circle
                </>
              ) : (
                'Join circle'
              )}
            </Button>
          </div>
        </Card>
        <div className="mb-4 mt-7 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Shared learnings</h2>
          <Button size="sm" disabled={!isJoined} onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Share
          </Button>
        </div>
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Learning topics">
          {['All', 'Charging', 'Etiquette', 'Solar'].map((topic) => (
            <button
              key={topic}
              aria-pressed={filter === topic}
              onClick={() => setFilter(topic)}
              className={`min-h-10 rounded-full px-4 text-xs font-medium ${filter === topic ? 'bg-volt text-white' : 'bg-surface-2 text-ink-2'}`}
            >
              {topic}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {feed.map((post) => (
            <Card as="article" key={post.id} className="border border-line !rounded-[1.75rem] !p-5">
              <p className="text-[11px] font-medium text-volt">{post.category}</p>
              <h3 className="mt-3 text-xl font-medium leading-tight">{post.title}</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{post.body}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-xs text-muted">{post.author}</p>
                <button
                  aria-pressed={liked.includes(post.id)}
                  onClick={() => setLiked(liked.includes(post.id) ? liked.filter((id) => id !== post.id) : [...liked, post.id])}
                  className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs text-volt"
                >
                  <ThumbsUp className="size-3.5" />
                  {liked.includes(post.id) ? 'Helpful to you' : 'Helpful'}
                </button>
              </div>
            </Card>
          ))}
          {!feed.length ? (
            <Card className="py-10 text-center text-sm text-muted">
              <MessageCircle className="mx-auto mb-3 size-7" />
              No learnings in this topic yet. Share the first one.
            </Card>
          ) : null}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Share experience, not personal addresses or access codes. Sample tips are community discussion, not electrical installation
          advice.
        </p>
        <Sheet open={open} onClose={() => setOpen(false)} title="Share a learning">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              share()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              Topic
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LearningCategory)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
              >
                {['Charging', 'Etiquette', 'Solar'].map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Title
              <input
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
                placeholder="What worked for you?"
              />
            </label>
            <label className="block text-sm">
              Your learning
              <textarea
                required
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="mt-2 w-full resize-y rounded-2xl border border-line bg-surface-2 p-3"
                placeholder="Share something useful for another driver…"
              />
            </label>
            <p className="text-xs text-muted">Saved only on this device. No message is sent.</p>
            <Button type="submit" disabled={!isJoined || !title.trim() || !body.trim()} className="w-full">
              Save learning
            </Button>
          </form>
        </Sheet>
      </Page>
    </>
  )
}
