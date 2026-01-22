import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const Route = createFileRoute("/signup-success")({
  component: SignupSuccessPage,
});

function SignupSuccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle>Inscripcion enviada</CardTitle>
          <CardDescription>
            Recibimos la informacion de tu equipo. Te contactaremos con los siguientes
            pasos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link to="/">Volver al inicio</Link>
          </Button>
          <Button asChild>
            <Link to="/signup-form">Registrar otro equipo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
