type StandingsSkeletonProps = {
    variant?: "full" | "compact";
};

export function StandingsSkeleton({ variant = "compact" }: StandingsSkeletonProps) {
    const cols = variant === "full" ? 11 : 6;

    return (
        <div className="space-y-12">
            {[1, 2].map((section) => (
                <div key={section}>
                    <div className="mb-6 flex items-center gap-3">
                        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                        <div className="space-y-0">
                            <div className="bg-muted/50 h-10 w-full animate-pulse" />
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="bg-muted/30 h-14 w-full animate-pulse border-t"
                                    style={{ opacity: 1 - i * 0.15 }}
                                />
                            ))}
                            {variant === "full" &&
                                [4, 5, 6].map((i) => (
                                    <div
                                        key={i}
                                        className="bg-muted/30 h-14 w-full animate-pulse border-t"
                                        style={{ opacity: 1 - (i - 3) * 0.15 }}
                                    />
                                ))}
                        </div>
                        {/* simulate column count */}
                        <div className="sr-only">{cols}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
