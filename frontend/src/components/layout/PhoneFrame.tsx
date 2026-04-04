import type { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="relative mx-auto w-[420px] max-w-full rounded-[42px] border-[10px] border-[#111] bg-[#111] p-3 shadow-2xl">
      <div className="absolute left-1/2 top-2 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-[#111]" />
      <div className="absolute -left-3 top-20 h-12 w-1 rounded-l-md bg-[#222]" />
      <div className="absolute -left-3 top-36 h-16 w-1 rounded-l-md bg-[#222]" />
      <div className="absolute -right-3 top-28 h-20 w-1 rounded-r-md bg-[#222]" />
      <div className="h-[820px] overflow-y-auto rounded-[30px] bg-bg">
        <div className="sticky top-0 z-10 flex justify-end p-3">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-display font-semibold text-white">
            Demo Mode
          </span>
        </div>
        <div className="mx-auto w-[390px] max-w-full pb-8">{children}</div>
      </div>
    </div>
  )
}
