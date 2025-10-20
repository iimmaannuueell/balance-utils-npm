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
    serviceInfo?: {
        sourceCost: number;
        price: number;
        country: string;
    };
}
export declare class BalanceUtils {
    private redisClient;
    private dbConnection?;
    constructor(redisClient: any, dbConnection?: any);
    checkAndDebitBalance(businessId: string, action: string): Promise<BalanceResult>;
    private fetchBusiness;
    setRedisClient(redisClient: any): void;
    setDbConnection(dbConnection: any): void;
}
export {};
