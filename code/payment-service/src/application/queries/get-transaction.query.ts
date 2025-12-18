/**
 * Get Transaction Query - CQRS Query Definition
 */

import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query filter options enum
 */
export enum QueryFilterType {
  BY_ID = 'BY_ID',
  BY_IDEMPOTENCY_KEY = 'BY_IDEMPOTENCY_KEY',
  BY_WALLET = 'BY_WALLET',
  BY_DATE_RANGE = 'BY_DATE_RANGE',
  BY_STATUS = 'BY_STATUS',
}

/**
 * Query sort order enum
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query pagination interface
 */
export interface QueryPagination {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Query filter interface
 */
export interface QueryFilter {
  type: QueryFilterType;
  value: any;
}

/**
 * Query sort interface
 */
export interface QuerySort {
  field: string;
  order: SortOrder;
}

/**
 * Get Transaction Query
 * Single transaction retrieval
 */
export class GetTransactionQuery {
  @IsString()
  transactionId: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(transactionId: string, requestId?: string) {
    this.transactionId = transactionId;
    this.requestId = requestId;
  }
}

/**
 * Get Transaction by Idempotency Key Query
 */
export class GetTransactionByIdempotencyKeyQuery {
  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(idempotencyKey: string, requestId?: string) {
    this.idempotencyKey = idempotencyKey;
    this.requestId = requestId;
  }
}

/**
 * Get Transactions by Wallet Query
 */
export class GetTransactionsByWalletQuery {
  @IsString()
  walletId: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(
    walletId: string,
    limit?: number,
    offset?: number,
    sortOrder?: SortOrder,
    requestId?: string,
  ) {
    this.walletId = walletId;
    this.limit = limit || 50;
    this.offset = offset || 0;
    this.sortOrder = sortOrder || SortOrder.DESC;
    this.requestId = requestId;
  }
}

/**
 * Get Transactions by Date Range Query
 */
export class GetTransactionsByDateRangeQuery {
  @IsString()
  walletId: string;

  @Type(() => Date)
  startDate: Date;

  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(
    walletId: string,
    startDate: Date,
    endDate: Date,
    limit?: number,
    offset?: number,
    requestId?: string,
  ) {
    this.walletId = walletId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.limit = limit || 50;
    this.offset = offset || 0;
    this.requestId = requestId;
  }
}

/**
 * Get Transactions by Status Query
 */
export class GetTransactionsByStatusQuery {
  @IsString()
  walletId: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(
    walletId: string,
    status: string,
    limit?: number,
    offset?: number,
    requestId?: string,
  ) {
    this.walletId = walletId;
    this.status = status;
    this.limit = limit || 50;
    this.offset = offset || 0;
    this.requestId = requestId;
  }
}

/**
 * Advanced Query with Filters and Sorting
 */
export class AdvancedGetTransactionsQuery {
  @IsString()
  @IsOptional()
  walletId?: string;

  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsOptional()
  filters?: QueryFilter[];

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  sort?: QuerySort;

  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  pagination?: QueryPagination;

  @IsOptional()
  @IsString()
  requestId?: string;

  constructor(
    walletId?: string,
    filters?: QueryFilter[],
    sort?: QuerySort,
    pagination?: QueryPagination,
    requestId?: string,
  ) {
    this.walletId = walletId;
    this.filters = filters || [];
    this.sort = sort || { field: 'createdAt', order: SortOrder.DESC };
    this.pagination = pagination || { page: 1, limit: 50 };
    this.requestId = requestId;
  }

  /**
   * Convert to database query parameters
   */
  toQueryParams(): {
    where: any;
    orderBy: any;
    skip: number;
    take: number;
  } {
    const where: any = {};

    if (this.walletId) {
      where.walletId = this.walletId;
    }

    if (this.filters && this.filters.length > 0) {
      for (const filter of this.filters) {
        this.applyFilter(where, filter);
      }
    }

    const orderBy: any = {};
    if (this.sort) {
      orderBy[this.sort.field] = this.sort.order.toLowerCase();
    }

    const pagination = this.pagination || { page: 1, limit: 50 };
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;

    return {
      where,
      orderBy,
      skip,
      take,
    };
  }

  /**
   * Apply individual filter to where clause
   */
  private applyFilter(where: any, filter: QueryFilter): void {
    switch (filter.type) {
      case QueryFilterType.BY_STATUS:
        where.status = filter.value;
        break;

      case QueryFilterType.BY_DATE_RANGE:
        where.createdAt = {
          gte: new Date(filter.value.startDate),
          lte: new Date(filter.value.endDate),
        };
        break;

      case QueryFilterType.BY_IDEMPOTENCY_KEY:
        where.idempotencyKey = filter.value;
        break;

      default:
        break;
    }
  }
}

/**
 * Query builder helper
 */
export class GetTransactionQueryBuilder {
  private query: AdvancedGetTransactionsQuery;

  constructor(walletId?: string) {
    this.query = new AdvancedGetTransactionsQuery(walletId);
  }

  /**
   * Add filter to query
   */
  addFilter(type: QueryFilterType, value: any): this {
    if (!this.query.filters) {
      this.query.filters = [];
    }
    this.query.filters.push({ type, value });
    return this;
  }

  /**
   * Set sort order
   */
  setSortOrder(field: string, order: SortOrder): this {
    this.query.sort = { field, order };
    return this;
  }

  /**
   * Set pagination
   */
  setPagination(page: number, limit: number): this {
    this.query.pagination = {
      page: Math.max(1, page),
      limit: Math.min(Math.max(1, limit), 100),
    };
    return this;
  }

  /**
   * Set request ID for tracing
   */
  setRequestId(requestId: string): this {
    this.query.requestId = requestId;
    return this;
  }

  /**
   * Build query
   */
  build(): AdvancedGetTransactionsQuery {
    return this.query;
  }
}
