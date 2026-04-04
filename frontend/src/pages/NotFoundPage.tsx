import { Link } from 'react-router-dom'
import { RouteTransition } from '../components/layout/RouteTransition'

export function NotFoundPage() {
  return (
    <RouteTransition className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card max-w-md text-center">
        <h1 className="font-display text-4xl text-primary">404</h1>
        <p className="mt-2 text-muted">This route is outside the protected zone.</p>
        <Link to="/" className="btn-primary mx-auto mt-4 w-fit">
          Back to home
        </Link>
      </div>
    </RouteTransition>
  )
}
