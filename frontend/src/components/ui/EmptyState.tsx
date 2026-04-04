import { CloudRain } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="card text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(46,125,94,0.1)]">
        <CloudRain className="h-7 w-7 text-accent2" />
      </div>
      <h3 className="font-display text-xl text-text">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  )
}
