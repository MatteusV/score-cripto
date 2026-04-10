import jwt from "jsonwebtoken";

export interface JwtPayload {
  email: string;
  sub: string;
}

export interface JwtService {
  sign: (payload: JwtPayload) => string;
  verify: (token: string) => JwtPayload;
}

export class JwtServiceImpl implements JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(secret: string, expiresIn: string) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}
