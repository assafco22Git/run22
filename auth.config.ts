import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // Edge-safe: map token.role → session.user.role so the proxy can read it
    session({ session, token }) {
      if (token?.role) {
        (session.user as { role: string }).role = token.role as string;
      }
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as Role | undefined;
      const path = nextUrl.pathname;

      // Login page: redirect authenticated users to their dashboard
      if (path === "/login") {
        if (isLoggedIn) {
          if (role === "TRAINER") {
            return Response.redirect(new URL("/trainer/dashboard", nextUrl));
          }
          return Response.redirect(new URL("/calendar", nextUrl));
        }
        return true; // allow unauthenticated access to login
      }

      // Trainer routes: require TRAINER role
      if (path.startsWith("/trainer")) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        if (role !== "TRAINER") {
          return Response.redirect(new URL("/calendar", nextUrl));
        }
        return true;
      }

      // All other routes: require login
      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
