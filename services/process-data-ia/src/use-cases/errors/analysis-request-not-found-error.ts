export class AnalysisRequestNotFoundError extends Error {
  constructor() {
    super("Analysis request not found");
  }
}
