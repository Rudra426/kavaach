import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { formatINR } from '../../lib/format'

interface CurrencyCounterProps {
  amount: number
  className?: string
}

export function CurrencyCounter({ amount, className }: CurrencyCounterProps) {
  const valueRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const proxy = { value: 0 }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        proxy,
        { value: 0 },
        {
          value: amount,
          duration: 1,
          ease: 'power3.out',
          onUpdate: () => {
            if (valueRef.current) {
              valueRef.current.textContent = formatINR(proxy.value)
            }
          },
        },
      )
    }, valueRef)

    return () => {
      ctx.revert()
    }
  }, [amount])

  return <span ref={valueRef} className={className ?? ''}>{formatINR(0)}</span>
}
