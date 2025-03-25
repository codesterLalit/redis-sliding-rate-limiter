import { createClient, RedisClientType } from 'redis';
import { RedisRateLimiter, RateLimitExceededError } from '../index';

async function main() {
    const redisClient: RedisClientType = createClient({
        url: 'redis://default:2023Redis@conf1@localhost:6379'
    });

    redisClient.on('error', (err: Error) => {
        console.log('Redis Client Error', err);
    });

    await redisClient.connect();

    // Clear any existing keys
    await redisClient.flushAll();
    console.log('Redis flushed');

    const rateLimiter = new RedisRateLimiter({
        redisClient,
        prefix: 'my_app_rate_limit'
    });

    async function login(mobileNumber: string) {
        const key = `my_app_rate_limit:${mobileNumber}_login`;
        
        try {
            const before = await redisClient.get(key);
            const beforeTtl = await redisClient.ttl(key);
            
            console.log(`Attempt - Before: ${before}/${beforeTtl}s`);
            
            await rateLimiter.enforceRateLimit({
                identifier: `${mobileNumber}_login`,
                maxAttempts: 5,
                ttl: 60
            });
            
            const after = await redisClient.get(key);
            const afterTtl = await redisClient.ttl(key);
            console.log(`Attempt successful - After: ${after}/${afterTtl}s`);
        } catch (error: unknown) {
            if (error instanceof RateLimitExceededError) {
                console.log(`Blocked! Try again in ${error.ttl} seconds.`);
            } else if (error instanceof Error) {
                console.error('Error:', error.message);
            }
        }
    }

    const testNumber = '9876543210';
    console.log('Testing rate limiter...');
    
    // First 5 attempts should succeed
    for (let i = 1; i <= 5; i++) {
        console.log(`Attempt ${i}`);
        await login(testNumber);
    }
    
    // 6th attempt should fail
    console.log('Attempt 6 (should be blocked)');
    await login(testNumber);
    
    await redisClient.quit();
}

main().catch((err: Error) => {
    console.error('Main error:', err);
    process.exit(1);
});