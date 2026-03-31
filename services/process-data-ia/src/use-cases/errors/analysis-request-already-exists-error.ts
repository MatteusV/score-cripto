export class AnalysisRequestAlreadyExistsError extends Error {
  constructor() {
    super("Analysis request already exists");
  }
}
