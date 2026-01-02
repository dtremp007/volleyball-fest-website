import React, { ReactNode } from 'react'

interface NavHeaderProps {
  children?: ReactNode
}

export default function NavHeader({ children }: NavHeaderProps) {
  return <div className="absolute top-0 left-0 w-full block md:hidden">{children}</div>
}
