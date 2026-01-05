# Sistema de Cache Redis

Sistema de cache distribuído usando Redis para interceptar e cachear queries do PostgreSQL (TypeORM) e MongoDB (Mongoose).

## Características

- **Cache Seletivo**: Apenas métodos marcados com `@EnableCache()` são cacheados
- **Namespacing Automático**: Chaves isoladas por módulo para evitar colisões
- **Invalidação Automática**: Operações de escrita invalidam cache relacionado automaticamente
- **TTL Configurável**: TTL global e por método
- **Isolamento de Módulos**: Cada módulo tem seu próprio namespace

## Estrutura de Chaves

Todas as chaves seguem o padrão hierárquico:

```
{dbType}:{moduleName}:{entityName}:{methodName}:{paramsHash}
```

Exemplos:
- `typeorm:users:user:findById:abc123`
- `mongoose:condominiums:condominium:findAll:def456`
- `typeorm:condominium_invoices:condominium_invoice:findByStatus:ghi789`

## Decorators

### @EnableCache()

Habilita o cache no método. Sem este decorator, o método não será cachead.

```typescript
@EnableCache()
async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
}
```

### @CacheTTL(ttl: number)

Define o TTL (Time To Live) em segundos para o método específico.

```typescript
@EnableCache()
@CacheTTL(1800) // 30 minutos
async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find();
}
```

### @CacheKey(key: string)

Define uma chave customizada para o cache. A chave ainda será prefixada com o namespace do módulo.

```typescript
@EnableCache()
@CacheKey('users:all')
async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find();
}
```

### @NoCache()

Desabilita o cache para um método específico, mesmo que a classe tenha cache habilitado.

```typescript
@NoCache()
async findSensitiveData(id: string): Promise<SensitiveData> {
    // Este método nunca será cachead
    return this.repository.findOne({ where: { id } });
}
```

### @CacheInvalidate(...patterns: string[])

Define padrões de chaves para invalidar após a execução do método.

```typescript
@CacheInvalidate('typeorm:users:user:*')
async create(userData: IUser): Promise<UserEntity> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
}
```

## Exemplos de Uso

### Repositório TypeORM

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { EnableCache, CacheTTL, CacheKey } from '@common/cache/decorators/cache.decorator';

@Injectable()
export class UserPostgresRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) {}

    @EnableCache()
    @CacheTTL(3600) // 1 hora
    // Chave gerada: typeorm:users:user:findById:abc123
    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    @EnableCache()
    @CacheKey('users:all')
    // Chave gerada: typeorm:users:users:all
    async findAll(): Promise<UserEntity[]> {
        return this.userRepository.find();
    }

    // Invalidação automática: invalida typeorm:*:user:*
    async create(userData: IUser): Promise<UserEntity> {
        const user = this.userRepository.create(userData);
        return this.userRepository.save(user);
    }

    // Invalidação automática: invalida typeorm:*:user:*
    async update(id: string, updateData: Partial<IUser>): Promise<UserEntity> {
        return this.userRepository.save({ id, ...updateData });
    }
}
```

### Repositório Mongoose

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { EnableCache, CacheTTL } from '@common/cache/decorators/cache.decorator';

@Injectable()
export class UserMongoRepository {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
    ) {}

    @EnableCache()
    @CacheTTL(1800) // 30 minutos
    // Chave gerada: mongoose:users:user:findById:abc123
    async findById(id: string): Promise<IUser | null> {
        return this.userModel.findById(id);
    }

    // Invalidação automática: invalida mongoose:*:user:*
    async create(createUserDto: CreateUserDto): Promise<IUser> {
        const user = new this.userModel(createUserDto);
        return user.save();
    }
}
```

### Exemplo com Módulo Composto

```typescript
// Arquivo: src/modules/condominium-invoices/repositories/postgres.repository.ts
import { EnableCache } from '@common/cache/decorators/cache.decorator';

@Injectable()
export class CondominiumInvoicePostgresRepository {
    @EnableCache()
    // Chave gerada: typeorm:condominium_invoices:condominium_invoice:findById:abc123
    // Note: nome do módulo normalizado (hífen vira underscore)
    async findById(id: string): Promise<CondominiumInvoiceEntity | null> {
        return this.repository.findOne({ where: { id } });
    }
}
```

## Invalidação Automática

O sistema detecta automaticamente métodos de escrita (create, update, save, delete, remove, upsert) e invalida o cache relacionado:

- `{dbType}:*:{entityName}:*` - Todos os caches da entidade
- `{dbType}:*:{entityName}:findById:{id}*` - Cache específico do ID (se disponível)

## Configuração

O cache usa a configuração do Redis definida em `src/config/redis.config.ts`:

```typescript
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=my_redis_password
REDIS_DB=0
REDIS_TTL=3600  // TTL padrão em segundos
```

## Boas Práticas

1. **Use cache apenas em métodos de leitura frequentes**: Métodos como `findById`, `findAll` são bons candidatos
2. **Configure TTLs apropriados**: Dados que mudam frequentemente devem ter TTL menor
3. **Evite cache em dados sensíveis**: Use `@NoCache()` para dados que não devem ser cachead
4. **Monitore o uso de memória**: Redis tem memória limitada, monitore o uso
5. **Teste a invalidação**: Certifique-se de que a invalidação automática está funcionando corretamente

## Troubleshooting

### Cache não está funcionando

1. Verifique se o método tem `@EnableCache()`
2. Verifique se o Redis está rodando e acessível
3. Verifique os logs para erros de conexão

### Chaves duplicadas

O sistema usa namespacing automático para evitar colisões. Se ainda houver problemas:
1. Verifique se os nomes dos módulos estão corretos
2. Use `@CacheKey()` para definir chaves customizadas se necessário

### Cache desatualizado

1. Verifique se a invalidação automática está funcionando
2. Use `@CacheInvalidate()` para invalidar manualmente se necessário
3. Reduza o TTL se os dados mudam frequentemente

