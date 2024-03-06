import { addRecipe } from "@/schemas/recipe";
import { CookingMethod, MealType, Nationality } from "@prisma/client";

export type DropdownListValues = MealType | CookingMethod | Nationality;
export type ListInputFields = keyof Pick<addRecipe, "ingredients" | "steps">;
