import jwt from "jsonwebtoken";

export const JWT_ISSUER = "score-cripto-users";
export const JWT_AUDIENCE = "score-cripto-api";

export interface JwtPayload {
  email: string;
  role?: string;
  sub: string;
}

export interface JwtService {
  sign: (payload: JwtPayload) => string;
  verify: (token: string) => JwtPayload;
}

export class JwtServiceImpl implements JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly expiresIn: string;

  constructor(privateKey: string, publicKey: string, expiresIn: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.expiresIn = expiresIn;
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: "RS256",
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ["RS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
  }
}
