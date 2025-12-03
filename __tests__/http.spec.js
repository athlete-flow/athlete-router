const { createHttpRouter, compileHttpPattern, httpMethods, RegExpPatternBuilder } = require("../lib/router");

describe("compileHttpPattern", () => {
  test("should compile exact path", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/users", builder);
    expect(regex.test("/users")).toBe(true);
    expect(regex.test("/users/123")).toBe(false);
  });

  test("should compile path with param", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/users/:id", builder);
    const match = "/users/123".match(regex);
    expect(match).not.toBeNull();
    expect(match.groups.id).toBe("123");
  });

  test("should compile path with multiple params", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/users/:userId/posts/:postId", builder);
    const match = "/users/42/posts/99".match(regex);
    expect(match).not.toBeNull();
    expect(match.groups.userId).toBe("42");
    expect(match.groups.postId).toBe("99");
  });

  test("should compile path with wildcard", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/api/*/details", builder);
    expect(regex.test("/api/users/details")).toBe(true);
    expect(regex.test("/api/posts/details")).toBe(true);
    expect(regex.test("/api/users/posts/details")).toBe(false);
  });

  test("should compile path with deep wildcard", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/files/**", builder);
    expect(regex.test("/files/docs")).toBe(true);
    expect(regex.test("/files/docs/readme.md")).toBe(true);
    expect(regex.test("/files/a/b/c/d/e")).toBe(true);
  });

  test("should handle root path", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/", builder);
    expect(regex.test("/")).toBe(true);
    expect(regex.test("/users")).toBe(false);
  });

  test("should handle mixed segments", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/api/:version/users/:id", builder);
    const match = "/api/v1/users/123".match(regex);
    expect(match).not.toBeNull();
    expect(match.groups.version).toBe("v1");
    expect(match.groups.id).toBe("123");
  });

  test("should not match wildcard with query params", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/api/*/details", builder);
    expect(regex.test("/api/users/details")).toBe(true);
    expect(regex.test("/api/users?admin=true/details")).toBe(false);
  });

  test("should not match wildcard with hash", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/api/*", builder);
    expect(regex.test("/api/users")).toBe(true);
    expect(regex.test("/api/users#section")).toBe(false);
  });

  test("should handle deep wildcard without matching query params", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/files/**", builder);
    expect(regex.test("/files/docs/readme.md")).toBe(true);
    expect(regex.test("/files/docs")).toBe(true);
  });

  test("should not match param with query params", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/users/:id", builder);
    const match = "/users/123".match(regex);
    expect(match).not.toBeNull();
    expect(match.groups.id).toBe("123");
    expect(regex.test("/users/123?admin=true")).toBe(false);
  });

  test("should not match param with hash", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileHttpPattern("/users/:id", builder);
    expect(regex.test("/users/123")).toBe(true);
    expect(regex.test("/users/123#section")).toBe(false);
  });
});

describe("route specificity", () => {
  test("should prefer static segments over params", () => {
    const paramHandler = jest.fn(() => "param");
    const staticHandler = jest.fn(() => "static");

    class ParamRoute {
      pattern = "users/:id";
      get = paramHandler;
    }

    class StaticRoute {
      pattern = "users/admin";
      get = staticHandler;
    }

    const router = createHttpRouter(
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/users/admin", "get");
    expect(matched.getHandler("get")).toBe(staticHandler);
  });

  test("should prefer params over wildcards", () => {
    const wildcardHandler = jest.fn(() => "wildcard");
    const paramHandler = jest.fn(() => "param");

    class WildcardRoute {
      pattern = "api/*";
      get = wildcardHandler;
    }

    class ParamRoute {
      pattern = "api/:resource";
      get = paramHandler;
    }

    const router = createHttpRouter(
      new WildcardRoute(),
      new ParamRoute()
    );

    const matched = router.resolve("/api/users", "get");
    expect(matched.getHandler("get")).toBe(paramHandler);
  });

  test("should prefer wildcards over deep wildcards", () => {
    const deepHandler = jest.fn(() => "deep");
    const wildcardHandler = jest.fn(() => "wildcard");

    class DeepWildcardRoute {
      pattern = "files/**";
      get = deepHandler;
    }

    class WildcardRoute {
      pattern = "files/*";
      get = wildcardHandler;
    }

    const router = createHttpRouter(
      new DeepWildcardRoute(),
      new WildcardRoute()
    );

    const matched = router.resolve("/files/doc", "get");
    expect(matched.getHandler("get")).toBe(wildcardHandler);
  });

  test("should handle multiple static segments", () => {
    const paramHandler = jest.fn(() => "param");
    const staticHandler = jest.fn(() => "static");

    class ParamRoute {
      pattern = "api/:version/users";
      get = paramHandler;
    }

    class StaticRoute {
      pattern = "api/v1/users";
      get = staticHandler;
    }

    const router = createHttpRouter(
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/api/v1/users", "get");
    expect(matched.getHandler("get")).toBe(staticHandler);
  });

  test("should calculate specificity correctly", () => {
    const deepHandler = jest.fn(() => "deep");
    const wildcardHandler = jest.fn(() => "wildcard");
    const paramHandler = jest.fn(() => "param");
    const staticHandler = jest.fn(() => "static");

    class DeepRoute {
      pattern = "a/**";
      get = deepHandler;
    }

    class WildcardRoute {
      pattern = "a/*";
      get = wildcardHandler;
    }

    class ParamRoute {
      pattern = "a/:id";
      get = paramHandler;
    }

    class StaticRoute {
      pattern = "a/b";
      get = staticHandler;
    }

    const router = createHttpRouter(
      new DeepRoute(),
      new WildcardRoute(),
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/a/b", "get");
    expect(matched.getHandler("get")).toBe(staticHandler);
  });

  test("should prefer longer routes when type is same", () => {
    const shortHandler = jest.fn(() => "short");
    const longHandler = jest.fn(() => "long");

    class ShortRoute {
      pattern = "api/:version";
      get = shortHandler;
    }

    class LongRoute {
      pattern = "api/:version/users";
      get = longHandler;
    }

    const router = createHttpRouter(
      new ShortRoute(),
      new LongRoute()
    );

    const matched = router.resolve("/api/v1/users", "get");
    expect(matched.getHandler("get")).toBe(longHandler);
  });
});

describe("createHttpRouter", () => {
  test("should create router with HTTP methods", () => {
    const handler = jest.fn();

    class UsersRoute {
      pattern = "users";
      get = handler;
    }

    const router = createHttpRouter(new UsersRoute());

    const matched = router.resolve("/users", "get");
    expect(matched).not.toBeNull();
    expect(matched.getHandler("get")).toBe(handler);
  });

  test("should handle multiple routes", () => {
    const usersHandler = jest.fn();
    const postsHandler = jest.fn();

    class UsersRoute {
      pattern = "users";
      get = usersHandler;
    }

    class PostsRoute {
      pattern = "posts";
      get = postsHandler;
    }

    const router = createHttpRouter(new UsersRoute(), new PostsRoute());

    expect(router.resolve("/users", "get").getHandler("get")).toBe(usersHandler);
    expect(router.resolve("/posts", "get").getHandler("get")).toBe(postsHandler);
  });

  test("should extract params", () => {
    const handler = jest.fn();

    class UsersRoute {
      pattern = "users/:id";
      get = handler;
    }

    const router = createHttpRouter(new UsersRoute());

    const matched = router.resolve("/users/123", "get");
    expect(matched.getParams()).toEqual({ id: "123" });
  });

  test("should handle nested routes", () => {
    const apiHandler = jest.fn();
    const usersHandler = jest.fn();

    class UsersRoute {
      pattern = "users";
      get = usersHandler;
    }

    class ApiRoute {
      pattern = "api";
      get = apiHandler;
      children = [new UsersRoute()];
    }

    const router = createHttpRouter(new ApiRoute());

    const apiMatch = router.resolve("/api", "get");
    expect(apiMatch).not.toBeNull();
    expect(apiMatch.getHandler("get")).toBe(apiHandler);

    const usersMatch = router.resolve("/api/users", "get");
    expect(usersMatch).not.toBeNull();
    expect(usersMatch.getHandler("get")).toBe(usersHandler);
  });

  test("should select most specific route when multiple match", () => {
    const wildcardHandler = jest.fn();
    const paramHandler = jest.fn();
    const staticHandler = jest.fn();

    class WildcardRoute {
      pattern = "users/*";
      get = wildcardHandler;
    }

    class ParamRoute {
      pattern = "users/:id";
      get = paramHandler;
    }

    class StaticRoute {
      pattern = "users/admin";
      get = staticHandler;
    }

    const router = createHttpRouter(
      new WildcardRoute(),
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/users/admin", "get");
    expect(matched.getHandler("get")).toBe(staticHandler);
  });

  test("should support all HTTP methods", () => {
    const handlers = {};
    httpMethods.forEach((method) => {
      handlers[method] = jest.fn();
    });

    class ApiRoute {
      pattern = "api";
      get = handlers.get;
      post = handlers.post;
      put = handlers.put;
      delete = handlers.delete;
      patch = handlers.patch;
      head = handlers.head;
      options = handlers.options;
    }

    const router = createHttpRouter(new ApiRoute());

    httpMethods.forEach((method) => {
      const matched = router.resolve("/api", method);
      expect(matched).not.toBeNull();
      expect(matched.getHandler(method)).toBe(handlers[method]);
    });
  });

  test("should handle wildcards correctly", () => {
    const handler = jest.fn();

    class WildcardRoute {
      pattern = "api/*/details";
      get = handler;
    }

    const router = createHttpRouter(new WildcardRoute());

    expect(router.resolve("/api/users/details", "get")).not.toBeNull();
    expect(router.resolve("/api/posts/details", "get")).not.toBeNull();
    expect(router.resolve("/api/users/posts/details", "get")).toBeNull();
  });

  test("should handle deep wildcards correctly", () => {
    const handler = jest.fn();

    class DeepWildcardRoute {
      pattern = "files/**";
      get = handler;
    }

    const router = createHttpRouter(new DeepWildcardRoute());

    expect(router.resolve("/files/docs", "get")).not.toBeNull();
    expect(router.resolve("/files/docs/readme.md", "get")).not.toBeNull();
    expect(router.resolve("/files/a/b/c/d", "get")).not.toBeNull();
  });

  test("should return null for unmatched route", () => {
    class UsersRoute {
      pattern = "users";
      get = jest.fn();
    }

    const router = createHttpRouter(new UsersRoute());

    expect(router.resolve("/posts", "get")).toBeNull();
  });

  test("should return null for unmatched method", () => {
    class UsersRoute {
      pattern = "users";
      get = jest.fn();
    }

    const router = createHttpRouter(new UsersRoute());

    expect(router.resolve("/users", "post")).toBeNull();
  });
});

describe("httpMethods", () => {
  test("should contain standard HTTP methods", () => {
    expect(httpMethods).toContain("get");
    expect(httpMethods).toContain("post");
    expect(httpMethods).toContain("put");
    expect(httpMethods).toContain("delete");
    expect(httpMethods).toContain("patch");
    expect(httpMethods).toContain("head");
    expect(httpMethods).toContain("options");
  });
});
