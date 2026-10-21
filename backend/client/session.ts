/* Replaces frontend/src/server/session.ts: same exports, backed by a server-issued tab token. */
import { userById } from '../../frontend/src/domain/catalogue'
import type { User } from '../../frontend/src/domain/types'
import { getToken, sessionChanged, sessionStore } from './transport'

type L = () => void
const listeners = new Set<L>()

export function currentUser(): User | null {
  const id = sessionStore.userId()
  return id ? (userById(id) ?? null) : null
}

export function signIn(userId: string) {
  sessionStore.set(userId)
  void getToken()
  sessionChanged()
  listeners.forEach((l) => l())
}

export function signOut() {
  sessionStore.clear()
  sessionChanged()
  listeners.forEach((l) => l())
}

export function onSessionChange(l: L) {
  listeners.add(l)
  return () => listeners.delete(l)
}
