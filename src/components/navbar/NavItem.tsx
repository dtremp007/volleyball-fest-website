import React, { ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface NavItemProps extends React.HTMLAttributes<HTMLLIElement> {
  className?: string
  children?: ReactNode
}

export default function NavItem({ className, children, ...props }: NavItemProps) {
  return (
    <li className={cn('cj-item-menu', className)} {...props}>
      {children}
    </li>
  )
}
