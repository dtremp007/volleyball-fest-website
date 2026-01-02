import { useLocation } from "@tanstack/react-router";
import React, { ReactNode, useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import "./Navbar.css";

interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  children?: ReactNode;
}

export default function Navbar({ className, children, ...props }: NavbarProps) {
  const menuStateRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // Close menu on navigation change (equivalent to afterNavigate in Svelte)
    if (menuStateRef.current) {
      menuStateRef.current.checked = false;
    }
  }, [pathname]);

  return (
    <>
      <input
        ref={menuStateRef}
        type="checkbox"
        name="cj-menustate"
        id="cj-menustate"
        className="hidden"
      />
      <nav id="cj-globalnav" className={cn("group", className)} {...props}>
        {children}
      </nav>
    </>
  );
}
