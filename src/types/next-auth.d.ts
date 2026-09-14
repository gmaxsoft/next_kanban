import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      roleId: string;
      roleName: string;
      teamId: string | null;
      teamName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    isAdmin: boolean;
    roleId: string;
    roleName: string;
    teamId: string | null;
    teamName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    roleId: string;
    roleName: string;
    teamId: string | null;
    teamName: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    roleId: string;
    roleName: string;
    teamId: string | null;
    teamName: string | null;
  }
}
