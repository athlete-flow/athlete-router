const { HTTPRouter, compileHttpPattern, RegExpPatternBuilder } = require("../lib/router");

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
    class ParamRoute {
      pattern = "users/:id";
    }

    class StaticRoute {
      pattern = "users/admin";
    }

    const router = new HTTPRouter(
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/users/admin");
    expect(matched.pattern).toBe("users/admin");
  });

  test("should prefer params over wildcards", () => {
    class WildcardRoute {
      pattern = "api/*";
    }

    class ParamRoute {
      pattern = "api/:resource";
    }

    const router = new HTTPRouter(
      new WildcardRoute(),
      new ParamRoute()
    );

    const matched = router.resolve("/api/users");
    expect(matched.pattern).toBe("api/:resource");
  });

  test("should prefer wildcards over deep wildcards", () => {
    class DeepWildcardRoute {
      pattern = "files/**";
    }

    class WildcardRoute {
      pattern = "files/*";
    }

    const router = new HTTPRouter(
      new DeepWildcardRoute(),
      new WildcardRoute()
    );

    const matched = router.resolve("/files/doc");
    expect(matched.pattern).toBe("files/*");
  });

  test("should handle multiple static segments", () => {
    class ParamRoute {
      pattern = "api/:version/users";
    }

    class StaticRoute {
      pattern = "api/v1/users";
    }

    const router = new HTTPRouter(
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/api/v1/users");
    expect(matched.pattern).toBe("api/v1/users");
  });

  test("should calculate specificity correctly", () => {
    class DeepRoute {
      pattern = "a/**";
    }

    class WildcardRoute {
      pattern = "a/*";
    }

    class ParamRoute {
      pattern = "a/:id";
    }

    class StaticRoute {
      pattern = "a/b";
    }

    const router = new HTTPRouter(
      new DeepRoute(),
      new WildcardRoute(),
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/a/b");
    expect(matched.pattern).toBe("a/b");
  });

  test("should prefer longer routes when type is same", () => {
    class ShortRoute {
      pattern = "api/:version";
    }

    class LongRoute {
      pattern = "api/:version/users";
    }

    const router = new HTTPRouter(
      new ShortRoute(),
      new LongRoute()
    );

    const matched = router.resolve("/api/v1/users");
    expect(matched.pattern).toBe("api/:version/users");
  });
});

describe("HTTPRouter", () => {
  test("should create router and resolve routes", () => {
    class UsersRoute {
      pattern = "users";
    }

    const router = new HTTPRouter(new UsersRoute());

    const matched = router.resolve("/users");
    expect(matched).not.toBeNull();
    expect(matched.pattern).toBe("users");
  });

  test("should handle multiple routes", () => {
    class UsersRoute {
      pattern = "users";
    }

    class PostsRoute {
      pattern = "posts";
    }

    const router = new HTTPRouter(new UsersRoute(), new PostsRoute());

    const usersMatch = router.resolve("/users");
    expect(usersMatch.pattern).toBe("users");

    const postsMatch = router.resolve("/posts");
    expect(postsMatch.pattern).toBe("posts");
  });

  test("should handle nested routes", () => {
    class UsersRoute {
      pattern = "users";
    }

    class ApiRoute {
      pattern = "api";
      children = [new UsersRoute()];
    }

    const router = new HTTPRouter(new ApiRoute());

    const apiMatch = router.resolve("/api");
    expect(apiMatch).not.toBeNull();
    expect(apiMatch.pattern).toBe("api");

    const usersMatch = router.resolve("/api/users");
    expect(usersMatch).not.toBeNull();
    expect(usersMatch.pattern).toBe("users");
  });

  test("should select most specific route when multiple match", () => {
    class WildcardRoute {
      pattern = "users/*";
    }

    class ParamRoute {
      pattern = "users/:id";
    }

    class StaticRoute {
      pattern = "users/admin";
    }

    const router = new HTTPRouter(
      new WildcardRoute(),
      new ParamRoute(),
      new StaticRoute()
    );

    const matched = router.resolve("/users/admin");
    expect(matched.pattern).toBe("users/admin");
  });

  test("should handle wildcards correctly", () => {
    class WildcardRoute {
      pattern = "api/*/details";
    }

    const router = new HTTPRouter(new WildcardRoute());

    expect(router.resolve("/api/users/details")).not.toBeUndefined();
    expect(router.resolve("/api/posts/details")).not.toBeUndefined();
    expect(router.resolve("/api/users/posts/details")).toBeUndefined();
  });

  test("should handle deep wildcards correctly", () => {
    class DeepWildcardRoute {
      pattern = "files/**";
    }

    const router = new HTTPRouter(new DeepWildcardRoute());

    expect(router.resolve("/files/docs")).not.toBeUndefined();
    expect(router.resolve("/files/docs/readme.md")).not.toBeUndefined();
    expect(router.resolve("/files/a/b/c/d")).not.toBeUndefined();
  });

  test("should return undefined for unmatched route", () => {
    class UsersRoute {
      pattern = "users";
    }

    const router = new HTTPRouter(new UsersRoute());

    expect(router.resolve("/posts")).toBeUndefined();
  });
});
