/**
 * Represents the cache structure like require.cache from nodejs.
 */
export type Cache = { exports: any } | undefined;

/**
 * Dictionary for caching module exports by their paths.
 */
export type CacheDict = Record<string, Cache>;

/**
 * Interface for a router that resolves URLs based on a predefined structure.
 */
export interface IRouter {
  /**
   * Sets router options.
   * @param options - Partial router options.
   * @returns The current router instance.
   */
  setOptions(options: Partial<IRouterOptions>): this;

  /**
   * Resolves a given URL and returns the corresponding route data.
   * @param url - The URL to resolve.
   * @returns The resolved data or an indicator of a not found route.
   */
  resolve(url: string): unknown;
}

/**
 * Router configuration options.
 */
export interface IRouterOptions {
  /** The separator for file paths. */
  pathSeparator: string;

  /** The separator used in URLs. */
  urlSeparator: string;

  /** The fallback URL when no match is found. */
  notFoundUrl: string;

  /** Cache dictionary for storing module exports. */
  cache: CacheDict;

  /** The root folder where routes are defined. */
  folder: string;

  /**
   * Formats a token name based on a filename.
   * @param filename - The filename to format.
   * @param options - Optional router options.
   * @returns The formatted token name.
   */
  formatTokenName(filename: string, options?: IRouterOptions): string;

  /**
   * Determines if a cache entry should be excluded.
   * @param cache - The cache key.
   * @param options - Optional router options.
   * @returns Whether the cache entry is excluded.
   */
  isExcluded(cache: string, options?: IRouterOptions): boolean;

  /**
   * Determines if a cache entry is a wildcard route.
   * @param cache - The cache key.
   * @param options - Optional router options.
   * @returns Whether the cache entry is a wildcard.
   */
  isWildcard(cache: string, options?: IRouterOptions): boolean;
}

/**
 * Represents a resolved route with its token and path.
 */
export interface IResolvedRoute {
  /** The token associated with the resolved route. */
  token: unknown;

  /** The path segments leading to the resolved route. */
  path: string[];
}

/**
 * Constructor for the AthleteRouter.
 */
export interface AthleteRouterConstructor {
  /** Creates a new instance of the router. */
  new (): IRouter;
  (): IRouter;
}

/**
 * The AthleteRouter instance.
 */
export declare const AthleteRouter: AthleteRouterConstructor;
