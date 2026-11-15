import { IQuery } from '@nestjs/cqrs';
import { SearchUsersQuery as SearchUsersQueryParams } from '../interfaces/user.interface';

export class SearchUsersQuery implements IQuery {
  constructor(public readonly params: SearchUsersQueryParams = {}) {}
}
