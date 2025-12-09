const {
  Router,
  RegExpPatternBuilder,
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

describe("Router", () => {
  const compilePattern = (pattern, builder) => {
    builder.exact(pattern);
    return builder.build();
  };

  const selectFirst = (matched) => matched[0];

  test("should resolve matching route", () => {
    const router = new Router(
      compilePattern,
      selectFirst,
      { pattern: "test" }
    );

    const matched = router.resolve("test");
    expect(matched).not.toBeNull();
    expect(matched.pattern).toBe("test");
  });

  test("should return undefined for non-matching route", () => {
    const router = new Router(
      compilePattern,
      selectFirst,
      { pattern: "test" }
    );

    const matched = router.resolve("other");
    expect(matched).toBeUndefined();
  });

  test("should handle nested routes", () => {
    const compileNested = (pattern, builder) => {
      builder.exact(pattern);
      return builder.build();
    };

    const router = new Router(
      compileNested,
      selectFirst,
      {
        pattern: "api",
        children: [
          { pattern: "users" }
        ]
      }
    );

    const parentMatch = router.resolve("api");
    expect(parentMatch).not.toBeNull();
    expect(parentMatch.pattern).toBe("api");

    const childMatch = router.resolve("apiusers");
    expect(childMatch).not.toBeNull();
    expect(childMatch.pattern).toBe("users");
  });

  test("should add routes even without handlers", () => {
    const router = new Router(
      compilePattern,
      selectFirst,
      {
        pattern: "api",
        children: [
          { pattern: "users" }
        ]
      }
    );

    expect(router.resolve("api")).not.toBeNull();
    expect(router.resolve("api").pattern).toBe("api");
    expect(router.resolve("apiusers")).not.toBeNull();
    expect(router.resolve("apiusers").pattern).toBe("users");
  });

  test("should use selectRoute strategy", () => {
    const selectLast = (matched) => matched[matched.length - 1];

    const router = new Router(
      (pattern, builder) => {
        builder.exact(pattern);
        return builder.build();
      },
      selectLast,
      { pattern: "first" },
      { pattern: "second" }
    );

    const matched = router.resolve("first");
    expect(matched).not.toBeNull();
    expect(matched.pattern).toBe("first");

    const matched2 = router.resolve("second");
    expect(matched2).not.toBeNull();
    expect(matched2.pattern).toBe("second");
  });

  test("should throw error on duplicate routes", () => {
    expect(() => {
      new Router(
        compilePattern,
        selectFirst,
        { pattern: "test" },
        { pattern: "test" }
      );
    }).toThrow(/Duplicate route detected/);
  });

  test("should throw error on duplicate nested routes", () => {
    expect(() => {
      new Router(
        compilePattern,
        selectFirst,
        {
          pattern: "api",
          children: [
            { pattern: "users" },
            { pattern: "users" }
          ]
        }
      );
    }).toThrow(/Duplicate route detected/);
  });
});
