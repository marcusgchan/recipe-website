import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import {
  DEFAULT_UTENSILS,
  DEFAULT_MEAL_TYPES,
  DEFAULT_NATIONALITIES,
  DEFAULT_COOKING_METHODS,
} from "./data";

const prisma = new PrismaClient();

async function main() {
  await createDefaultMealTypes();
  await createDefaultNationalities();
  await createDefaultUtensils();
  await createDefaultCookingMethods();
  await createDefaultRecipies(); // recipies for testing only
}

async function createDefaultMealTypes() {
  console.log("Creating Meal Types...");
  await prisma.mealType.createMany({
    data: DEFAULT_MEAL_TYPES.map((meal) => ({ name: meal })),
  });
}

async function createDefaultNationalities() {
  console.log("Creating Nationalities...");
  await prisma.nationality.createMany({
    data: DEFAULT_NATIONALITIES.map((nationality) => ({ name: nationality })),
  });
}

async function createDefaultUtensils() {
  console.log("Creating Utensils...");
  await prisma.utensil.createMany({
    data: DEFAULT_UTENSILS.map((utensil) => ({ name: utensil })),
  });
}

async function createDefaultCookingMethods() {
  console.log("Creating Cooking Methods...");
  await prisma.cookingMethod.createMany({
    data: DEFAULT_COOKING_METHODS.map((cookingMethod) => ({
      name: cookingMethod,
    })),
  });
}

async function createDefaultRecipies() {
  console.log("Creating Recipes...");

  const testUser1 = await prisma.user.create({
    data: {
      email: "testUser1@test.com",
      name: "testUser1",
    },
  });

  const mealTypes = await prisma.mealType.findMany();
  const utensils = await prisma.utensil.findMany();
  const nationalities = await prisma.nationality.findMany();
  const cookingMethods = await prisma.cookingMethod.findMany();

  Array.from({ length: 10 }).forEach(
    async () =>
      await prisma.recipe.create({
        data: {
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          cookTime: faker.datatype.float(),
          prepTime: faker.datatype.float(),
          mealTypes: {
            create: [
              {
                mealType: {
                  connect: {
                    id: mealTypes[0]?.id,
                  },
                },
              },
              {
                mealType: {
                  connect: {
                    id: mealTypes[1]?.id,
                  },
                },
              },
            ],
          },
          utensils: {
            create: {
              utensil: {
                connect: {
                  id: utensils[0]?.id,
                },
              },
            },
          },
          nationalities: {
            create: {
              nationality: {
                connect: {
                  id: nationalities[0]?.id,
                },
              },
            },
          },
          cookingMethods: {
            create: {
              cookingMethod: {
                connect: {
                  id: cookingMethods[0]?.id,
                },
              },
            },
          },
          authorId: testUser1.id,
          ingredients: {
            create: Array.from({ length: 6 }).map((_, index) => ({
              name: faker.commerce.productName(),
              unit: "Metric",
              measurement: faker.datatype.number(),
            })),
          },
          steps: {
            create: Array.from({ length: 7 }).map((_, index) => ({
              order: index,
              description: faker.commerce.productDescription(),
            })),
          },
        },
      })
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });