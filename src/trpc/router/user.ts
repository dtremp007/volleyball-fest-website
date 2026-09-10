import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { APIError } from "better-auth/api";
import { auth } from "~/lib/auth/auth";
import { parseUserRole } from "~/lib/auth/roles";
import { db } from "~/lib/db";
import { countUsersByRole, getUsers, updateUserRole } from "~/lib/db/queries/user";
import { permix, protectedProcedure } from "~/trpc/init";
import { createUserSchema, updateUserRoleSchema } from "~/validators/user.validators";

export const userRouter = {
  getAll: protectedProcedure.use(permix.checkMiddleware("user.read")).query(async () => {
    return await getUsers(db);
  }),

  create: protectedProcedure
    .use(permix.checkMiddleware("user.create"))
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await auth.api.createUser({
          headers: ctx.headers,
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            role: input.role as "admin",
          },
        });
      } catch (error) {
        if (error instanceof APIError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "User could not be created",
          });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "User could not be created",
        });
      }
    }),

  updateRole: protectedProcedure
    .use(permix.checkMiddleware("user.update"))
    .input(updateUserRoleSchema)
    .mutation(async ({ input }) => {
      const currentUsers = await getUsers(db);
      const target = currentUsers.find((item) => item.id === input.userId);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const currentRole = parseUserRole(target.role);
      if (currentRole === "admin" && input.role !== "admin") {
        const adminCount = await countUsersByRole(db, "admin");
        if (adminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The last admin cannot be demoted.",
          });
        }
      }

      const updated = await updateUserRole(db, input.userId, input.role);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),
} satisfies TRPCRouterRecord;
