import { Link } from "@tanstack/react-router";
import React from "react";

import { Hamburger, Navbar, NavHeader, NavItem, NavList } from "./navbar";

interface HeaderProps {
  links: { label: string; to: string }[];
}

export const Header: React.FC<HeaderProps> = ({ links }) => {
  return (
    <header className="sticky top-0 z-50">
      <Navbar className="dark:border-border shadow-md dark:border-b dark:shadow-none">
        <div className="relative container mx-auto h-16">
          <div className="absolute top-2 left-2 z-30">
            <Link to="/">
              <img src="/icon-no-bg-512.png" alt="Logo" className="h-10" />
            </Link>
          </div>
          <NavHeader>
            <Hamburger className="top-2 right-2" />
          </NavHeader>
          <NavList className="pl-6 md:gap-6 md:pl-0">
            <NavItem />
            {links.map((link) => {
              return (
                <NavItem key={link.to}>
                  <Link
                    to={link.to}
                    className="text-foreground hover:text-muted-foreground"
                    activeProps={{
                      className: "font-bold",
                    }}
                  >
                    {link.label}
                  </Link>
                </NavItem>
              );
            })}
            {/* <div className="max-md:w-full max-md:pr-6 max-md:opacity-0 max-md:group-checked:opacity-100 transition-opacity duration-300 ease-in-out group-checked:delay-300">
              <ThemeSwitch />
            </div> */}
          </NavList>
        </div>
      </Navbar>
    </header>
  );
};
