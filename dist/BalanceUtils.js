"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceUtils = void 0;
class BalanceUtils {
    constructor(redisClient, dbConnection) {
        this.redisClient = redisClient;
        this.dbConnection = dbConnection;
    }
    async checkAndDebitBalance(balanceKey, amount = 1, operationDescription = 'Verification') {
        try {
            let currentBalance = 0;
            const balanceFromRedis = await this.redisClient.get(balanceKey);
            if (balanceFromRedis !== null) {
                currentBalance = parseFloat(balanceFromRedis.toString());
                if (currentBalance >= amount) {
                    const newBalance = currentBalance - amount;
                    await this.redisClient.set(balanceKey, newBalance.toString());
                    console.log(`${operationDescription} balance debited. New balance: ${newBalance}`);
                    return {
                        success: true,
                        oldBalance: currentBalance,
                        newBalance,
                        amount: amount,
                        operation: operationDescription
                    };
                }
                else {
                    console.log(`${operationDescription} - Insufficient balance in Redis. Required: ${amount}, Available: ${currentBalance}`);
                    return {
                        success: false,
                        error: 'Insufficient balance',
                        required: amount,
                        available: currentBalance,
                        operation: operationDescription
                    };
                }
            }
            else {
                console.log(`${operationDescription} - Balance not found in Redis for key: ${balanceKey}`);
                return {
                    success: false,
                    error: 'Balance not found in Redis',
                    operation: operationDescription
                };
            }
        }
        catch (redisError) {
            console.error(`Error getting/setting balance from Redis during ${operationDescription}:`, redisError);
            return {
                success: false,
                error: 'Redis error',
                redisError: redisError.message,
                operation: operationDescription
            };
        }
    }
    setRedisClient(redisClient) {
        this.redisClient = redisClient;
    }
    setDbConnection(dbConnection) {
        this.dbConnection = dbConnection;
    }
}
exports.BalanceUtils = BalanceUtils;
//# sourceMappingURL=BalanceUtils.js.map