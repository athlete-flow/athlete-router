const { Router } = require('./router');
const { TreeNode } = require('./tree');

const capitalize = (word) => word.slice(0, 1).toUpperCase() + word.slice(1);
const isExcluded = (cache) => cache.startsWith('(') && cache.endsWith(')');
const isWildcard = (cache) => cache.startsWith('[') && cache.endsWith(']');
const formatTokenName = (filename) => filename.split(/[-_.]/).map(capitalize).join('');

const defaultOptions = {
  cache: {},
  pathSeparator: '/',
  urlSeparator: '/',
  folder: 'routes',
  notFoundUrl: 'not-found',
  isExcluded,
  isWildcard,
  formatTokenName,
};

function AthleteRouter(options) {
  const node = new TreeNode([]);
  const router = new Router(defaultOptions, node);
  if (options) router.setOptions(options);
  return router.formPublicRouter();
}

module.exports = { AthleteRouter };
