import React, { ReactNode } from "react";
import { cn } from "~/lib/utils";
import "./NavList.css";

interface NavListProps extends React.HTMLAttributes<HTMLUListElement> {
  className?: string;
  children?: ReactNode;
}

export default function NavList({ className, children, ...props }: NavListProps) {
  return (
    <ul className={cn("cj-list", className)} {...props}>
      {children}
    </ul>
  );
}
