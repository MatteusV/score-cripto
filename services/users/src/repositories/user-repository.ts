import type { User } from "../generated/prisma/browser";
import type { UserUncheckedCreateInput } from "../generated/prisma/models/User";

export interface UserRepository {
  create: (data: UserUncheckedCreateInput) => Promise<User>;
  findByEmail: (email: string) => Promise<User | null>;
  findById: (id: string) => Promise<User | null>;
}
