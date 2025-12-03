const {
  createWsRouter,
  compileWsPattern,
  wsMethods,
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
    const wildcardHandler = jest.fn();
    const exactHandler = jest.fn();

    class WildcardRoute {
      pattern = "chat:*";
      message = wildcardHandler;
    }

    class ExactRoute {
      pattern = "chat:message";
      message = exactHandler;
    }

    const router = createWsRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:message", "message");
    expect(matched.getHandler("message")).toBe(exactHandler);
  });

  test("should handle multiple exact segments", () => {
    const wildcardHandler = jest.fn();
    const exactHandler = jest.fn();

    class WildcardRoute {
      pattern = "chat:*";
      message = wildcardHandler;
    }

    class ExactRoute {
      pattern = "chat:room:message";
      message = exactHandler;
    }

    const router = createWsRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:room:message", "message");
    expect(matched.getHandler("message")).toBe(exactHandler);
  });

  test("should calculate specificity correctly", () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handler3 = jest.fn();
    const handler4 = jest.fn();

    class Route1 {
      pattern = "*:*:*";
      message = handler1;
    }

    class Route2 {
      pattern = "chat:*:*";
      message = handler2;
    }

    class Route3 {
      pattern = "chat:room:*";
      message = handler3;
    }

    class Route4 {
      pattern = "chat:room:message";
      message = handler4;
    }

    const router = createWsRouter(
      new Route1(),
      new Route2(),
      new Route3(),
      new Route4()
    );

    const matched = router.resolve("chat:room:message", "message");
    expect(matched.getHandler("message")).toBe(handler4);
  });
});

describe("createWsRouter", () => {
  test("should create router with WS methods", () => {
    const handler = jest.fn();

    class ChatRoute {
      pattern = "chat:message";
      message = handler;
    }

    const router = createWsRouter(new ChatRoute());

    const matched = router.resolve("chat:message", "message");
    expect(matched).not.toBeNull();
    expect(matched.getHandler("message")).toBe(handler);
  });

  test("should handle multiple routes", () => {
    const chatHandler = jest.fn();
    const userHandler = jest.fn();

    class ChatRoute {
      pattern = "chat:message";
      message = chatHandler;
    }

    class UserRoute {
      pattern = "user:online";
      message = userHandler;
    }

    const router = createWsRouter(
      new ChatRoute(),
      new UserRoute()
    );

    expect(router.resolve("chat:message", "message").getHandler("message")).toBe(chatHandler);
    expect(router.resolve("user:online", "message").getHandler("message")).toBe(userHandler);
  });

  test("should handle wildcard patterns", () => {
    const handler = jest.fn();

    class WildcardRoute {
      pattern = "chat:*";
      message = handler;
    }

    const router = createWsRouter(new WildcardRoute());

    expect(router.resolve("chat:message", "message")).not.toBeNull();
    expect(router.resolve("chat:typing", "message")).not.toBeNull();
    expect(router.resolve("user:online", "message")).toBeNull();
  });

  test("should handle nested routes", () => {
    const chatHandler = jest.fn();
    const messageHandler = jest.fn();

    class MessageRoute {
      pattern = ":message";
      message = messageHandler;
    }

    class ChatRoute {
      pattern = "chat";
      message = chatHandler;
      children = [new MessageRoute()];
    }

    const router = createWsRouter(new ChatRoute());

    const chatMatch = router.resolve("chat", "message");
    expect(chatMatch).not.toBeNull();
    expect(chatMatch.getHandler("message")).toBe(chatHandler);

    const messageMatch = router.resolve("chat:message", "message");
    expect(messageMatch).not.toBeNull();
    expect(messageMatch.getHandler("message")).toBe(messageHandler);
  });

  test("should select most specific route when multiple match", () => {
    const wildcardHandler = jest.fn();
    const exactHandler = jest.fn();

    class WildcardRoute {
      pattern = "chat:*";
      message = wildcardHandler;
    }

    class ExactRoute {
      pattern = "chat:message";
      message = exactHandler;
    }

    const router = createWsRouter(
      new WildcardRoute(),
      new ExactRoute()
    );

    const matched = router.resolve("chat:message", "message");
    expect(matched.getHandler("message")).toBe(exactHandler);
  });

  test("should support all WS methods", () => {
    const handlers = {};
    wsMethods.forEach(method => {
      handlers[method] = jest.fn();
    });

    class EventRoute {
      pattern = "event";
      connect = handlers.connect;
      disconnect = handlers.disconnect;
      message = handlers.message;
    }

    const router = createWsRouter(new EventRoute());

    wsMethods.forEach(method => {
      const matched = router.resolve("event", method);
      expect(matched).not.toBeNull();
      expect(matched.getHandler(method)).toBe(handlers[method]);
    });
  });

  test("should handle complex patterns", () => {
    const handler = jest.fn();

    class ComplexRoute {
      pattern = "chat:room:*:message";
      message = handler;
    }

    const router = createWsRouter(new ComplexRoute());

    expect(router.resolve("chat:room:123:message", "message")).not.toBeNull();
    expect(router.resolve("chat:room:456:message", "message")).not.toBeNull();
    expect(router.resolve("chat:room:message", "message")).toBeNull();
  });

  test("should return null for unmatched event", () => {
    class ChatRoute {
      pattern = "chat:message";
      message = jest.fn();
    }

    const router = createWsRouter(new ChatRoute());

    expect(router.resolve("user:online", "message")).toBeNull();
  });

  test("should return null for unmatched method", () => {
    class ChatRoute {
      pattern = "chat:message";
      message = jest.fn();
    }

    const router = createWsRouter(new ChatRoute());

    expect(router.resolve("chat:message", "connect")).toBeNull();
  });

  test("should handle connection lifecycle", () => {
    const connectHandler = jest.fn();
    const disconnectHandler = jest.fn();

    class ConnectionRoute {
      pattern = "connection";
      connect = connectHandler;
      disconnect = disconnectHandler;
    }

    const router = createWsRouter(new ConnectionRoute());

    expect(router.resolve("connection", "connect").getHandler("connect")).toBe(connectHandler);
    expect(router.resolve("connection", "disconnect").getHandler("disconnect")).toBe(disconnectHandler);
  });
});

describe("wsMethods", () => {
  test("should contain WebSocket methods", () => {
    expect(wsMethods).toContain("connect");
    expect(wsMethods).toContain("disconnect");
    expect(wsMethods).toContain("message");
  });
});
