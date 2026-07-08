export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    processingTimeMs?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };

  static success<T>(
    data: T,
    meta?: Partial<ApiResponseDto<T>['meta']>,
  ): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    response.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
    return response;
  }

  static error(
    code: string,
    message: string,
    statusCode: number,
  ): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = false;
    response.error = { code, message, statusCode };
    response.meta = { timestamp: new Date().toISOString() };
    return response;
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): ApiResponseDto<T[]> {
    const response = new ApiResponseDto<T[]>();
    response.success = true;
    response.data = data;
    response.meta = {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return response;
  }
}
