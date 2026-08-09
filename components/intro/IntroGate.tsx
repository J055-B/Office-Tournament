'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, X } from 'lucide-react'

const ADMIN_USER = 'Admin'
const ADMIN_PASS = 'Callisto2026'

export default function IntroGate() {
  const router = useRouter()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function enterAsGuest() {
    router.push('/dashboard')
  }

  function closeModal() {
    setShowAdminModal(false)
    setError('')
    setUsername('')
    setPassword('')
  }

  function submitAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Client-side only — good enough to gate casual access, but anyone who
      // opens dev tools can read ADMIN_USER/ADMIN_PASS from the bundle. Not
      // a substitute for real auth if this ever needs to guard something
      // sensitive.
      try {
        localStorage.setItem('callisto:role', 'admin')
      } catch {}
      router.push('/dashboard')
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <img src="/images/intro-bg.jpg" alt="Tour de Callisto" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

      {/* ENTER + Admin lock — positioned in the open space between the
          rider's legs / bike frame, matching the reference crop. */}
      <div className="absolute flex flex-col items-center gap-4" style={{ left: '50%', top: '63%', transform: 'translate(-50%, -50%)' }}>
        <button
          onClick={enterAsGuest}
          className="px-10 py-3 rounded-full bg-yellow text-black font-extrabold text-xl italic tracking-wide shadow-[0_0_30px_-4px_rgba(255,212,0,0.85)] hover:shadow-[0_0_44px_-2px_rgba(255,212,0,1)] hover:scale-105 transition-all"
        >
          ENTER
        </button>
        <button
          onClick={() => setShowAdminModal(true)}
          className="flex items-center gap-1.5 text-yellow/80 hover:text-yellow text-xs font-semibold tracking-widest transition-colors"
        >
          <Lock size={14} />
          ADMIN
        </button>
      </div>

      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg app-surface border border-border p-6 relative">
            <button onClick={closeModal} className="absolute top-3 right-3 text-secondaryText hover:text-primaryText" aria-label="Close">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-5">
              <Lock size={16} className="text-yellow" />
              <h2 className="text-lg font-bold">Admin Access</h2>
            </div>
            <form onSubmit={submitAdmin} className="space-y-4">
              <div>
                <label className="text-xs text-secondaryText tracking-wide">USER</label>
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-md bg-elevated border border-border px-3 py-2 text-sm outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="text-xs text-secondaryText tracking-wide">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md bg-elevated border border-border px-3 py-2 text-sm outline-none focus:border-yellow"
                />
              </div>
              {error && <div className="text-xs text-negative">{error}</div>}
              <button type="submit" className="w-full py-2.5 rounded-md bg-yellow text-black font-bold text-sm">
                ENTER
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
