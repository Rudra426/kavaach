import { cx } from '../../lib/format'

interface TierBadgeProps {
  tier: 'GREEN' | 'YELLOW' | 'RED' | string
  pulse?: boolean
}

export function TierBadge({ tier, pulse }: TierBadgeProps) {
  const className =
    tier === 'GREEN'
      ? 'badge-green'
      : tier === 'YELLOW'
        ? 'badge-yellow'
        : 'badge-red'

  return <span className={cx(className, pulse && 'animate-pulseSoft')}>{tier}</span>
}
