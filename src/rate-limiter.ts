import { createClient, RedisClientType } from 'redis';
import { RateLimiterOptions, RateLimitResult, RateLimitOptions } from './interfaces';
import { RateLimitExceededError } from './errors';

export class RedisRateLimiter {
    private redisClient: RedisClientType;
    private prefix: string;

    constructor(options: RateLimiterOptions) {
        this.redisClient = options.redisClient as RedisClientType;
        this.prefix = options.prefix || 'rate_limit';
    }

    private getKey(identifier: string): string {
        return `${this.prefix}:${identifier}`;
    }

    async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
        const { identifier, maxAttempts, ttl } = options;
        const key = this.getKey(identifier);

        try {
            const current = await this.redisClient.get(key);
            
            if (current === null) {
                // First attempt - set the initial value
                await this.redisClient.setEx(key, ttl, (maxAttempts - 1).toString());
                return {
                    allowed: true,
                    remaining: maxAttempts - 1,
                    ttl: ttl
                };
            }

            const remaining = parseInt(current) - 1;
            await this.redisClient.decr(key);
            const newTtl = await this.redisClient.ttl(key);

            return {
                allowed: remaining >= 0,
                remaining: Math.max(remaining, 0),
                ttl: newTtl
            };
        } catch (error) {
            console.error('Redis operation failed:', error);
            throw error;
        }
    }

    async enforceRateLimit(options: RateLimitOptions): Promise<void> {
        const result = await this.checkRateLimit(options);
        if (!result.allowed) {
            throw new RateLimitExceededError(
                `Rate limit exceeded for ${options.identifier}`,
                result.remaining,
                result.ttl
            );
        }
    }
}