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

class Router {
  constructor(compilePattern, selectRoute, ...routes) {
    this.#compilePattern = compilePattern;
    this.#selectRoute = selectRoute;
    this.#compiledRoutes = this.#flattenRoutes(routes, null);
    this.#checkDuplicates();
  }

  #compilePattern;
  #selectRoute;
  #compiledRoutes;

  #flattenRoutes(routes, parentBuilder) {
    const result = [];
    for (const route of routes) {
      const builder = new RegExpPatternBuilder();
      if (parentBuilder) builder.concat(parentBuilder);
      const regex = this.#compilePattern(route.pattern, builder);
      result.push({ route, regex });
      if (route.children) result.push(...this.#flattenRoutes(route.children, builder));
    }
    return result;
  }

  #checkDuplicates() {
    const seen = new Map();
    for (const { route, regex } of this.#compiledRoutes) {
      const key = regex.source;
      if (seen.has(key)) {
        const existing = seen.get(key);
        throw new Error(
          `Duplicate route detected: pattern "${route.pattern}" matches the same regex as "${existing.pattern}"`
        );
      }
      seen.set(key, route);
    }
  }

  resolve(path) {
    const matched = [];
    for (const { route, regex } of this.#compiledRoutes) {
      const matchResult = path.match(regex);
      if (matchResult) matched.push(route);
    }
    if (matched.length === 0) return undefined;
    return this.#selectRoute(matched);
  }
}


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
  const pattern = route.pattern;
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
  if (matched.length === 0) return undefined;
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

class HTTPRouter extends Router {
  constructor(...routes) {
    super(compileHttpPattern, selectMostSpecificRoute, ...routes);
  }
}

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
  const pattern = route.pattern;
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
  if (matched.length === 0) return undefined;
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

class WSRouter extends Router {
  constructor(...routes) {
    super(compileWsPattern, selectMostSpecificWsRoute, ...routes);
  }
}

module.exports = {
  Router,
  WSRouter,
  HTTPRouter,
  RegExpPatternBuilder,
  compileHttpPattern,
  selectMostSpecificRoute,
  compileWsPattern,
  selectMostSpecificWsRoute,
};
