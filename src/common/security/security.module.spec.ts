import { MODULE_METADATA } from '@nestjs/common/constants';

jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

describe('SecurityModule', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  async function loadModule(nodeEnv: string | undefined) {
    jest.resetModules();
    if (nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnv;
    }
    return import('./security.module');
  }

  function names(values: unknown[]): string[] {
    return values.map((value) => (value as { name: string }).name);
  }

  function getControllers(SecurityModule: new () => unknown) {
    return Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      SecurityModule,
    ) as unknown[];
  }

  function getProviders(SecurityModule: new () => unknown) {
    return Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SecurityModule,
    ) as unknown[];
  }

  function getExports(SecurityModule: new () => unknown) {
    return Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SecurityModule,
    ) as unknown[];
  }

  function getImports(SecurityModule: new () => unknown) {
    return Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      SecurityModule,
    ) as unknown[];
  }

  it('always provides SecurityService and both repositories, exports SecurityService', async () => {
    const { SecurityModule } = await loadModule('development');

    expect(names(getProviders(SecurityModule))).toEqual(
      expect.arrayContaining([
        'SecurityService',
        'BlockedIpPostgresRepository',
        'BlockedIpMongoRepository',
      ]),
    );
    expect(names(getExports(SecurityModule))).toEqual(['SecurityService']);
    expect(names(getControllers(SecurityModule))).toContain(
      'SecurityController',
    );
  });

  it('omits CatchAllController and WikiModule outside production/staging', async () => {
    const { SecurityModule } = await loadModule('development');
    const controllers = names(getControllers(SecurityModule));
    const imports = getImports(SecurityModule);

    expect(controllers).toEqual(['SecurityController']);
    expect(controllers).not.toContain('CatchAllController');
    expect(imports).toHaveLength(2);
  });

  it('defaults NODE_ENV to development when unset', async () => {
    const { SecurityModule } = await loadModule(undefined);
    expect(names(getControllers(SecurityModule))).toEqual([
      'SecurityController',
    ]);
  });

  it('includes CatchAllController in production', async () => {
    const { SecurityModule } = await loadModule('production');
    const controllers = names(getControllers(SecurityModule));

    expect(controllers).toContain('SecurityController');
    expect(controllers).toContain('CatchAllController');
    expect(getImports(SecurityModule)).toHaveLength(3);
  });

  it('includes CatchAllController in staging', async () => {
    const { SecurityModule } = await loadModule('staging');
    const controllers = names(getControllers(SecurityModule));

    expect(controllers).toEqual(
      expect.arrayContaining(['SecurityController', 'CatchAllController']),
    );
  });
});
