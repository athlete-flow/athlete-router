# TypeScript Router

A lightweight, type-safe router for TypeScript applications that supports parameterized routes and multiple HTTP methods.

## Features

- **Type-safe**: Full TypeScript support with generic types
- **Parameterized routes**: Support for dynamic route parameters (e.g., `/users/:id`)
- **Multiple HTTP methods**: Support for any HTTP methods you define
- **Flexible configuration**: Customizable separators and parameter symbols
- **Zero dependencies**: Lightweight implementation
- **Duplicate route detection**: Prevents accidental route conflicts

## Installation

```bash
npm install athlete-router
```

## Quick Start

```typescript
import { Router } from "./router";

// Define your HTTP methods
const methods = ["GET", "POST", "PUT", "DELETE"] as const;

// Define routes
const routes = [
  {
    paths: ["users"],
    GET: () => "Get all users",
    POST: () => "Create user",
  },
  {
    paths: ["users", ":id"],
    GET: () => "Get user by ID",
    PUT: () => "Update user",
    DELETE: () => "Delete user",
  },
];

// Create router instance
const router = new Router(methods, routes);

// Match routes
const handler = router.match("GET", "/users/123");
if (handler) {
  console.log(handler.params); // { id: '123' }
  console.log(handler.handle()); // 'Get user by ID'
}
```

## API Reference

### Types

#### `IRoute<T, A>`

Defines a route with its paths and method handlers.

```typescript
type IRoute<T extends readonly string[] = [], A = (...args: any[]) => any> = {
  readonly paths: string[];
} & {
  [K in T[number]]?: A;
};
```

- `paths`: Array of path segments (e.g., `['users', ':id']`)
- Method handlers: Functions for each HTTP method

#### `IHandler<T, A>`

Represents a matched route handler.

```typescript
interface IHandler<T extends readonly string[] = [], A = (...args: any[]) => any> {
  route: IRoute<T, A>;
  paths: string[];
  method: T[number];
  handle: A;
  params: Record<string, string>;
}
```

- `route`: The original route definition
- `paths`: Path segments
- `method`: HTTP method
- `handle`: Handler function
- `params`: Extracted route parameters

#### `RouterOption`

Configuration options for the router.

```typescript
type RouterOption = {
  separator: string;
  paramSymbol: string;
};
```

### Router Class

#### Constructor

```typescript
new Router<T, A>(methods: T, routes: IRoute<T, A>[], options?: RouterOption)
```

**Parameters:**

- `methods`: Array of HTTP methods to support
- `routes`: Array of route definitions
- `options`: Optional configuration (defaults: `separator: "/"`, `paramSymbol: ":"`)

#### Methods

##### `match(method: string, pathname: string): IHandler<T, A> | undefined`

Matches a request method and pathname against registered routes.

**Parameters:**

- `method`: HTTP method (e.g., 'GET', 'POST')
- `pathname`: URL pathname (e.g., '/users/123')

**Returns:**

- `IHandler` if a match is found
- `undefined` if no match

## Examples

### Basic Usage

```typescript
const methods = ["GET", "POST"] as const;

const routes = [
  {
    paths: [""],
    GET: () => "Home page",
  },
  {
    paths: ["about"],
    GET: () => "About page",
  },
];

const router = new Router(methods, routes);

// Match root path
const homeHandler = router.match("GET", "/");
console.log(homeHandler?.handle()); // 'Home page'

// Match about path
const aboutHandler = router.match("GET", "/about");
console.log(aboutHandler?.handle()); // 'About page'
```

### Parameterized Routes

```typescript
const methods = ["GET", "POST", "PUT", "DELETE"] as const;

const routes = [
  {
    paths: ["api", "users", ":id"],
    GET: (req: any, res: any) => {
      // Access parameters via handler.params
      return `Get user ${req.params.id}`;
    },
  },
  {
    paths: ["api", "users", ":userId", "posts", ":postId"],
    GET: () => "Get user post",
  },
];

const router = new Router(methods, routes);

const handler = router.match("GET", "/api/users/123");
if (handler) {
  console.log(handler.params); // { id: '123' }
}

const nestedHandler = router.match("GET", "/api/users/456/posts/789");
if (nestedHandler) {
  console.log(nestedHandler.params); // { userId: '456', postId: '789' }
}
```

### Custom Configuration

```typescript
const router = new Router(["GET", "POST"] as const, routes, {
  separator: "/",
  paramSymbol: "$", // Use $ instead of : for parameters
});

// Now routes can use $id instead of :id
const customRoutes = [
  {
    paths: ["users", "$id"],
    GET: () => "Custom param syntax",
  },
];
```

## Error Handling

The router throws an error when duplicate routes are detected:

```typescript
// This will throw an error
const duplicateRoutes = [
  {
    paths: ["users", ":id"],
    GET: () => "Handler 1",
  },
  {
    paths: ["users", ":id"],
    GET: () => "Handler 2", // Duplicate!
  },
];

// Error: Duplicate route detected: [ GET / users/:id ]
const router = new Router(["GET"] as const, duplicateRoutes);
```

## License

MIT
