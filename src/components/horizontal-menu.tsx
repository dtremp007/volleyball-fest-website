import { Link } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

export function HorizontalMenuLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "bg-background border-border sticky top-0 z-5 flex flex-row flex-nowrap items-center justify-start overflow-x-auto border-b",
        className,
      )}
      style={{
        scrollbarWidth: "none",
      }}
    >
      {children}
    </nav>
  );
}

export function Menu({ links }: { links: { label: string; to: string }[] }) {
  return (
    <div className="flex flex-row flex-nowrap items-center px-4">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="text-md text-muted-foreground hover:text-primary data-[status=active]:border-primary data-[status=active]:text-primary p-4 pb-2 text-nowrap data-[status=active]:border-b-2"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
