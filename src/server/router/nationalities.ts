import { createRouter } from "./context";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const nationalitiesRouter = createRouter().query("getNationalities", {
  async resolve({ ctx, input }) {
    const userId = ctx.session?.user?.id;
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    return await ctx.prisma.nationality.findMany();
  },
});