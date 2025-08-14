const defaultOptions = {
  separator: "/",
  paramSymbol: ":",
};

class Router {
  constructor(methods, routes, options) {
    this.#options = { ...defaultOptions, ...options };
    this.#handlers = this.#initHandlers(methods, routes);
  }

  #handlers;
  #options;

  #isParam(candidate) {
    return candidate.startsWith(this.#options.paramSymbol);
  }

  #sanitizeParam(param) {
    const symbolLength = this.#options.paramSymbol.length;
    return param.substring(symbolLength);
  }

  #assertDuplicateRoute(method, paths, handlers) {
    for (const candidate of handlers) {
      if (candidate.method === method && candidate.paths.join("/") === paths.join("/"))
        throw new Error(`Duplicate route detected: [ ${method} / ${paths.join(this.#options.separator)} ]`);
    }
  }

  #initHandlers(methods, routes) {
    const handlers = [];
    for (const route of routes) {
      for (const method of methods) {
        const handler = route[method];
        if (typeof handler !== "function") continue;
        this.#assertDuplicateRoute(method, route.paths, handlers);
        handlers.push({ route, method, paths: route.paths, handle: handler.bind(route), params: {} });
      }
    }
    return handlers;
  }

  #isMatchSegments(urlSegments, pathname) {
    if (pathname.length !== urlSegments.length) return false;
    for (let i = 0; i < urlSegments.length; i++) {
      const routeSegment = pathname[i];
      const urlSegment = urlSegments[i];
      if (this.#isParam(routeSegment)) continue;
      if (routeSegment !== urlSegment) return false;
    }
    return true;
  }

  #parseParams(urlSegments, paths) {
    const params = {};
    for (let i = 0; i < urlSegments.length; i++) {
      const routeSegment = paths[i];
      const urlSegment = urlSegments[i];
      if (this.#isParam(routeSegment)) params[this.#sanitizeParam(routeSegment)] = urlSegment;
    }
    return params;
  }

  match(method, path) {
    const urlSegments = path === this.#options.separator ? [""] : path.split(this.#options.separator).filter(Boolean);
    for (const handle of this.#handlers) {
      if (handle.method !== method) continue;
      if (this.#isMatchSegments(urlSegments, handle.paths)) {
        handle.params = this.#parseParams(urlSegments, handle.paths);
        return handle;
      }
    }
  }
}

module.exports = { Router };
