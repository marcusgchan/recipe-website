import { Loader } from "@/shared/components/Loader";
import { RouterOutputs, trpc } from "@/utils/trpc";
import { useRouter } from "next/router";
import Image from "next/image";

export default function Recipe() {
  const router = useRouter();
  const {
    data: recipe,
    isError,
    isLoading,
  } = trpc.recipes.getRecipe.useQuery({
    recipeId: String(router.query.recipeId),
  });

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return <div>Something went wrong</div>;
  }

  if (!recipe) {
    return <div>Recipe not found</div>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 pb-10">
      <h1 className="text-4xl font-bold">{recipe.name}</h1>
      {!!recipe.description.length && <div>{recipe.description}</div>}
      {recipe.parsedSiteInfo && (
        <p className="text-sm">
          Original recipe by <b>{recipe.parsedSiteInfo?.author}</b>
        </p>
      )}
      <div className="relative aspect-square w-full">
        <DisplayImage {...recipe.mainImage} name={recipe.name} />
      </div>
      <section>
        <h2 className="mb-3 text-2xl font-bold">Ingredients</h2>
        {!!recipe.ingredients.length ? (
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map(({ name, isHeader, order }) => (
              <li
                key={order}
                className={
                  isHeader ? "text-xl font-bold" : "flex items-center gap-2"
                }
              >
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p>This recipe doesn&apos;t have ingredients</p>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-2xl font-bold">Steps</h2>
        {!!recipe.steps.length ? (
          <ol className="flex flex-col gap-2">
            {recipe.steps.map(({ name, isHeader, order }) => (
              <li
                key={order}
                className={
                  isHeader ? "text-xl font-bold" : "flex items-start gap-2"
                }
              >
                {!isHeader && <span>{order + 1}.</span>}
                {name}
              </li>
            ))}
          </ol>
        ) : (
          <p>This recipe doesn&apos;t have steps</p>
        )}
      </section>
    </div>
  );
}

type DisplayImageProps = NonNullable<
  RouterOutputs["recipes"]["getRecipe"]
>["mainImage"] & { name: string };

function DisplayImage(props: DisplayImageProps) {
  if (props.type === "url" || props.type === "presignedUrl") {
    return (
      <Image
        className="object-cover"
        priority
        unoptimized
        fill={true}
        loading="eager"
        alt={props.name}
        src={props.url}
      />
    );
  }
  return <div>No Image</div>;
}
