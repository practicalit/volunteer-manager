import { Role } from "@/lib/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    organizationId: string;
    organizationName: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      organizationId: string;
      organizationName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
    organizationName: string;
  }
}
