class Router {
  constructor(options, tree) {
    this.#options = options;
    this.#tree = tree;
    this.#buildTree(this.#tree, this.#options);
  }

  #options;
  #tree;

  #extractPathSegments(cacheKey, options) {
    const segments = cacheKey.split(options.pathSeparator);
    const index = segments.indexOf(options.folder) + 1;
    if (!index) return;
    return segments.slice(index);
  }

  #exportToken(cacheKey, lastSegment, options) {
    const filename = lastSegment.split('.').slice(0, -1).join('.');
    const tokenName = options.formatTokenName(filename, options);
    return options.cache[cacheKey]?.exports[tokenName];
  }

  #buildBranchRecord(currentNode, segment, options) {
    if (options.isExcluded(segment)) return;
    if (options.isWildcard(segment)) return currentNode.appendWildcard(segment);
    else return currentNode.appendChild(segment);
  }

  #buildBranch(tree, segments, token, options) {
    let currentNode = tree;
    for (const segment of segments)
      if (currentNode) currentNode = this.#buildBranchRecord(currentNode, segment, options);
    if (currentNode) return currentNode.appendToken(token);
  }

  #buildTree(tree, options) {
    for (const key of Object.keys(options.cache)) {
      const segments = this.#extractPathSegments(key, options);
      if (segments && segments.length) {
        const token = this.#exportToken(key, segments.at(-1), options);
        this.#buildBranch(tree, segments.slice(0, -1), token, options);
      }
    }
  }

  #resolveUrl(url) {
    const segments = url.split(this.#options.urlSeparator).filter(Boolean);
    const candidate = this.#tree.traverse(segments);
    if (candidate) return { path: candidate.path, token: candidate.token };
  }

  resolve(url) {
    const target = this.#resolveUrl(url);
    if (target?.token) return target;
    return this.#resolveUrl(this.#options.notFoundUrl);
  }

  setOptions(options) {
    Object.assign(this.#options, options);
    this.#tree.clear();
    this.#buildTree(this.#tree, this.#options);
    return this;
  }

  formPublicRouter() {
    return { resolve: this.resolve.bind(this), setOptions: this.setOptions.bind(this) };
  }
}

module.exports = { Router };
