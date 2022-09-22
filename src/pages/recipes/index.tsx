import React, { useMemo, useState } from "react";
import { trpc } from "../../utils/trpc";
import useIsMobile from "../../shared/hooks/useIsMobile";
import Image from "next/image";
import { inferQueryOutput } from "../../utils/trpc";
import { AiOutlineArrowUp, AiOutlineFilter } from "react-icons/ai";
import { useAutoAnimate } from "@formkit/auto-animate/react";

type Recipes = inferQueryOutput<"recipes.getAll">;

const Index = () => {
  const { data, isLoading, isError } = trpc.useQuery(["recipes.getAll"]);
  const [search, setSearch] = useState("");
  const filteredData = useMemo(
    () => data?.filter((recipe) => recipe.name.includes(search)),
    [data, search]
  );

  const [parent] = useAutoAnimate<HTMLElement>(/* optional config */);
  const isMobile = useIsMobile();

  if (isLoading || isError) {
    return <div>IS LOADING</div>;
  }

  if (isMobile) {
    return (
      <section className="grid grid-cols-1 gap-8 mx-auto w-full md:max-w-7xl max-w-lg pt-4 py-8 px-8">
        <form className="flex flex-col gap-3 top-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="border-3 border-primary p-1 tracking-wide"
          />
          <button className="border-primary border-3 p-2">SEARCH</button>
        </form>
        <section className="grid grid-cols-1 gap-10">
          <Recipes data={filteredData} />
        </section>
        <button className="fixed bottom-3 left-1 rounded-full p-2 bg-accent-300">
          <AiOutlineArrowUp size={30} color="white" />
        </button>
        <button className="fixed bottom-3 right-1 bg-accent-300 rounded-full p-2">
          <AiOutlineFilter size={30} color="white" />
        </button>
      </section>
    );
  }
  return (
    <section className="flex flex-col h-full gap-4">
      <form className="flex justify-between">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            className="border-3 border-primary p-1 w-72 tracking-wide"
          />
          <button className="border-primary border-3 p-2">SEARCH</button>
        </div>
        <button className="border-primary border-3 p-2">FILTER</button>
      </form>
      <section
        ref={parent}
        className="h-full overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 mx-auto w-full auto-rows-min"
      >
        <Recipes data={filteredData} />
      </section>
    </section>
  );
};

const Recipes = ({ data }: { data: Recipes | undefined }) => {
  return (
    <>
      {data
        ? data.map(({ id, name }: { id: string; name: string }) => (
            <RecipeCard key={id} id={id} name={name} />
          ))
        : []}
    </>
  );
};

const RecipeCard = ({ id, name }: { id: string; name: string }) => {
  return (
    <article className="flex flex-col gap-4 w-full h-full mx-auto animate-fade-in-down aspect-[1/1.3]">
      <div className="w-full flex basis-3/5 relative">
        <Image
          layout="fill"
          objectFit="cover"
          alt={name}
          src="https://storage.googleapis.com/recipe-website-bucket/test-images/apple-550x396.jpeg"
        />
      </div>
      <div className="flex flex-1 justify-center items-center bg-accent-400">
        <h2 className="text-secondary font-medium tracking-wide">{name}</h2>
      </div>
    </article>
  );
};

export default Index;
