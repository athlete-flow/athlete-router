class TreeNode {
  constructor(path) {
    this.#path = path;
  }

  #path;
  #children = new Map();
  #wildcard;
  #token;

  get path() {
    return this.#path;
  }

  get token() {
    return this.#token;
  }

  appendChild(segment) {
    if (this.#children.has(segment)) return this.#children.get(segment);
    const children = new TreeNode([...this.#path, segment]);
    this.#children.set(segment, children);
    return children;
  }

  appendWildcard(segment) {
    this.#wildcard = new TreeNode([...this.#path, segment]);
    return this.#wildcard;
  }

  appendToken(token) {
    this.#token = token;
    return this;
  }

  clear() {
    for (const child of this.#children.values()) child.clear();
    if (this.#wildcard) this.#wildcard.clear();
    this.#children.clear();
    this.#wildcard = undefined;
    return this;
  }

  visit(segment) {
    if (this.#children.has(segment)) return this.#children.get(segment);
    return this.#wildcard;
  }

  traverse(path) {
    let currentNode = this;
    for (const segment of path) if (currentNode) currentNode = currentNode.visit(segment);
    return currentNode;
  }
}

module.exports = { TreeNode };
