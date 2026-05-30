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
        "bg-background flex flex-row flex-nowrap items-center justify-start overflow-x-auto",
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

export function Menu({
  links,
}: {
  links: { label: string; to: string; params?: Record<string, string> }[];
}) {
  return (
    <div className="container mx-auto flex w-full flex-row flex-nowrap items-center">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          params={link.params}
          activeOptions={{
            exact: true,
          }}
          className="text-muted-foreground hover:text-primary data-[status=active]:border-primary data-[status=active]:text-primary px-4 py-3 text-sm font-medium text-nowrap transition-colors data-[status=active]:border-b-2"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
