import type { RefreshToken } from "../generated/prisma/browser.js";
import type { RefreshTokenUncheckedCreateInput } from "../generated/prisma/models/RefreshToken.js";

export interface RefreshTokenRepository {
  create: (data: RefreshTokenUncheckedCreateInput) => Promise<RefreshToken>;
  findByTokenHash: (tokenHash: string) => Promise<RefreshToken | null>;
  revoke: (id: string) => Promise<void>;
  revokeAllByUserId: (userId: string) => Promise<void>;
}
