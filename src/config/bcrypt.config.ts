import { registerAs } from '@nestjs/config';

export default registerAs('bcrypt', () => ({
    saltRounds: parseInt(process.env.BCRYPT_HASH_FACTOR || '12', 12),
}));

