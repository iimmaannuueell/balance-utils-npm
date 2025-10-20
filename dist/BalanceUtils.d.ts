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
export declare class BalanceUtils {
    private redisClient;
    private dbConnection?;
    constructor(redisClient: any, dbConnection?: any);
    checkAndDebitBalance(balanceKey: string, amount?: number, operationDescription?: string): Promise<BalanceResult>;
    setRedisClient(redisClient: any): void;
    setDbConnection(dbConnection: any): void;
}
export {};
