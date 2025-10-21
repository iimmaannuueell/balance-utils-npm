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
    private businessModel;
    private transactionModel?;
    constructor(redisClient: any, businessModel: any, transactionModel?: any);
    checkAndDebitBalance(businessId: string, action: string, idempotencyKey?: string): Promise<BalanceResult>;
    private checkExistingTransaction;
    private createTransactionRecord;
    private fetchBusiness;
    setRedisClient(redisClient: any): void;
    setBusinessModel(businessModel: any): void;
    setTransactionModel(transactionModel: any): void;
}
export {};
