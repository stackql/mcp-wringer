export class WringerError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class RegistryError extends WringerError {
  constructor(message: string) {
    super("REGISTRY_ERROR", message);
  }
}

export class ScenarioError extends WringerError {
  constructor(message: string) {
    super("SCENARIO_ERROR", message);
  }
}

export class TargetError extends WringerError {
  constructor(message: string, options?: ErrorOptions) {
    super("TARGET_ERROR", message, options);
  }
}

export class TransportError extends WringerError {
  constructor(message: string, options?: ErrorOptions) {
    super("TRANSPORT_ERROR", message, options);
  }
}

export class CoverageError extends WringerError {
  constructor(message: string, options?: ErrorOptions) {
    super("COVERAGE_ERROR", message, options);
  }
}
