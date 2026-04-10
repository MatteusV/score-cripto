import type { JwtPayload, JwtService } from "./jwt-service";

export class FakeJwtService implements JwtService {
  sign(payload: JwtPayload): string {
    return `fake.${payload.sub}.${payload.email}`;
  }

  verify(token: string): JwtPayload {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "fake") {
      throw new Error("Invalid token");
    }
    return { sub: parts[1], email: parts[2] };
  }
}
