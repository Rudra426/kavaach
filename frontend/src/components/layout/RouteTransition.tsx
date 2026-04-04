import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'

interface RouteTransitionProps {
  children: ReactNode
  className?: string
}

export function RouteTransition({ children, className }: RouteTransitionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      )
    }, containerRef)

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
