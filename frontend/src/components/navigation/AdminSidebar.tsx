import { Activity, MapPinned, ShieldCheck, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Stats', icon: Activity },
  { to: '/admin/claims', label: 'Claims Queue', icon: ShieldCheck },
  { to: '/admin/riders', label: 'Riders', icon: Users },
  { to: '/admin#heatmap', label: 'Heatmap', icon: MapPinned },
]

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-border bg-surface p-4 shadow-card lg:block">
      <h2 className="mb-4 font-display text-xl text-primary">Admin Console</h2>
      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  isActive ? 'bg-primary text-white' : 'text-text hover:bg-bg'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
