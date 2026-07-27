jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-test-id'),
}));

import { v4 as uuidv4 } from 'uuid';
import { UserSchema } from './user.schema';

describe('UserSchema', () => {
  it('generates a uuid default for _id', () => {
    const idPath = UserSchema.path('_id');
    const defaultFn = idPath?.options?.default as (() => string) | undefined;
    expect(typeof defaultFn).toBe('function');
    expect(defaultFn?.()).toBe('uuid-test-id');
    expect(uuidv4).toHaveBeenCalled();
  });
});
