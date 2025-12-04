# Athlete Router

[![npm version](https://img.shields.io/npm/v/athlete-router.svg)](https://www.npmjs.com/package/athlete-router)
[![license](https://img.shields.io/npm/l/athlete-router.svg)](https://github.com/athlete-flow/athlete-router/blob/main/LICENSE)

**Universal routing. Zero dependencies. Full type safety.**

A minimal, flexible routing library for HTTP, WebSocket, and custom protocols. Built with the same principles as Athlete: security, transparency, and zero external dependencies.

```bash
npm install athlete-router
```

## Why Athlete Router?

**Zero Dependencies**
No external packages. The entire codebase is ~230 lines, easily auditable in 5 minutes.

**Protocol Agnostic**
HTTP, WebSocket, Telegram bots — or build your own. Same core, different strategies.

**Type Safe**
Full TypeScript support with generic types. Catch routing errors at compile time.

**Transparent**
No magic. Routes compile to RegExp patterns via a builder interface you control.

## Quick Start

### HTTP Router

```typescript
import { createHttpRouter, IHTTPRoute } from "athlete-router";

class UsersRoute implements IHTTPRoute<Handler> {
  pattern = "users/:id";
  get(req, res) { return res.json({ userId: req.params.id }); }
  delete(req, res) { return res.json({ deleted: req.params.id }); }
}

class PostsRoute implements IHTTPRoute<Handler> {
  pattern = "posts";
  get(req, res) { return res.json({ posts: [] }); }
  post(req, res) { return res.json({ created: true }); }
}

const router = createHttpRouter(new UsersRoute(), new PostsRoute());

const matched = router.resolve("/users/123", "get");
if (matched) {
  const handler = matched.getHandler();
  const params = matched.getParams(); // { id: "123" }
  handler(req, res);
}
```

### WebSocket Router

```typescript
import { createWsRouter, IWsRoute } from "athlete-router";

class ChatRoute implements IWsRoute<Handler> {
  pattern = "chat:message";
  message(socket, data) { return socket.emit("ack", data); }
}

class UserRoute implements IWsRoute<Handler> {
  pattern = "user:*";
  message(socket, data) { console.log("User event:", data); }
}

const router = createWsRouter(new ChatRoute(), new UserRoute());

socket.on("message", (event, data) => {
  const matched = router.resolve(event, "message");
  if (matched) {
    const handler = matched.getHandler();
    handler(socket, data);
  }
});
```

## Core Concepts

### Pattern Compilation

Routes are compiled to RegExp via a `RegExpPatternBuilder` interface:

```typescript
interface RegExpPatternBuilder {
  parts: string[];
  exact(str: string): this;
  param(name: string, constraint?: string): this;
  wildcard(): this;
  deepWildcard(): this;
  concat(other: RegExpPatternBuilder): this;
  build(): RegExp;
}
```

HTTP patterns support:

- **Exact segments**: `users` → `/users`
- **Parameters**: `users/:id` → `/users/123`
- **Wildcards**: `api/*/docs` → `/api/v1/docs`
- **Deep wildcards**: `files/**` → `/files/any/nested/path`

WebSocket patterns support:

- **Event names**: `chat:message`
- **Wildcards**: `user:*` → `user:online`, `user:offline`

### Route Specificity

When multiple routes match, the most specific wins:

```typescript
class CatchAllRoute implements IHTTPRoute<Handler> {
  pattern = "users/**";
  get = () => "catch-all";
}

class WildcardRoute implements IHTTPRoute<Handler> {
  pattern = "users/*";
  get = () => "wildcard";
}

class ParamRoute implements IHTTPRoute<Handler> {
  pattern = "users/:id";
  get = () => "param";
}

class ExactRoute implements IHTTPRoute<Handler> {
  pattern = "users/admin";
  get = () => "exact";
}

const router = createHttpRouter(new CatchAllRoute(), new WildcardRoute(), new ParamRoute(), new ExactRoute());

router.resolve("/users/admin", "get"); // → "exact"
router.resolve("/users/123", "get"); // → "param"
```

Specificity order: `exact > param > wildcard > deep wildcard`

### Nested Routes

```typescript
class ApiRoute implements IHTTPRoute<Handler> {
  pattern = "api";
  get() { return "API root"; }
  children = [new UsersListRoute()];
}

class UsersListRoute implements IHTTPRoute<Handler> {
  pattern = "users";
  get() { return "List users"; }
  children = [new UserDetailRoute()];
}

class UserDetailRoute implements IHTTPRoute<Handler> {
  pattern = ":id";
  get() { return "Get user"; }
}

const router = createHttpRouter(new ApiRoute());

router.resolve("/api", "get"); // → "API root"
router.resolve("/api/users", "get"); // → "List users"
router.resolve("/api/users/123", "get"); // → "Get user"
```

## Custom Routers

Build your own router by providing compilation and selection strategies:

```typescript
import { Router } from "athlete-router";

const methods = ["MESSAGE", "COMMAND"];

const compileTelegramPattern = (pattern, builder) => {
  if (pattern.startsWith("/")) {
    builder.exact("/").exact(pattern.slice(1));
  } else {
    builder.exact(pattern);
  }
  return builder.build();
};

const selectFirst = (matched) => matched[0];

const router = new Router(
  methods,
  compileTelegramPattern,
  selectFirst,
  { pattern: "/start", COMMAND: () => "Welcome!" },
  { pattern: "/help", COMMAND: () => "Help text" }
);
```

## API Reference

### `createHttpRouter(...routes)`

Creates an HTTP router with pattern specificity selection.

**Supported HTTP methods:** `get`, `post`, `put`, `delete`, `patch`, `head`, `options`

```typescript
type IHTTPRoute<H> = {
  readonly pattern: string;
  readonly children?: IHTTPRoute<H>[];
  get?: H;
  post?: H;
  put?: H;
  delete?: H;
  patch?: H;
  head?: H;
  options?: H;
};

function createHttpRouter<H>(...routes: IHTTPRoute<H>[]): IHTTPRouter<H>;
```

### `createWsRouter(...routes)`

Creates a WebSocket router for event-based patterns.

**Supported WS methods:** `connect`, `disconnect`, `message`

```typescript
type IWsRoute<H> = {
  readonly pattern: string;
  readonly children?: IWsRoute<H>[];
  connect?: H;
  disconnect?: H;
  message?: H;
};

function createWsRouter<H>(...routes: IWsRoute<H>[]): IWsRouter<H>;
```

### `Router<P, M, H>`

Base router class for custom implementations.

```typescript
class Router<P, M extends string, H> {
  constructor(
    methods: M[],
    compilePattern: (pattern: P, builder: RegExpPatternBuilder) => RegExp,
    selectRoute: (matched: MatchedRoute<P, M, H>[]) => MatchedRoute<P, M, H>,
    ...routes: IRoute<P, M, H>[]
  );

  resolve(path: string, method: M): MatchedRoute<P, M, H> | null;
}
```

### `MatchedRoute<P, M, H>`

Represents a matched route with extracted parameters.

```typescript
class MatchedRoute<P, M, H> {
  getHandler(): H | null;
  getParams(): Record<string, string>;
  getRoute(): IRoute<P, M, H>;
}
```

## Security & Auditability

**~230 lines of code**
The entire router implementation is transparent and auditable.

**No regex injection**
All user patterns are escaped via `String.prototype.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`.

**Duplicate detection**
Prevents accidental route conflicts at construction time:

```typescript
class Route1 implements IHTTPRoute<Handler> {
  pattern = "users/:id";
  get() { return handler1(); }
}

class Route2 implements IHTTPRoute<Handler> {
  pattern = "users/:id";
  get() { return handler2(); }
}

// Throws: Duplicate route detected: [get] users/:id
createHttpRouter(new Route1(), new Route2());
```

## Philosophy

Like Athlete, this router prioritizes:

1. **Security** - Zero dependencies, fully auditable
2. **Transparency** - No magic, explicit strategies
3. **Flexibility** - Protocol-agnostic core
4. **Type Safety** - Full TypeScript support

Built for applications where you need to audit every dependency: tools for journalists, platforms for activists, security-critical services.

## License

MIT © Denis Ardyshev

## Links

- [GitHub](https://github.com/athlete-flow/athlete-router)
- [npm](https://www.npmjs.com/package/athlete-router)
- [Issues](https://github.com/athlete-flow/athlete-router/issues)

---

**Enjoy programming without the bloat!** 🚀
