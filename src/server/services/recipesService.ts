import { Ingredient, Recipe } from "@prisma/client";
import { GetRecipesQuery, AddRecipeMutation } from "../../schemas/recipe";
import { Context } from "../router/context";

export async function createRecipe(
  ctx: Context,
  userId: string,
  input: AddRecipeMutation
) {
  // Unable to connect multiple on create b/c it requires recipeId
  const recipe = await ctx.prisma.recipe.create({
    data: {
      name: input.name,
      description: input.description,
      prepTime: input.prepTime || undefined,
      cookTime: input.cookTime || undefined,
      authorId: userId,
      ingredients: {
        createMany: { data: input.ingredients.map((ingredient) => ingredient) },
      },
      steps: {
        createMany: { data: input.steps.map((step) => step) },
      },
    },
  });
  return await ctx.prisma.recipe.update({
    where: { id: recipe.id },
    data: {
      cookingMethods: {
        connect: input.cookingMethods.map((cookingMethod) => ({
          cookingMethodId_recipeId: {
            cookingMethodId: cookingMethod.id,
            recipeId: recipe.id,
          },
        })),
      },
      nationalities: {
        connect: input.nationalities.map((nationality) => ({
          nationalityId_recipeId: {
            nationalityId: nationality.id,
            recipeId: recipe.id,
          },
        })),
      },
      mealTypes: {
        connect: input.mealTypes.map((mealType) => ({
          mealTypeId_recipeId: {
            mealTypeId: mealType.id,
            recipeId: recipe.id,
          },
        })),
      },
    },
  });
}

export async function getRecipes(
  ctx: Context,
  userId: string,
  input: GetRecipesQuery
) {
  const myRecipes = [] as Recipe[];
  if (input.viewScope !== "PUBLIC") {
    const recipes = await ctx.prisma.recipe.findMany({
      where: {
        authorId: userId, // Replace with "id of test user" if want seeded recipes
        name: {
          contains: input.search,
        },
        ingredients: {
          none: {
            OR: input.filters.ingredientsExclude.map((ingredient) => ({
              name: { contains: ingredient },
            })),
          },
        },
        nationalities: {
          none: {
            nationalityId: { notIn: input.filters.nationalitiesExclude },
          },
        },
        AND: input.filters.ingredientsInclude
          .map((ingredient) => ({
            ingredients: { some: { name: { contains: ingredient } } },
          }))
          .concat(
            input.filters.nationalitiesInclude.map((nationality) => ({
              ingredients: { some: { name: { contains: nationality } } },
            }))
          ),
        // prepTime: {
        //   gt: input.filters.prepTimeMin,
        //   lt: input.filters.prepTimeMax,
        // },
        // cookTime: {
        //   gt: input.filters.cookTimeMin,
        //   lt: input.filters.cookTimeMax,
        // },
      },
    });
    myRecipes.push(...recipes);
  }
  const publicRecipes = [] as Recipe[];
  if (input.viewScope === "PUBLIC") {
    publicRecipes.push(
      ...(await ctx.prisma.recipe.findMany({
        where: {
          id: {
            not: {
              equals: userId,
            },
          },
          isPublic: true,
        },
      }))
    );
  }
  console.log(publicRecipes);
  return [...myRecipes, ...publicRecipes];
}