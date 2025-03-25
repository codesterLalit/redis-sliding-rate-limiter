export interface RateLimiterOptions {
    redisClient: any;
    prefix?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    ttl: number;
}

export interface RateLimitOptions {
    identifier: string;
    maxAttempts: number;
    ttl: number;
}