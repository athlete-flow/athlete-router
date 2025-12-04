/**
 * Route definition with pattern and method handlers.
 * @template P - Pattern type (usually string)
 * @template M - Method type (e.g., HttpMethod or WsMethod)
 * @template H - Handler type
 */
export type IRoute<P, M extends string, H> = {
  readonly pattern: P;
  readonly children?: IRoute<P, M, H>[];
} & {
  [K in M]?: H;
};

/**
 * Represents a successfully matched route with extracted parameters.
 * @template P - Pattern type
 * @template M - Method type
 * @template H - Handler type
 */
export interface IMatchedRoute<P, M extends string, H> {
  /**
   * Gets the handler function for the matched method.
   * @returns The handler function or null if not defined
   */
  getHandler(): H | null;
  /**
   * Extracts route parameters from the matched path.
   * @returns Object containing parameter names and their values
   */
  getParams(): Record<string, string>;
  /**
   * Gets the original route definition.
   * @returns The route object
   */
  getRoute(): IRoute<P, M, H>;
}

/** Matched HTTP route with extracted parameters */
export type IMatchedHTTPRoute<H> = IMatchedRoute<string, HttpMethod, H>;

/** Matched WebSocket route with extracted parameters */
export type IMatchedWsRoute<H> = IMatchedRoute<string, WsMethod, H>;

/** Standard HTTP methods supported by the HTTP router */
export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "head" | "options";

/** HTTP route definition */
export type IHTTPRoute<H> = IRoute<string, HttpMethod, H>;

/** WebSocket lifecycle and message methods */
export type WsMethod = "connect" | "disconnect" | "message";

/** WebSocket route definition */
export type IWsRoute<H> = IRoute<string, WsMethod, H>;

/**
 * Builder interface for constructing regex patterns from route segments.
 */
export interface RegExpPatternBuilder {
  /** Internal array of pattern parts used to construct the final RegExp */
  parts: string[];
  /** Adds an exact string match (escaped) */
  exact(str: string): this;
  /** Adds a named parameter with optional constraint */
  param(name: string, constraint?: string): this;
  /** Adds a single-segment wildcard */
  wildcard(): this;
  /** Adds a multi-segment wildcard */
  deepWildcard(): this;
  /** Concatenates another builder's parts */
  concat(other: RegExpPatternBuilder): this;
  /** Builds the final RegExp */
  build(): RegExp;
}

/**
 * Function that compiles a route pattern into a regular expression.
 * @template P - Pattern type
 */
export type CompilePattern<P> = (pattern: P, builder: RegExpPatternBuilder) => RegExp;

/**
 * Strategy for selecting which route to use when multiple routes match.
 * @template P - Pattern type
 * @template M - Method type
 * @template H - Handler type
 */
export type SelectStrategy<P, M extends string, H> = (matched: IMatchedRoute<P, M, H>[]) => IMatchedRoute<P, M, H>;

/** Internal representation of a compiled route */
export type CompiledRoute<P, M extends string, H> = {
  route: IRoute<P, M, H>;
  regex: RegExp;
};

/**
 * Core router class supporting custom protocols and selection strategies.
 * @template P - Pattern type
 * @template M - Method type (union of method names)
 * @template H - Handler type
 */
export class Router<P, M extends string, H> {
  /**
   * Creates a new router instance.
   * @param methods - Array of supported method names
   * @param compilePattern - Function to compile patterns into RegExp
   * @param selectRoute - Strategy for selecting between multiple matches
   * @param routes - Route definitions
   */
  constructor(
    methods: M[],
    compilePattern: CompilePattern<P>,
    selectRoute: SelectStrategy<P, M, H>,
    ...routes: IRoute<P, M, H>[]
  );
  /**
   * Resolves a path and method to a matched route.
   * @param path - The path to match
   * @param method - The method to match
   * @returns The matched route or null if no match found
   */
  resolve(path: string, method: M): IMatchedRoute<P, M, H> | null;
}

/** HTTP router interface */
export interface IHTTPRouter<H> {
  resolve(path: string, method: HttpMethod): IMatchedHTTPRoute<H> | null;
}

/** WebSocket router interface */
export interface IWsRouter<H> {
  resolve(path: string, method: WsMethod): IMatchedWsRoute<H> | null;
}

/**
 * Creates an HTTP router with pattern specificity selection.
 * Supports: exact segments, parameters (:id), wildcards (*), deep wildcards (**).
 * @template H - Handler type
 * @param routes - HTTP route definitions
 * @returns An HTTP router instance
 * @example
 * ```typescript
 * const router = createHttpRouter(
 *   { pattern: "users/:id", get: handler }
 * );
 * const matched = router.resolve("/users/123", "get");
 * ```
 */
export function createHttpRouter<H>(...routes: IHTTPRoute<H>[]): IHTTPRouter<H>;

/**
 * Creates a WebSocket router for event-based patterns.
 * Supports: exact events, wildcards (*).
 * @template H - Handler type
 * @param routes - WebSocket route definitions
 * @returns A WebSocket router instance
 * @example
 * ```typescript
 * const router = createWsRouter(
 *   { pattern: "chat:*", message: handler }
 * );
 * const matched = router.resolve("chat:message", "message");
 * ```
 */
export function createWsRouter<H>(...routes: IWsRoute<H>[]): IWsRouter<H>;
