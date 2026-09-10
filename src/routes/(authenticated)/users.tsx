import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { parseUserRole, type UserRole } from "~/lib/auth/roles";
import { assertPermission } from "~/lib/permix/assert";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/users")({
  component: UsersPage,
  beforeLoad: ({ context }) => {
    assertPermission(context.permix, "user.read");
  },
});

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  scorekeeper: "Scorekeeper",
};

function UsersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery(trpc.user.getAll.queryOptions());
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("scorekeeper");

  const adminCount = users.filter((user) => parseUserRole(user.role) === "admin").length;

  const updateRole = useMutation(
    trpc.user.updateRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.user.getAll.queryKey() });
        toast.success("Role updated");
      },
      onError: (error) => toast.error(error.message || "Role could not be updated"),
    }),
  );

  const createUser = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.user.getAll.queryKey() });
        toast.success("User created");
        setCreateOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("scorekeeper");
      },
      onError: (error) => toast.error(error.message || "User could not be created"),
    }),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage league admins and scorekeepers
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Create user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Create an account with an email and password. Share the password with them
                securely.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createUser.mutate({ name, email, password, role });
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="user-name">Name</FieldLabel>
                  <Input
                    id="user-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-email">Email</FieldLabel>
                  <Input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-password">Password</FieldLabel>
                  <Input
                    id="user-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="user-role">Role</FieldLabel>
                  <NativeSelect
                    id="user-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                  >
                    <NativeSelectOption value="scorekeeper">
                      Scorekeeper
                    </NativeSelectOption>
                    <NativeSelectOption value="admin">Admin</NativeSelectOption>
                  </NativeSelect>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? "Creating…" : "Create user"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const currentRole = parseUserRole(user.role);
              const disableDemote = currentRole === "admin" && adminCount <= 1;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="w-48">
                    <NativeSelect
                      value={currentRole}
                      disabled={updateRole.isPending || disableDemote}
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) =>
                        updateRole.mutate({
                          userId: user.id,
                          role: event.target.value as UserRole,
                        })
                      }
                    >
                      <NativeSelectOption value="admin">
                        {roleLabels.admin}
                      </NativeSelectOption>
                      <NativeSelectOption value="scorekeeper">
                        {roleLabels.scorekeeper}
                      </NativeSelectOption>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US")
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
