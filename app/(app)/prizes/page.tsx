import React from 'react'

export default function PrizesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Prizes</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 app-surface rounded">
          <h3 className="font-semibold">TOUR CHAMPION</h3>
          <p className="text-secondaryText mt-2">Main competition prize — details TBA.</p>
        </div>
        <div className="p-4 app-surface rounded">
          <h3 className="font-semibold">WEEKLY WINNER</h3>
          <p className="text-secondaryText mt-2">Weekly prize — details TBA.</p>
        </div>
      </div>
    </div>
  )
}
