type DomExceptionLike = Error & {
  name: string;
  code: number;
};

const DOM_EXCEPTION_CODES: Record<string, number> = {
  IndexSizeError: 1,
  HierarchyRequestError: 3,
  WrongDocumentError: 4,
  InvalidCharacterError: 5,
  NoModificationAllowedError: 7,
  NotFoundError: 8,
  NotSupportedError: 9,
  InvalidStateError: 11,
  SyntaxError: 12,
  InvalidModificationError: 13,
  NamespaceError: 14,
  InvalidAccessError: 15,
  TypeMismatchError: 17,
  SecurityError: 18,
  NetworkError: 19,
  AbortError: 20,
  URLMismatchError: 21,
  QuotaExceededError: 22,
  TimeoutError: 23,
  InvalidNodeTypeError: 24,
  DataCloneError: 25
};

function installDomExceptionPolyfill(): void {
  const runtime = globalThis as typeof globalThis & {
    DOMException?: typeof Error;
  };

  if (typeof runtime.DOMException !== "undefined") {
    return;
  }

  class DOMExceptionPolyfill extends Error implements DomExceptionLike {
    code: number;

    constructor(message = "", name = "Error") {
      super(message);
      this.name = name;
      this.code = DOM_EXCEPTION_CODES[name] ?? 0;
    }
  }

  Object.defineProperty(runtime, "DOMException", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: DOMExceptionPolyfill
  });
}

installDomExceptionPolyfill();
