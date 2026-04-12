import { randomUUID } from "node:crypto";
import type { User } from "../../generated/prisma/client";
import type { UserUncheckedCreateInput } from "../../generated/prisma/models/User";
import type { UserRepository, UserUpdateData } from "../user-repository";

export class UserInMemoryRepository implements UserRepository {
  items: User[] = [];

  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }

  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    return (
      this.items.find((u) => u.stripeCustomerId === stripeCustomerId) ?? null
    );
  }

  async create(data: UserUncheckedCreateInput) {
    const user: User = {
      id: data.id ?? randomUUID(),
      email: data.email,
      name: data.name ?? null,
      passwordHash: data.passwordHash,
      role: data.role ?? "USER",
      stripeCustomerId: data.stripeCustomerId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(user);
    return user;
  }

  async update(id: string, data: UserUpdateData) {
    const idx = this.items.findIndex((u) => u.id === id);
    if (idx === -1) {
      throw new Error(`User not found: ${id}`);
    }
    this.items[idx] = {
      ...this.items[idx],
      ...data,
      updatedAt: new Date(),
    } as User;
    return this.items[idx];
  }

  async delete(id: string) {
    const idx = this.items.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }
}
