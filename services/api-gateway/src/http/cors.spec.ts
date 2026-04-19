import { describe, expect, it } from "vitest";
import { corsOriginCheck, isOriginAllowed } from "./cors.js";

describe("isOriginAllowed", () => {
  it("aceita o domínio prod do web-app", () => {
    expect(isOriginAllowed("https://score-cripto-web-app.vercel.app")).toBe(true);
  });

  it("aceita previews Vercel com padrão score-cripto-web-{hash}-matteus-v", () => {
    expect(
      isOriginAllowed(
        "https://score-cripto-web-irl70epar-matteus-v.vercel.app"
      )
    ).toBe(true);
    expect(
      isOriginAllowed(
        "https://score-cripto-web-fzar0nap0-matteus-v.vercel.app"
      )
    ).toBe(true);
  });

  it("aceita localhost dev (Next.js e Vite)", () => {
    expect(isOriginAllowed("http://localhost:3000")).toBe(true);
    expect(isOriginAllowed("http://localhost:5173")).toBe(true);
  });

  it("rejeita preview de outro projeto Vercel", () => {
    expect(
      isOriginAllowed("https://other-project-abc-matteus-v.vercel.app")
    ).toBe(false);
  });

  it("rejeita preview de outro user/team", () => {
    expect(
      isOriginAllowed("https://score-cripto-web-abc-someone-else.vercel.app")
    ).toBe(false);
  });

  it("rejeita HTTP no domínio prod (downgrade attack)", () => {
    expect(isOriginAllowed("http://score-cripto-web-app.vercel.app")).toBe(false);
  });

  it("rejeita subdomínio aleatório de vercel.app", () => {
    expect(isOriginAllowed("https://malicious.vercel.app")).toBe(false);
  });

  it("rejeita origem completamente desconhecida", () => {
    expect(isOriginAllowed("https://attacker.com")).toBe(false);
  });

  it("rejeita localhost em porta não-listada", () => {
    expect(isOriginAllowed("http://localhost:8080")).toBe(false);
  });
});

describe("corsOriginCheck", () => {
  it("aceita request sem header Origin (server-to-server, curl, mesma origem)", () => {
    let called = false;
    corsOriginCheck(undefined, (err, allow) => {
      called = true;
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
    expect(called).toBe(true);
  });

  it("aceita origem permitida", () => {
    let called = false;
    corsOriginCheck("https://score-cripto-web-app.vercel.app", (err, allow) => {
      called = true;
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
    expect(called).toBe(true);
  });

  it("rejeita origem desconhecida sem lançar erro", () => {
    let called = false;
    corsOriginCheck("https://attacker.com", (err, allow) => {
      called = true;
      expect(err).toBeNull();
      expect(allow).toBe(false);
    });
    expect(called).toBe(true);
  });
});
