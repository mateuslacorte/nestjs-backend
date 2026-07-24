import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('exports IS_PUBLIC_KEY', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('sets isPublic metadata to true on the method', () => {
    class SampleController {
      @Public()
      publicRoute() {
        return 'ok';
      }
    }

    const reflector = new Reflector();
    expect(
      reflector.get(IS_PUBLIC_KEY, SampleController.prototype.publicRoute),
    ).toBe(true);
  });

  it('does not mark undecorated methods as public', () => {
    class SampleController {
      protectedRoute() {
        return 'ok';
      }
    }

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SampleController.prototype.protectedRoute),
    ).toBeUndefined();
  });
});
