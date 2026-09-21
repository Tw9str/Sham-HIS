export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export class StorageConfigurationError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
