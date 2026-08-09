import React from 'react'

export default function InfoPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Info</h1>
      <div className="app-surface rounded-lg p-4">
        <h3 className="font-semibold">How sales convert into distance</h3>
        <p className="text-secondaryText mt-2">Distance = milestone * (sales / target). Milestones: 1000 km normal, power stages larger.</p>
      </div>
    </div>
  )
}
