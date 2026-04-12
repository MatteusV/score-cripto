import type { PrismaClient } from "../../generated/prisma/client";
import type { UserUncheckedCreateInput } from "../../generated/prisma/models/User";
import type { UserRepository, UserUpdateData } from "../user-repository";

export class UserPrismaRepository implements UserRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.user.findUnique({ where: { stripeCustomerId } });
  }

  async create(data: UserUncheckedCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UserUpdateData) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
