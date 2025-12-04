const {
  Router,
  RegExpPatternBuilder,
  MatchedRoute,
} = require("../lib/router");

describe("RegExpPatternBuilder", () => {
  test("exact() should escape regex special characters", () => {
    const builder = new RegExpPatternBuilder();
    const regex = builder.exact("/api/v1").build();
    expect(regex.test("/api/v1")).toBe(true);
    expect(regex.test("/api/v2")).toBe(false);
  });

  test("param() should create named capture group", () => {
    const builder = new RegExpPatternBuilder();
    const regex = builder.exact("/users/").param("id").build();
    const match = "/users/123".match(regex);
    expect(match).not.toBeNull();
    expect(match.groups.id).toBe("123");
  });

  test("param() with constraint should use custom pattern", () => {
    const builder = new RegExpPatternBuilder();
    const regex = builder.exact("/users/").param("id", "\\d+").build();
    expect(regex.test("/users/123")).toBe(true);
    expect(regex.test("/users/abc")).toBe(false);
  });

  test("wildcard() should match single segment", () => {
    const builder = new RegExpPatternBuilder();
    const regex = builder.exact("/api/").wildcard().exact("/details").build();
    expect(regex.test("/api/users/details")).toBe(true);
    expect(regex.test("/api/users/posts/details")).toBe(false);
  });

  test("deepWildcard() should match multiple segments", () => {
    const builder = new RegExpPatternBuilder();
    const regex = builder.exact("/api/").deepWildcard().build();
    expect(regex.test("/api/users")).toBe(true);
    expect(regex.test("/api/users/posts/comments")).toBe(true);
  });

  test("concat() should combine builders", () => {
    const builder1 = new RegExpPatternBuilder();
    builder1.exact("/api");

    const builder2 = new RegExpPatternBuilder();
    builder2.exact("/users");

    builder2.concat(builder1);
    const regex = builder2.build();
    expect(regex.test("/users/api")).toBe(true);
  });
});

describe("MatchedRoute", () => {
  const route = {
    pattern: "/users/:id",
    get: jest.fn(),
    post: jest.fn(),
  };

  const matchResult = "/users/123".match(/^\/users\/(?<id>[^/\s]+)$/);

  test("getHandler() should return handler for method", () => {
    const matchedGet = new MatchedRoute(route, matchResult, "get");
    matchedGet.getHandler()();
    expect(route.get).toHaveBeenCalled();
    const matchedPost = new MatchedRoute(route, matchResult, "post");
    matchedPost.getHandler()();
    expect(route.post).toHaveBeenCalled();
  });

  test("getHandler() should return null for missing method", () => {
    const matched = new MatchedRoute(route, matchResult, "delete");
    expect(matched.getHandler()).toBeNull();
  });

  test("getParams() should return captured groups", () => {
    const matched = new MatchedRoute(route, matchResult, "get");
    expect(matched.getParams()).toEqual({ id: "123" });
  });

  test("getRoute() should return original route", () => {
    const matched = new MatchedRoute(route, matchResult, "get");
    expect(matched.getRoute()).toBe(route);
  });
});

describe("Router", () => {
  const methods = ["get", "post"];
  const compilePattern = (pattern, builder) => {
    builder.exact(pattern);
    return builder.build();
  };

  const selectFirst = (matched) => matched[0];

  test("should resolve matching route", () => {
    const handler = jest.fn();
    const router = new Router(
      methods,
      compilePattern,
      selectFirst,
      { pattern: "test", get: handler }
    );

    const matched = router.resolve("test", "get");
    expect(matched).not.toBeNull();
    matched.getHandler()();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("should return null for non-matching route", () => {
    const router = new Router(
      methods,
      compilePattern,
      selectFirst,
      { pattern: "test", get: jest.fn() }
    );

    const matched = router.resolve("other", "get");
    expect(matched).toBeNull();
  });

  test("should return null for non-matching method", () => {
    const router = new Router(
      methods,
      compilePattern,
      selectFirst,
      { pattern: "test", get: jest.fn() }
    );

    const matched = router.resolve("test", "post");
    expect(matched).toBeNull();
  });

  test("should handle nested routes", () => {
    const parentHandler = jest.fn(() => "parent");
    const childHandler = jest.fn(() => "child");

    const compileNested = (pattern, builder) => {
      builder.exact(pattern);
      return builder.build();
    };

    const router = new Router(
      methods,
      compileNested,
      selectFirst,
      {
        pattern: "api",
        get: parentHandler,
        children: [
          { pattern: "users", get: childHandler }
        ]
      }
    );

    const parentMatch = router.resolve("api", "get");
    expect(parentMatch).not.toBeNull();
    expect(parentMatch.getHandler()()).toBe("parent");

    const childMatch = router.resolve("apiusers", "get");
    expect(childMatch).not.toBeNull();
    expect(childMatch.getHandler()()).toBe("child");
  });

  test("should not add routes without handlers", () => {
    const childHandler = jest.fn();

    const router = new Router(
      methods,
      compilePattern,
      selectFirst,
      {
        pattern: "api",
        children: [
          { pattern: "users", get: childHandler }
        ]
      }
    );

    expect(router.resolve("api", "get")).toBeNull();
    expect(router.resolve("apiusers", "get")).not.toBeNull();
    const h = router.resolve("apiusers", "get").getHandler();
    h();
    expect(childHandler).toHaveBeenCalled();
  });

  test("should use selectRoute strategy", () => {
    const handler1 = jest.fn(() => "first");
    const handler2 = jest.fn(() => "second");

    const selectLast = (matched) => matched[matched.length - 1];

    const router = new Router(
      methods,
      (pattern, builder) => {
        builder.exact(pattern);
        return builder.build();
      },
      selectLast,
      { pattern: "first", get: handler1 },
      { pattern: "second", get: handler2 }
    );

    const matched = router.resolve("first", "get");
    expect(matched).not.toBeNull();
    expect(matched.getHandler()()).toBe("first");

    const matched2 = router.resolve("second", "get");
    expect(matched2).not.toBeNull();
    expect(matched2.getHandler()()).toBe("second");
  });

  test("should throw error for duplicate routes", () => {
    expect(() => {
      new Router(
        methods,
        compilePattern,
        selectFirst,
        { pattern: "test", get: jest.fn() },
        { pattern: "test", get: jest.fn() }
      );
    }).toThrow(/Duplicate route detected/);
  });
});
