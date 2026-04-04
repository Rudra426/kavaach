import { Bell, CreditCard, FileText, Home, User } from 'lucide-react'
import { NavLink, useParams } from 'react-router-dom'

export function BottomNav() {
  const params = useParams()
  const riderId = params.id ?? localStorage.getItem('kavaach_rider_id') ?? 'DEMO'

  const navItems = [
    { to: `/dashboard/${riderId}`, label: 'Home', icon: Home },
    { to: `/policy/${riderId}`, label: 'Policy', icon: FileText },
    { to: `/payments/${riderId}`, label: 'Payments', icon: CreditCard },
    { to: `/notifications/${riderId}`, label: 'Alerts', icon: Bell },
    { to: '/claims', label: 'Profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur-sm md:hidden">
      <ul className="mx-auto flex max-w-md items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs ${
                    isActive ? 'text-primary' : 'text-muted'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
