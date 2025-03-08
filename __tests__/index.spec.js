const { ExcludedRoute } = require('../__mocks__/routes/(excluded)/excluded.route');
const { WildcardRoute } = require('../__mocks__/routes/[wildcard]/wildcard.route');
const { NotFoundRoute } = require('../__mocks__/routes/not-found/not-found.route');
const { RegularIdRoute } = require('../__mocks__/routes/regular/[id]/regular-id.route');
const { RegularRoute } = require('../__mocks__/routes/regular/regular.route');
const { AthleteRouter } = require('../index');

describe('Router', () => {
  let router;

  beforeEach(() => {
    router = AthleteRouter();
  });

  test('should initialize router correctly', () => {
    expect(router).toHaveProperty('resolve');
    expect(router).toHaveProperty('setOptions');

    router.setOptions({ cache: require.cache });

    expect(router).toHaveProperty('resolve');
    expect(router).toHaveProperty('setOptions');
  });

  test('should resolve correctly', () => {
    router.setOptions({ cache: require.cache });
    const regular = router.resolve('regular');
    const excluded = router.resolve('excluded');
    const wildcard = router.resolve('123');
    const notFound = router.resolve('123/123/123');

    const { resolve } = router;
    const regularId = resolve('regular/123');

    expect(regular?.token).toBe(RegularRoute);
    expect(excluded?.token).toBe(WildcardRoute);
    expect(excluded?.token).not.toBe(ExcludedRoute);
    expect(wildcard?.token).toBe(WildcardRoute);
    expect(notFound?.token).toBe(NotFoundRoute);
    expect(regularId?.token).toBe(RegularIdRoute);
  });
});
