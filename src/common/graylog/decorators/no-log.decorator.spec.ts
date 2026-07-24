import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { NO_LOG_KEY, NoLog } from './no-log.decorator';

describe('NoLog decorator', () => {
  it('exports NO_LOG_KEY as noLog', () => {
    expect(NO_LOG_KEY).toBe('noLog');
  });

  it('sets metadata true when applied to a class', () => {
    @NoLog()
    class SampleController {}

    const reflector = new Reflector();
    expect(reflector.get(NO_LOG_KEY, SampleController)).toBe(true);
  });

  it('sets metadata true when applied to a method', () => {
    class SampleController {
      @NoLog()
      health() {
        return 'ok';
      }
    }

    const reflector = new Reflector();
    expect(
      reflector.get(NO_LOG_KEY, SampleController.prototype.health),
    ).toBe(true);
  });
});
