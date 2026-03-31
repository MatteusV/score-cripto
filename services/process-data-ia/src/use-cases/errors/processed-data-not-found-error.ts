export class ProcessedDataNotFoundError extends Error {
  constructor() {
    super("Processed data not found");
  }
}
