# Volleyball Fest Website Architecture

This project follows a layered architecture pattern with clear separation of concerns.

## Project Structure

```
src/
├── lib/db/schema/*.schema.ts    # Drizzle tables + relations
├── lib/db/queries/*.ts          # Database query functions
├── validators/*.validators.ts   # Zod validation schemas
├── trpc/router/*.trpc.ts        # tRPC procedures
└── routes/*.tsx                 # TanStack Router pages
```

## Layer Conventions

### 1. Schema Layer (`src/lib/db/schema/*.schema.ts`)

- Uses Drizzle ORM with SQLite (libsql)
- Tables defined with `sqliteTable` from `drizzle-orm/sqlite-core`
- Relations defined separately using `relations()` from `drizzle-orm`
- Use `text("id").primaryKey()` for primary keys (UUIDs generated at query layer)
- All schemas exported via `src/lib/db/schema/index.ts`

```typescript
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const example = sqliteTable("example", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  relatedId: text("related_id").references(() => related.id, { onDelete: "cascade" }),
});

export const exampleRelations = relations(example, ({ one, many }) => ({
  related: one(related, {
    fields: [example.relatedId],
    references: [related.id],
  }),
}));
```

### 2. Query Layer (`src/lib/db/queries/*.ts`)

- Functions receive `db: Database` as first parameter
- Use `uuid` (v4) for generating IDs
- Naming convention: `getXs`, `getXById`, `createX`, `updateX`, `deleteX`
- Import schema from `~/lib/db/schema`
- Import `Database` type from `~/lib/db`

```typescript
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getExamples = async (db: Database) => {
  return await db.select().from(schema.example);
};

export const getExampleById = async (db: Database, id: string) => {
  return await db.select().from(schema.example).where(eq(schema.example.id, id));
};

export const createExample = async (db: Database, params: CreateExampleParams) => {
  return await db
    .insert(schema.example)
    .values({ id: uuidv4(), ...params })
    .returning();
};

export const updateExample = async (
  db: Database,
  id: string,
  params: UpdateExampleParams,
) => {
  return await db
    .update(schema.example)
    .set(params)
    .where(eq(schema.example.id, id))
    .returning();
};

export const deleteExample = async (db: Database, id: string) => {
  return await db.delete(schema.example).where(eq(schema.example.id, id)).returning();
};
```

### 3. Validators (`src/validators/*.validators.ts`)

- Use Zod for validation
- Export both schema and inferred TypeScript type
- Naming convention: `createXSchema`, `updateXSchema`, `XFormSchema`

```typescript
import { z } from "zod";

export const createExampleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateExampleSchema = createExampleSchema.partial();

export type CreateExampleValues = z.infer<typeof createExampleSchema>;
export type UpdateExampleValues = z.infer<typeof updateExampleSchema>;
```

### 4. tRPC Layer (`src/trpc/router/*.trpc.ts`)

- Use `TRPCRouterRecord` type from `@trpc/server`
- Use `publicProcedure` for public endpoints
- Use `protectedProcedure` for authenticated endpoints
- Register routers in `src/trpc/router/index.ts`
- Call query functions from query layer

```typescript
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import { getExamples, createExample } from "~/lib/db/queries/example";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import { createExampleSchema } from "~/validators/example.validators";

export const exampleRouter = {
  getAll: publicProcedure.query(async () => {
    return await getExamples(db);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getExampleById(db, input.id);
    }),

  create: protectedProcedure.input(createExampleSchema).mutation(async ({ input }) => {
    return await createExample(db, input);
  }),
} satisfies TRPCRouterRecord;
```

### 5. Frontend (`src/routes/*.tsx`)

- Uses TanStack Router for file-based routing
- Uses TanStack Form for form handling
- Uses TanStack Query with tRPC hooks via `useTRPC()`
- UI components from Shadcn UI (`~/components/ui/*`)

```typescript
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/example")({
  component: ExamplePage,
});

function ExamplePage() {
  const trpc = useTRPC();
  const examples = useQuery(trpc.example.getAll.queryOptions());
  const createMutation = useMutation(trpc.example.create.mutationOptions());

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: createExampleSchema },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  // ...
}
```

## Tech Stack

- **Framework**: TanStack Start (React + Vite)
- **Database**: SQLite via libsql (Turso in production)
- **ORM**: Drizzle ORM
- **API**: tRPC v11
- **Auth**: Better Auth
- **Styling**: Tailwind CSS + Shadcn UI
- **Forms**: TanStack Form
- **State/Data**: TanStack Query

## File Naming Conventions

- Schema files: `*.schema.ts`
- Query files: `*.ts` (in queries folder)
- Validator files: `*.validators.ts`
- tRPC router files: `*.trpc.ts`
- Route files: `*.tsx` (TanStack Router convention)
