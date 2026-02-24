import React from "react";
import { cn } from "~/lib/utils";
import "./Hamburger.css";

interface HamburgerStyles {
  backgroundChecked?: string;
  background?: string;
  color?: string;
  colorChecked?: string;
}

interface HamburgerProps extends React.HTMLAttributes<HTMLDivElement> {
  styles?: HamburgerStyles;
  className?: string;
}

const defaultStyles: Required<HamburgerStyles> = {
  backgroundChecked: "none",
  background: "none",
  color: "var(--foreground)",
  colorChecked: "var(--foreground)",
};

export default function Hamburger({ styles = {}, className, ...props }: HamburgerProps) {
  function getStyle(key: keyof HamburgerStyles): string {
    return styles[key] || defaultStyles[key];
  }

  const inlineStyles = {
    "--hamburger-background": getStyle("background"),
    "--hamburger-background-checked": getStyle("backgroundChecked"),
    "--hamburger-color": getStyle("color"),
    "--hamburger-color-checked": getStyle("colorChecked"),
  } as React.CSSProperties;

  return (
    <div
      className={cn("cj-menuicon-label top-0 right-0 h-12 w-12", className)}
      style={inlineStyles}
      {...props}
    >
      <label className="cj-menuicon-label" htmlFor="cj-menustate">
        <span className="cj-menuicon-bread cj-menuicon-bread-top">
          <span className="cj-menuicon-bread-crust cj-menuicon-bread-crust-top" />
        </span>
        <span className="cj-menuicon-bread cj-menuicon-bread-bottom">
          <span className="cj-menuicon-bread-crust cj-menuicon-bread-crust-bottom" />
        </span>
      </label>
    </div>
  );
}
