// src/pages/_app.tsx
import { withTRPC } from "@trpc/next";
import type { AppRouter } from "../server/router";
import type { NextComponentType } from "next/dist/shared/lib/utils";
import superjson from "superjson";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import "../styles/globals.css";
import { AppProps } from "next/app";
import React from "react";
import { NavBar } from "@/components/Navbar";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader } from "@/shared/components/Loader";

type CustomPageProps = AppProps & {
  Component: NextComponentType & { auth?: boolean; hideNav?: boolean };
};

const queryClient = new QueryClient();

const MyApp = ({
  Component,
  pageProps: { session, ...pageProps },
}: CustomPageProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {Component.auth ? (
          <Auth>
            <Layout hideNav={Component.hideNav}>
              <Component {...pageProps} />
            </Layout>
          </Auth>
        ) : (
          <Layout hideNav={Component.hideNav}>
            <Component {...pageProps} />
          </Layout>
        )}
      </SessionProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  if (status === "loading") {
    return <Loader />;
  } else if (status === "unauthenticated") {
    return (
      <div>
        <h1>You are not logged in</h1>
        <button onClick={() => signIn()}>Login</button>
      </div>
    );
  }
  return <>{children}</>;
};

const Layout = ({
  children,
  hideNav,
}: {
  children: React.ReactNode;
  hideNav: boolean | undefined;
}) => {
  return (
    <section className="mx-auto flex h-screen w-screen flex-col gap-2">
      {!hideNav && (
        <header className="relative z-20 grid place-items-center p-2">
          <NavBar />
        </header>
      )}
      <main className="isolate z-10 grid h-full min-h-0 flex-1 flex-col place-items-center">
        {children}
      </main>
    </section>
  );
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

export default withTRPC<AppRouter>({
  config({ ctx }) {
    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    const url = `${getBaseUrl()}/api/trpc`;

    return {
      url,
      transformer: superjson,
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
})(MyApp);
