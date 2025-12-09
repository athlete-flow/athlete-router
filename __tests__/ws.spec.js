const {
  WSRouter,
  compileWsPattern,
  RegExpPatternBuilder,
} = require("../lib/router");

describe("compileWsPattern", () => {
  test("should compile exact event name", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("chat:message", builder);
    expect(regex.test("chat:message")).toBe(true);
    expect(regex.test("chat:typing")).toBe(false);
  });

  test("should compile event with wildcard", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("chat:*", builder);
    expect(regex.test("chat:message")).toBe(true);
    expect(regex.test("chat:typing")).toBe(true);
    expect(regex.test("user:online")).toBe(false);
  });

  test("should compile wildcard prefix", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("*:join", builder);
    expect(regex.test("room:join")).toBe(true);
    expect(regex.test("chat:join")).toBe(true);
    expect(regex.test("room:leave")).toBe(false);
  });

  test("should compile multiple segments", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("chat:room:message", builder);
    expect(regex.test("chat:room:message")).toBe(true);
    expect(regex.test("chat:message")).toBe(false);
  });

  test("should compile multiple wildcards", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("*:*:message", builder);
    expect(regex.test("chat:room:message")).toBe(true);
    expect(regex.test("user:private:message")).toBe(true);
    expect(regex.test("chat:message")).toBe(false);
  });

  test("should handle single segment", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern("ping", builder);
    expect(regex.test("ping")).toBe(true);
    expect(regex.test("pong")).toBe(false);
  });

  test("should handle pattern starting with colon", () => {
    const builder = new RegExpPatternBuilder();
    const regex = compileWsPattern(":message", builder);
    expect(regex.test(":message")).toBe(true);
    expect(regex.test("message")).toBe(false);
    expect(regex.test("::message")).toBe(false);
  });

  test("should handle nested pattern with leading colon", () => {
    const builder = new RegExpPatternBuilder();
    builder.exact("chat");
    const regex = compileWsPattern(":message", builder);
    expect(regex.test("chat:message")).toBe(true);
    expect(regex.test("chatmessage")).toBe(false);
  });
});

describe("route specificity", () => {
  test("should prefer exact match over wildcard", () => {
    class WildcardRoute {
      pattern = "chat:*";
    }

    class ExactRoute {
      pattern = "chat:message";
    }

    const router = new WSRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:message");
    expect(matched.pattern).toBe("chat:message");
  });

  test("should handle multiple exact segments", () => {
    class WildcardRoute {
      pattern = "chat:*";
    }

    class ExactRoute {
      pattern = "chat:room:message";
    }

    const router = new WSRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:room:message");
    expect(matched.pattern).toBe("chat:room:message");
  });

  test("should calculate specificity correctly", () => {
    class Route1 {
      pattern = "*:*:*";
    }

    class Route2 {
      pattern = "chat:*:*";
    }

    class Route3 {
      pattern = "chat:room:*";
    }

    class Route4 {
      pattern = "chat:room:message";
    }

    const router = new WSRouter(
      new Route1(),
      new Route2(),
      new Route3(),
      new Route4()
    );

    const matched = router.resolve("chat:room:message");
    expect(matched.pattern).toBe("chat:room:message");
  });
});

describe("WSRouter", () => {
  test("should create router with WS methods", () => {
    class ChatRoute {
      pattern = "chat:message";
    }

    const router = new WSRouter(new ChatRoute());

    const matched = router.resolve("chat:message");
    expect(matched).not.toBeNull();
    expect(matched.pattern).toBe("chat:message");
  });

  test("should handle multiple routes", () => {
    class ChatRoute {
      pattern = "chat:message";
    }

    class UserRoute {
      pattern = "user:online";
    }

    const router = new WSRouter(
      new ChatRoute(),
      new UserRoute()
    );

    expect(router.resolve("chat:message").pattern).toBe("chat:message");
    expect(router.resolve("user:online").pattern).toBe("user:online");
  });

  test("should handle wildcard patterns", () => {
    class WildcardRoute {
      pattern = "chat:*";
    }

    const router = new WSRouter(new WildcardRoute());

    expect(router.resolve("chat:message")).not.toBeUndefined();
    expect(router.resolve("chat:typing")).not.toBeUndefined();
    expect(router.resolve("user:online")).toBeUndefined();
  });

  test("should handle nested routes", () => {
    class MessageRoute {
      pattern = ":message";
    }

    class ChatRoute {
      pattern = "chat";
      children = [new MessageRoute()];
    }

    const router = new WSRouter(new ChatRoute());

    const chatMatch = router.resolve("chat");
    expect(chatMatch).not.toBeNull();
    expect(chatMatch.pattern).toBe("chat");

    const messageMatch = router.resolve("chat:message");
    expect(messageMatch).not.toBeNull();
    expect(messageMatch.pattern).toBe(":message");
  });

  test("should select most specific route when multiple match", () => {
    class WildcardRoute {
      pattern = "chat:*";
    }

    class ExactRoute {
      pattern = "chat:message";
    }

    const router = new WSRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:message");
    expect(matched.pattern).toBe("chat:message");
  });

  test("should handle complex patterns", () => {
    class ComplexRoute {
      pattern = "chat:room:*:message";
    }

    const router = new WSRouter(new ComplexRoute());

    expect(router.resolve("chat:room:123:message")).not.toBeUndefined();
    expect(router.resolve("chat:room:456:message")).not.toBeUndefined();
    expect(router.resolve("chat:room:message")).toBeUndefined();
  });

  test("should return undefined for unmatched event", () => {
    class ChatRoute {
      pattern = "chat:message";
    }

    const router = new WSRouter(new ChatRoute());

    expect(router.resolve("user:online")).toBeUndefined();
  });
});
