interface SkeletonBlockProps {
  className?: string
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-xl bg-[rgba(138,132,120,0.12)] ${className}`} />
}
