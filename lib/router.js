class RegExpPatternBuilder {
  constructor() {
    this.parts = [];
  }

  exact(str) {
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    this.parts.push(escaped);
    return this;
  }

  param(name, constraint) {
    const pattern = constraint || "[^/?#]+";
    this.parts.push(`(?<${name}>${pattern})`);
    return this;
  }

  wildcard() {
    this.parts.push(`[^/?#]+`);
    return this;
  }

  deepWildcard() {
    this.parts.push(`.+?`);
    return this;
  }

  concat(other) {
    this.parts.push(...other.parts);
    return this;
  }

  build() {
    const pattern = "^" + this.parts.join("") + "$";
    return new RegExp(pattern);
  }
}

class MatchedRoute {
  #route;
  #matchResult;

  constructor(route, matchResult) {
    this.#route = route;
    this.#matchResult = matchResult;
  }

  getHandler(method) {
    return this.#route[method] || null;
  }

  getParams() {
    return this.#matchResult.groups || {};
  }

  getRoute() {
    return this.#route;
  }
}

class Router {
  constructor(methods, compilePattern, selectRoute, ...routes) {
    this.#methods = methods;
    this.#compilePattern = compilePattern;
    this.#selectRoute = selectRoute;
    this.#compiledRoutes = this.#flattenRoutes(routes, null);
    this.#checkDuplicates(this.#compiledRoutes);
  }

  #methods;
  #compilePattern;
  #selectRoute;
  #compiledRoutes;

  #hasHandlers(route) {
    return this.#methods.some((method) => typeof route[method] === "function");
  }

  #getHandlerMethods(route) {
    return this.#methods.filter((method) => typeof route[method] === "function");
  }

  #checkDuplicates(compiledRoutes) {
    const seen = new Map();
    for (const { route, regex } of compiledRoutes) {
      const methods = this.#getHandlerMethods(route);
      for (const method of methods) {
        const key = `${method}:${regex.source}`;
        if (seen.has(key)) throw new Error(`Duplicate route detected: [${method}] ${route.pattern}`);
        seen.set(key, true);
      }
    }
  }

  #flattenRoutes(routes, parentBuilder) {
    const result = [];
    for (const route of routes) {
      const builder = new RegExpPatternBuilder();
      if (parentBuilder) builder.concat(parentBuilder);
      const regex = this.#compilePattern(route.pattern, builder);
      if (this.#hasHandlers(route)) result.push({ route, regex });
      if (route.children) result.push(...this.#flattenRoutes(route.children, builder));
    }
    return result;
  }

  resolve(path, method) {
    const matched = [];
    for (const { route, regex } of this.#compiledRoutes) {
      const matchResult = path.match(regex);
      if (matchResult && route[method]) matched.push(new MatchedRoute(route, matchResult));
    }
    if (matched.length === 0) return null;
    return this.#selectRoute(matched);
  }
}

const httpMethods = ["get", "post", "put", "delete", "patch", "head", "options"];

function compileHttpPattern(pattern, builder) {
  const segments = pattern.split("/").filter(Boolean);
  builder.exact("/");
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.startsWith(":")) builder.param(segment.slice(1));
    else if (segment === "*") builder.wildcard();
    else if (segment === "**") {
      builder.deepWildcard();
      break;
    } else builder.exact(segment);
    if (i < segments.length - 1 && segment !== "**") builder.exact("/");
  }
  return builder.build();
}

function calculateRouteSpecificity(route) {
  const pattern = route.getRoute().pattern;
  const segments = pattern.split("/").filter(Boolean);
  let score = segments.length * 10000;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const positionWeight = (segments.length - i) * 1000;
    if (segment === "**") score += 1 + positionWeight;
    else if (segment === "*") score += 10 + positionWeight;
    else if (segment.startsWith(":")) score += 100 + positionWeight;
    else score += 1000 + positionWeight;
  }
  return score;
}

function selectMostSpecificRoute(matched) {
  if (matched.length === 0) return null;
  let best = matched[0];
  let bestScore = calculateRouteSpecificity(best);
  for (let i = 1; i < matched.length; i++) {
    const score = calculateRouteSpecificity(matched[i]);
    if (score > bestScore) {
      bestScore = score;
      best = matched[i];
    }
  }
  return best;
}

function createHttpRouter(...routes) {
  return new Router(httpMethods, compileHttpPattern, selectMostSpecificRoute, ...routes);
}

const wsMethods = ["connect", "disconnect", "message"];

function compileWsPattern(pattern, builder) {
  const startsWithColon = pattern.startsWith(":");
  const segments = pattern.split(":").filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    if (i === 0 && startsWithColon) builder.exact(":");
    const segment = segments[i];
    if (segment === "*") builder.wildcard();
    else builder.exact(segment);
    if (i < segments.length - 1) builder.exact(":");
  }
  return builder.build();
}

function calculateWsSpecificity(route) {
  const pattern = route.getRoute().pattern;
  const segments = pattern.split(":").filter(Boolean);
  let score = segments.length * 10000;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const positionWeight = (segments.length - i) * 1000;
    if (segment === "*") score += 10 + positionWeight;
    else score += 1000 + positionWeight;
  }
  return score;
}

function selectMostSpecificWsRoute(matched) {
  if (matched.length === 0) return null;
  let best = matched[0];
  let bestScore = calculateWsSpecificity(best);
  for (let i = 1; i < matched.length; i++) {
    const score = calculateWsSpecificity(matched[i]);
    if (score > bestScore) {
      bestScore = score;
      best = matched[i];
    }
  }
  return best;
}

function createWsRouter(...routes) {
  return new Router(wsMethods, compileWsPattern, selectMostSpecificWsRoute, ...routes);
}

module.exports = {
  Router,
  RegExpPatternBuilder,
  MatchedRoute,
  httpMethods,
  compileHttpPattern,
  selectMostSpecificRoute,
  createHttpRouter,
  wsMethods,
  compileWsPattern,
  selectMostSpecificWsRoute,
  createWsRouter,
};
