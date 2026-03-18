import { Trophy } from "lucide-react";

export function StandingsEmpty() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
                <Trophy className="text-muted-foreground size-8" />
            </div>
            <h3 className="text-lg font-semibold">
                No hay posiciones disponibles
            </h3>
            <p className="text-muted-foreground mt-1">
                Las posiciones aparecerán una vez que se registren resultados
            </p>
        </div>
    );
}
