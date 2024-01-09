import { githubId, githubSecret, mongodbDbName } from "@/config/env";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GithubProvider from "next-auth/providers/github";
import { mongoConnectPromise } from "./database/database";

export const authOptions = {
  adapter: MongoDBAdapter(mongoConnectPromise, {
    databaseName: mongodbDbName,
  }) as Adapter,
  providers: [
    GithubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
      allowDangerousEmailAccountLinking: true,
    }),
    // ...add more providers here
  ],
  secret: process.env.NEXTAUTH_SECRET!,
} satisfies NextAuthOptions;

// Use it in server contexts
export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}
