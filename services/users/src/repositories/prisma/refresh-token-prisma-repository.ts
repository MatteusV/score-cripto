import type { PrismaClient } from "../../generated/prisma/client.js";
import type { RefreshTokenUncheckedCreateInput } from "../../generated/prisma/models/RefreshToken.js";
import type { RefreshTokenRepository } from "../refresh-token-repository.js";

export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: RefreshTokenUncheckedCreateInput) {
    return this.prisma.refreshToken.create({ data });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({ where: { tokenHash } });
  }

  async revoke(id: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
