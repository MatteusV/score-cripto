export class UsageLimitExceededError extends Error {
  constructor() {
    super("Monthly analysis limit reached");
    this.name = "UsageLimitExceededError";
  }
}
