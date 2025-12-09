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
No external packages. The entire codebase is ~200 lines, easily auditable in 5 minutes.

**Protocol Agnostic**
HTTP, WebSocket, Telegram bots — or build your own. Same core, different strategies.

**Type Safe**
Full TypeScript support with generic types. Catch routing errors at compile time.

**Transparent**
No magic. Routes compile to RegExp patterns via a builder interface you control.

## Quick Start

### HTTP Router

```typescript
import { HTTPRouter } from "athlete-router";

class UsersRoute {
  pattern = "users/:id";
  get(req, res) { return res.json({ userId: req.params.id }); }
  delete(req, res) { return res.json({ deleted: req.params.id }); }
}

class PostsRoute {
  pattern = "posts";
  get(req, res) { return res.json({ posts: [] }); }
  post(req, res) { return res.json({ created: true }); }
}

const router = new HTTPRouter(new UsersRoute(), new PostsRoute());

const matched = router.resolve("/users/123");
if (matched) {
  console.log(matched.pattern); // "users/:id"
  // Client extracts params from URL using pattern
  // Client calls matched.get(req, res) or matched[method](req, res)
}
```

### WebSocket Router

```typescript
import { WSRouter } from "athlete-router";

class ChatRoute {
  pattern = "chat:message";
  message(socket, data) { return socket.emit("ack", data); }
}

class UserRoute {
  pattern = "user:*";
  message(socket, data) { console.log("User event:", data); }
}

const router = new WSRouter(new ChatRoute(), new UserRoute());

const matched = router.resolve("chat:message");
if (matched) {
  console.log(matched.pattern); // "chat:message"
  // Client calls matched.message(socket, data)
}
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
class CatchAllRoute {
  pattern = "users/**";
  get() { return "catch-all"; }
}

class WildcardRoute {
  pattern = "users/*";
  get() { return "wildcard"; }
}

class ParamRoute {
  pattern = "users/:id";
  get() { return "param"; }
}

class ExactRoute {
  pattern = "users/admin";
  get() { return "exact"; }
}

const router = new HTTPRouter(
  new CatchAllRoute(),
  new WildcardRoute(),
  new ParamRoute(),
  new ExactRoute()
);

router.resolve("/users/admin"); // → ExactRoute
router.resolve("/users/123"); // → ParamRoute
```

Specificity order: `exact > param > wildcard > deep wildcard`

### Nested Routes

```typescript
class ApiRoute {
  pattern = "api";
  get() { return "API root"; }
  children = [new UsersListRoute()];
}

class UsersListRoute {
  pattern = "users";
  get() { return "List users"; }
  children = [new UserDetailRoute()];
}

class UserDetailRoute {
  pattern = ":id";
  get() { return "Get user"; }
}

const router = new HTTPRouter(new ApiRoute());

router.resolve("/api"); // → ApiRoute
router.resolve("/api/users"); // → UsersListRoute
router.resolve("/api/users/123"); // → UserDetailRoute
```

## Custom Routers

Build your own router by providing compilation and selection strategies:

```typescript
import { Router } from "athlete-router";

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
  compileTelegramPattern,
  selectFirst,
  { pattern: "/start", MESSAGE: () => "Welcome!" },
  { pattern: "/help", MESSAGE: () => "Help text" }
);
```

## API Reference

### `HTTPRouter`

HTTP router class with built-in pattern compilation and specificity selection.

```typescript
class HTTPRouter<R extends IBaseRoute<string>> extends Router<R> {
  constructor(...routes: R[]);
  resolve(path: string): R | undefined;
}
```

### `WSRouter`

WebSocket router class with built-in event pattern compilation.

```typescript
class WSRouter<R extends IBaseRoute<string>> extends Router<R> {
  constructor(...routes: R[]);
  resolve(path: string): R | undefined;
}
```

### `Router<R>`

Base router class for custom implementations.

```typescript
class Router<R extends IBaseRoute> {
  constructor(
    compilePattern: (pattern: R["pattern"], builder: RegExpPatternBuilder) => RegExp,
    selectRoute: (matched: R[]) => R,
    ...routes: R[]
  );

  resolve(path: string): R | undefined;
}
```

### `IBaseRoute<P>`

Route definition interface.

```typescript
interface IBaseRoute<P> {
  readonly pattern: P;
  readonly children?: IBaseRoute<P>[];
}
```

## Duplicate Route Detection

The router automatically checks for duplicate routes at construction time:

```typescript
const router = new HTTPRouter(
  { pattern: "users/:id" },
  { pattern: "users/:name" } // ❌ Error: Duplicate route detected
);
```

Routes are considered duplicates if they compile to the same RegExp pattern. This prevents ambiguous routing configurations.

```typescript
// These are NOT duplicates (different patterns):
const router = new HTTPRouter(
  { pattern: "users/:id" },    // matches /users/123
  { pattern: "users/admin" }   // matches /users/admin (more specific)
);

// These ARE duplicates (same compiled pattern):
const router = new HTTPRouter(
  { pattern: "users/:id" },
  { pattern: "users/:userId" } // ❌ Same regex: /^\/users\/(?<id>[^/?#]+)$/
);
```

Nested routes are also checked:

```typescript
const router = new HTTPRouter({
  pattern: "api",
  children: [
    { pattern: "users" },
    { pattern: "users" } // ❌ Error: Duplicate route detected
  ]
});
```

## Philosophy

The router is a **pure pattern matcher**. It:

1. Takes a path/event string
2. Finds matching routes by pattern
3. Returns the most specific matching route

The router does NOT:

- Parse parameters from URLs (client extracts them using the pattern)
- Validate HTTP methods (client checks if method exists on route)

This separation of concerns gives you maximum flexibility:

- **Parameter extraction**: Client's responsibility using the returned pattern
- **Method handling**: Client checks if `route[method]` exists and calls it
- **Handler execution**: Client manages the handler logic

## Security & Auditability

**~200 lines of code**
The entire router implementation is transparent and auditable.

**No regex injection**
All user patterns are escaped via `String.prototype.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`.

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

**Enjoy programming without the bloat!**
