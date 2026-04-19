import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { beforeAll, describe, expect, it } from "vitest";
import { buildKeyGenerator } from "./rate-limit.js";

const generateKeyPairAsync = promisify(generateKeyPair);

let privateKey: string;
let publicKey: string;
let otherPrivateKey: string;

beforeAll(async () => {
  const pair = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  privateKey = pair.privateKey;
  publicKey = pair.publicKey;

  const otherPair = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  otherPrivateKey = otherPair.privateKey;
});

function makeRequest(authorization?: string, ip = "1.2.3.4") {
  return {
    headers: { authorization },
    ip,
  } as unknown as Parameters<ReturnType<typeof buildKeyGenerator>>[0];
}

function makeToken(sub: string, key: string, expiresIn?: number) {
  return jwt.sign({ sub, email: "test@example.com" }, key, {
    algorithm: "RS256",
    issuer: "score-cripto-users",
    audience: "score-cripto-api",
    ...(expiresIn === undefined ? {} : { expiresIn }),
  });
}

describe("buildKeyGenerator", () => {
  it("JWT válido retorna user:<sub>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const token = makeToken("user-abc-123", privateKey);
    const key = keyGen(makeRequest(`Bearer ${token}`));
    expect(key).toBe("user:user-abc-123");
  });

  it("JWT expirado retorna ip:<ip>", async () => {
    const keyGen = buildKeyGenerator(publicKey);
    const token = makeToken("user-abc-123", privateKey, -1);
    const key = keyGen(makeRequest(`Bearer ${token}`));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("JWT assinado com chave errada retorna ip:<ip>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const token = makeToken("user-abc-123", otherPrivateKey);
    const key = keyGen(makeRequest(`Bearer ${token}`));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("header Authorization ausente retorna ip:<ip>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const key = keyGen(makeRequest(undefined));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("header com prefixo Basic (não Bearer) retorna ip:<ip>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const key = keyGen(makeRequest("Basic dXNlcjpwYXNz"));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("Bearer sem token retorna ip:<ip>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const key = keyGen(makeRequest("Bearer "));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("Bearer com payload malformado retorna ip:<ip>", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const key = keyGen(makeRequest("Bearer nao.e.um.jwt.valido"));
    expect(key).toBe("ip:1.2.3.4");
  });

  it("IPs diferentes geram chaves diferentes", () => {
    const keyGen = buildKeyGenerator(publicKey);
    const key1 = keyGen(makeRequest(undefined, "1.1.1.1"));
    const key2 = keyGen(makeRequest(undefined, "2.2.2.2"));
    expect(key1).not.toBe(key2);
  });
});
