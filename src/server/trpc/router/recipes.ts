import {
  addRecipeSchema,
  getRecipeSchema,
  getRecipesSchema,
  addUrlImageRecipeSchema,
  editRecipeSchema,
} from "@/schemas/recipe";
import {
  createParsedRecipe,
  createRecipe,
  getMainImage,
  getRecipe,
  getRecipeFormFields,
  getRecipes,
  updateRecipeNoneToSigned,
  updateRecipeSignedToSigned,
  updateRecipeUrlToSigned,
} from "@/services/recipesService";
import {
  getImageSignedUrl,
  getUploadSignedUrl,
  remove,
} from "@/services/s3Services";
import { ParsedRecipe } from "@/shared/types";
import { TRPCError } from "@trpc/server";
import { env } from "src/server/env.mjs";
import { protectedProcedure, router } from "../trpc";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

export const recipesRouter = router({
  getRecipes: protectedProcedure
    .input(getRecipesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const recipes = await getRecipes(ctx, userId, input);
      const formattedRecipes = recipes.map(async (recipe) => {
        if (recipe.mainImage?.type === "url") {
          const url = recipe.mainImage.urlImage?.url;
          if (url) {
            return { ...recipe, mainImage: { type: "url" as const, url } };
          }
        } else if (recipe.mainImage?.type === "presignedUrl") {
          const key = recipe.mainImage?.metadataImage?.key;
          if (key) {
            const url = await getImageSignedUrl(
              userId,
              recipe.id,
              key,
              getFormattedUtcDate()
            );
            return {
              ...recipe,
              mainImage: { type: "presignedUrl" as const, url },
            };
          }
        }
        // Shouldn't reach this point since image is required unless
        // a recipe is missing a mainImage
        // This can happen if an image upload fails
        // TODO: add proper dummy image
        return { ...recipe, mainImage: { type: "noImage" as const, url: "" } };
      });
      return await Promise.all(formattedRecipes);
    }),
  getRecipe: protectedProcedure
    .input(getRecipeSchema)
    .query(async ({ ctx, input }) => {
      const recipe = await getRecipe(ctx, input.recipeId);
      if (!recipe) {
        return null;
      }
      if (recipe.mainImage?.type === "url" && recipe.mainImage.urlImage?.url) {
        return {
          ...recipe,
          mainImage: {
            type: "url" as const,
            url: recipe.mainImage.urlImage.url,
          },
        };
      } else if (
        recipe.mainImage?.type === "presignedUrl" &&
        recipe.mainImage.metadataImage
      ) {
        try {
          const url = await getImageSignedUrl(
            ctx.session.user.id,
            recipe.id,
            recipe.mainImage.metadataImage.key,
            getFormattedUtcDate()
          );
          return {
            ...recipe,
            mainImage: { type: "presignedUrl" as const, url },
          };
        } catch (e) {}
      }
      // Should only reach here if there isn't an image
      return { ...recipe, mainImage: { type: "noImage" as const, url: "" } };
    }),
  addRecipe: protectedProcedure
    .input(addRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const uuid = uuidv4();
      const recipe = await createRecipe(ctx, userId, input, uuid);
      if (!recipe) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create Recipe",
        });
      }
      const signedUrl = await getUploadSignedUrl(
        userId,
        recipe.id,
        input.imageMetadata,
        uuid
      );
      return signedUrl;
    }),
  getRecipeFormFields: protectedProcedure
    .input(getRecipeSchema)
    .query(async ({ ctx, input }) => {
      const recipe = await getRecipeFormFields(ctx, input.recipeId);
      if (!recipe) {
        return null;
      }
      return {
        ...recipe,
        prepTime: recipe.prepTime ? recipe.prepTime.toNumber() : undefined,
        cookTime: recipe.cookTime ? recipe.cookTime.toNumber() : undefined,
        image: {
          // Only need if image is presignedUrl since the frontend will need
          // a url to display the image
          type: recipe.mainImage?.type ?? "noImage",
          src:
            recipe.mainImage?.type === "url"
              ? recipe.mainImage.urlImage?.url
              : recipe.mainImage?.type === "presignedUrl"
              ? await getImageSignedUrl(
                  ctx.session.user.id,
                  recipe.id,
                  recipe.mainImage.metadataImage?.key ?? "",
                  getFormattedUtcDate()
                )
              : "",
          imageMetadata: recipe.mainImage?.metadataImage ?? {
            name: "",
            size: 0,
            type: "",
          },
          urlSourceImage: recipe.mainImage?.urlImage?.url ?? "",
        },
        nationalities: recipe.nationalities.map(
          ({ nationality: { id, name } }) => ({
            id,
            name,
          })
        ),
        cookingMethods: recipe.cookingMethods.map(
          ({ cookingMethod: { id, name } }) => ({
            id,
            name,
          })
        ),
        mealTypes: recipe.mealTypes.map(({ mealType: { id, name } }) => ({
          id,
          name,
        })),
      };
    }),
  addParsedRecipe: protectedProcedure
    .input(addUrlImageRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const recipe = await createParsedRecipe(ctx, userId, input);
      return recipe;
    }),
  parseRecipe: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      try {
        const res = await fetch(
          `${env.PARSER_URL}/parse?url=${encodeURIComponent(input.url)}`,
          {
            headers: {
              Authorization: env.PARSER_SECRET,
            },
          }
        );
        if (!res.ok) throw new Error("Unable to parse recipe");
        const recipe = (await res.json()) as ParsedRecipe;
        return {
          siteInfo: {
            url: input.url,
            author: recipe.author,
          },
          initialData: {
            name: recipe.title,
            description: recipe.description,
            image: {
              urlSourceImage: recipe.image,
              imageMetadata: undefined,
            },
            ingredients: recipe.ingredients.map((ingredient) => ({
              id: uuidv4(),
              name: ingredient,
              isHeader: false,
            })),
            steps: recipe.instructions_list.map((step) => ({
              id: uuidv4(),
              name: step,
              isHeader: false,
            })),
            prepTime: recipe.prep_time,
            cookTime: recipe.cook_time,
            isPublic: false,
            cookingMethods: [],
            mealTypes: [],
            nationalities: [],
          },
        };
      } catch (e) {
        throw new TRPCError({
          message: "Unable to parse recipe",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  editRecipe: protectedProcedure
    .input(editRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const oldRecipe = await getMainImage(ctx, input.id);
      if (!oldRecipe) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipe does not exist",
        });
      }
      if (
        oldRecipe.mainImage?.type === "presignedUrl" &&
        oldRecipe.mainImage.metadataImage?.key
      ) {
        const uuid = uuidv4();
        await updateRecipeSignedToSigned(ctx, input, uuid);
        await remove(
          ctx.session.user.id,
          input.id,
          oldRecipe.mainImage.metadataImage.key
        ).catch((e) => {
          console.log("Error: Unable to remove old image", e);
        });
        const signedUrl = await getUploadSignedUrl(
          ctx.session.user.id,
          input.id,
          input.imageMetadata,
          uuid
        );
        return signedUrl;
      } else if (
        oldRecipe.mainImage?.type === "url" &&
        oldRecipe.mainImage.urlImage?.url
      ) {
        const uuid = uuidv4();
        await updateRecipeUrlToSigned(ctx, input, oldRecipe.mainImage.id, uuid);
        const signedUrl = await getUploadSignedUrl(
          ctx.session.user.id,
          input.id,
          input.imageMetadata,
          getFormattedUtcDate()
        );
        return signedUrl;
      } else {
        const uuid = uuidv4();
        await updateRecipeNoneToSigned(ctx, input, uuid);
        const signedUrl = await getUploadSignedUrl(
          ctx.session.user.id,
          input.id,
          input.imageMetadata,
          uuid
        );
        return signedUrl;
      }
    }),
  editUrlImageRecipe: protectedProcedure
    .input(addUrlImageRecipeSchema)
    .mutation(({ ctx, input }) => {}),
});

// Create a date that will be appended to the end
// of the imageName to deal with caching
// The same url needs to be created for the browser to cache
// therefore round date to the start of each week
function getFormattedUtcDate() {
  const date = new Date();
  // Don't add 1 on Sunday
  if (!date.getDay()) {
    date.setDate(date.getDate() - date.getDay());
  } else {
    date.setDate(date.getDate() - date.getDay() + 1);
  }
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
}
