export class RateLimitExceededError extends Error {
    remaining: number;
    ttl: number;
    
    constructor(message: string, remaining: number, ttl: number) {
        super(message);
        this.remaining = remaining;
        this.ttl = ttl;
        this.name = 'RateLimitExceededError';
    }
}