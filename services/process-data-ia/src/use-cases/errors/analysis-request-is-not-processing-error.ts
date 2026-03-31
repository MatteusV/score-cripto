export class AnalysisRequestIsNotProcessingError extends Error {
  constructor() {
    super("Analysis request is not in PROCESSING status");
  }
}
