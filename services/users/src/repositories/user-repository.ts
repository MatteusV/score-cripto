import type { User } from "../generated/prisma/browser";
import type { UserUncheckedCreateInput } from "../generated/prisma/models/User";

export type UserUpdateData = Partial<
  Omit<User, "id" | "createdAt" | "updatedAt">
>;

export interface UserRepository {
  create: (data: UserUncheckedCreateInput) => Promise<User>;
  delete: (id: string) => Promise<void>;
  findByEmail: (email: string) => Promise<User | null>;
  findById: (id: string) => Promise<User | null>;
  findByStripeCustomerId: (stripeCustomerId: string) => Promise<User | null>;
  update: (id: string, data: UserUpdateData) => Promise<User>;
}
