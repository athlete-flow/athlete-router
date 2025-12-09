/**
 * Route definition with pattern and method handlers.
 * @template P - Pattern type (usually string)
 */
export type IBaseRoute<P> = {
  readonly pattern: P;
  readonly children?: IBaseRoute<P>[];
};

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
 */
export type SelectStrategy<P> = (matched: IBaseRoute<P>[]) => IBaseRoute<P>;

/** Internal representation of a compiled route */
export type CompiledRoute<P> = {
  route: IBaseRoute<P>;
  regex: RegExp;
};

/**
 * Core router class supporting custom protocols and selection strategies.
 * @template R - Route type extending IBaseRoute
 */
export class Router<R extends IBaseRoute> {
  /**
   * Creates a new router instance.
   * @param compilePattern - Function to compile patterns into RegExp
   * @param selectRoute - Strategy for selecting between multiple matches
   * @param routes - Route definitions
   * @throws {Error} If duplicate routes are detected
   */
  constructor(
    compilePattern: CompilePattern<R["pattern"]>,
    selectRoute: SelectStrategy<R["pattern"]>,
    ...routes: R[]
  );
  /**
   * Resolves a path to a matched route.
   * @param path - The path to match
   * @returns The matched route or undefined if no match found
   */
  resolve(path: string): R | undefined;
}

/**
 * HTTP router class with built-in pattern compilation and specificity selection.
 * @template R - Route type extending IBaseRoute<string>
 */
export class HTTPRouter<R extends IBaseRoute<string> = IBaseRoute<string>> extends Router<R> {
  /**
   * Creates an HTTP router instance.
   * @param routes - Route definitions
   * @throws {Error} If duplicate routes are detected
   */
  constructor(...routes: R[]);
}

/**
 * WebSocket router class with built-in event pattern compilation.
 * @template R - Route type extending IBaseRoute<string>
 */
export class WSRouter<R extends IBaseRoute<string> = IBaseRoute<string>> extends Router<R> {
  /**
   * Creates a WebSocket router instance.
   * @param routes - Route definitions
   * @throws {Error} If duplicate routes are detected
   */
  constructor(...routes: R[]);
}
