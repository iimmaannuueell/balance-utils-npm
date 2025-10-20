interface BalanceResult {
  success: boolean;
  newBalance?: number;
  oldBalance?: number;
  balance?: number;
  required?: number;
  creditedAmount?: number;
  amount?: number;
  isSufficient?: boolean;
  operation?: string;
  balanceKey?: string;
  error?: string;
  available?: number;
  redisError?: string;
}

/**
 * Utility class for handling balances and debit operations with dependency injection
 */
export class BalanceUtils {
  private redisClient: any;
  private dbConnection?: any; // Optional database connection for fallback

  /**
   * Constructor for BalanceUtils with dependency injection
   * @param redisClient - Redis client instance with .get() and .set() methods
   * @param dbConnection - Optional database connection for fallback operations
   */
  constructor(redisClient: any, dbConnection?: any) {
    this.redisClient = redisClient;
    this.dbConnection = dbConnection;
  }

  /**
   * Check balance and debit if sufficient funds are available - all in one method
   * @param balanceKey - The Redis key for the balance
   * @param amount - The amount to debit
   * @param operationDescription - Description of the operation for logging
   * @returns Result with success status, new balance, and details
   */
  async checkAndDebitBalance(
    balanceKey: string,
    amount: number = 1,
    operationDescription: string = 'Verification'
  ): Promise<BalanceResult> {
    try {
      let currentBalance = 0;
      const balanceFromRedis = await this.redisClient.get(balanceKey);
      
      if (balanceFromRedis !== null) {
        currentBalance = parseFloat(balanceFromRedis.toString());

        if (currentBalance >= amount) {
          // Only debit if sufficient balance (won't go negative)
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
        } else {
          console.log(`${operationDescription} - Insufficient balance in Redis. Required: ${amount}, Available: ${currentBalance}`);
          return {
            success: false,
            error: 'Insufficient balance',
            required: amount,
            available: currentBalance,
            operation: operationDescription
          };
        }
      } else {
        console.log(`${operationDescription} - Balance not found in Redis for key: ${balanceKey}`);
        return {
          success: false,
          error: 'Balance not found in Redis',
          operation: operationDescription
        };
      }
    } catch (redisError: any) {
      console.error(`Error getting/setting balance from Redis during ${operationDescription}:`, redisError);
      
      // If Redis is unavailable, you might want to implement DB fallback here
      return {
        success: false,
        error: 'Redis error',
        redisError: redisError.message,
        operation: operationDescription
      };
    }
  }

  /**
   * Update the Redis client instance
   * @param redisClient - New Redis client instance
   */
  setRedisClient(redisClient: any) {
    this.redisClient = redisClient;
  }

  /**
   * Update the database connection
   * @param dbConnection - New database connection
   */
  setDbConnection(dbConnection: any) {
    this.dbConnection = dbConnection;
  }
}