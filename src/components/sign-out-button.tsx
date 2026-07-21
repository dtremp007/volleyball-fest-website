import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { Button } from "~/components/ui/button";
import authClient from "~/lib/auth/auth-client";
import { authQueryOptions } from "~/lib/auth/queries";

export function SignOutButton({
  className = "w-fit",
  variant = "destructive",
  size = "lg",
}: Pick<ComponentProps<typeof Button>, "className" | "variant" | "size"> = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: {
            onResponse: async () => {
              // manually set to null to avoid unnecessary refetching
              queryClient.setQueryData(authQueryOptions().queryKey, null);
              await router.invalidate();
            },
          },
        });
      }}
      type="button"
      className={className}
      variant={variant}
      size={size}
    >
      Sign out
    </Button>
  );
}
