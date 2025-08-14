const { Router } = require("..");

describe("Router", () => {
  const methods = ["GET", "POST"];
  const createHandler = jest.fn((...args) => ({ calledWith: args }));

  const routes = [
    {
      paths: ["users", ":id"],
      GET: createHandler,
      POST: createHandler,
    },
    {
      paths: ["about"],
      GET: () => "about page",
    },
  ];

  let router;
  beforeEach(() => {
    jest.clearAllMocks();
    router = new Router(methods, routes, { separator: "/", paramSymbol: ":" });
  });

  test("should match route without params", () => {
    const handler = router.match("GET", "/about");
    expect(handler).toBeDefined();
    expect(handler.method).toBe("GET");
    expect(handler.paths).toEqual(["about"]);
    expect(handler.handle()).toBe("about page");
    expect(handler.params).toEqual({});
  });

  test("should match route with params", () => {
    const handler = router.match("GET", "/users/123");
    expect(handler).toBeDefined();
    expect(handler.method).toBe("GET");
    expect(handler.paths).toEqual(["users", ":id"]);
    expect(handler.params).toEqual({ id: "123" });
    handler.handle("testArg");
    expect(createHandler).toHaveBeenCalledWith("testArg");
  });

  test("should match route with multiple methods", () => {
    const getHandler = router.match("GET", "/users/42");
    const postHandler = router.match("POST", "/users/42");

    expect(getHandler).toBeDefined();
    expect(postHandler).toBeDefined();

    expect(getHandler.method).toBe("GET");
    expect(postHandler.method).toBe("POST");
  });

  test("should return undefined for unmatched path", () => {
    const handler = router.match("GET", "/nonexistent");
    expect(handler).toBeUndefined();
  });

  test("should return undefined for unmatched method", () => {
    const handler = router.match("PUT", "/users/1");
    expect(handler).toBeUndefined();
  });

  test("should throw error for duplicate routes", () => {
    expect(() => {
      new Router(methods, [
        { paths: ["test"], GET: () => {} },
        { paths: ["test"], GET: () => {} },
      ]);
    }).toThrow(/Duplicate route detected/);
  });

  test('should treat root "/" as empty segment', () => {
    const rootRoutes = [{ paths: [""], GET: () => "root" }];
    const rootRouter = new Router(["GET"], rootRoutes);
    const handler = rootRouter.match("GET", "/");
    expect(handler).toBeDefined();
    expect(handler.handle()).toBe("root");
  });
});
