import { randomUUID } from "node:crypto";
import type { RefreshToken } from "../../generated/prisma/client";
import type { RefreshTokenUncheckedCreateInput } from "../../generated/prisma/models/RefreshToken";
import type { RefreshTokenRepository } from "../refresh-token-repository";

export class RefreshTokenInMemoryRepository implements RefreshTokenRepository {
  items: RefreshToken[] = [];

  async create(data: RefreshTokenUncheckedCreateInput) {
    const token: RefreshToken = {
      id: data.id ?? randomUUID(),
      tokenHash: data.tokenHash,
      userId: data.userId,
      expiresAt: new Date(data.expiresAt as string | Date),
      revokedAt: data.revokedAt
        ? new Date(data.revokedAt as string | Date)
        : null,
      createdAt: new Date(),
    };
    this.items.push(token);
    return token;
  }

  async findByTokenHash(tokenHash: string) {
    return this.items.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async revoke(id: string) {
    const token = this.items.find((t) => t.id === id);
    if (token) {
      token.revokedAt = new Date();
    }
  }

  async revokeAllByUserId(userId: string) {
    const now = new Date();
    for (const token of this.items) {
      if (token.userId === userId && !token.revokedAt) {
        token.revokedAt = now;
      }
    }
  }
}
