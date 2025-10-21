import { priceListing, nairaPriceList, kePriceList, usdPriceList } from './pricing';
export class BalanceUtils {
    constructor(redisClient, businessModel, transactionModel) {
        this.redisClient = redisClient;
        this.businessModel = businessModel;
        this.transactionModel = transactionModel;
    }
    async checkAndDebitBalance(businessId, action, idempotencyKey) {
        var _a;
        if (idempotencyKey && this.transactionModel) {
            const existingTransaction = await this.checkExistingTransaction(idempotencyKey);
            if (existingTransaction) {
                return {
                    success: false,
                    error: `Transaction with idempotency key ${idempotencyKey} already exists`,
                    operation: `Duplicate transaction prevented: ${action}`
                };
            }
        }
        if (!this.businessModel) {
            return {
                success: false,
                error: 'Business model required to fetch business details',
                operation: `Failed to retrieve business ${businessId}`
            };
        }
        const business = await this.fetchBusiness(businessId);
        if (!business) {
            return {
                success: false,
                error: `Business not found: ${businessId}`,
                operation: `Failed to retrieve business ${businessId}`
            };
        }
        let currency = 'ngn';
        let priceList = nairaPriceList;
        const actionCountry = (_a = priceListing[action]) === null || _a === void 0 ? void 0 : _a.country;
        if (actionCountry && business.country &&
            actionCountry !== business.country.toLowerCase()) {
            priceList = usdPriceList;
            currency = 'usd';
        }
        else if (business.country.toLowerCase() === 'kenya') {
            priceList = kePriceList;
            currency = 'kes';
        }
        else if (business.country.toLowerCase() === 'nigeria') {
            priceList = nairaPriceList;
            currency = 'ngn';
        }
        else {
            priceList = usdPriceList;
            currency = 'usd';
        }
        const balanceKey = `wallet:${businessId}:${currency}`;
        const actionKey = action.replace(/\s+/g, "_");
        let price = 0;
        if (action in priceList) {
            if (business.pricingId) {
                price = business.pricingId[actionKey] || priceList[action].price;
            }
            else {
                price = priceList[action].price;
            }
        }
        try {
            let currentBalance = 0;
            const balanceFromRedis = await this.redisClient.get(balanceKey);
            if (balanceFromRedis !== null) {
                currentBalance = parseFloat(balanceFromRedis.toString());
                if (currentBalance >= price) {
                    const newBalance = currentBalance - price;
                    await this.redisClient.set(balanceKey, newBalance.toString());
                    console.log(`${action} balance debited for business ${businessId}. Amount: ${price}, New balance: ${newBalance}`);
                    if (this.transactionModel && idempotencyKey) {
                        await this.createTransactionRecord(idempotencyKey, businessId, action, price, currency, 'success');
                    }
                    return {
                        success: true,
                        oldBalance: currentBalance,
                        newBalance,
                        amount: price,
                        operation: `${action} charge`,
                        balanceKey
                    };
                }
                else {
                    if (this.transactionModel && idempotencyKey) {
                        await this.createTransactionRecord(idempotencyKey, businessId, action, price, currency, 'failed');
                    }
                    console.log(`Insufficient balance for business ${businessId}. Required: ${price}, Available: ${currentBalance}`);
                    return {
                        success: false,
                        error: 'Insufficient balance',
                        required: price,
                        available: currentBalance,
                        operation: `${action} charge`,
                        balanceKey
                    };
                }
            }
            else {
                if (this.transactionModel && idempotencyKey) {
                    await this.createTransactionRecord(idempotencyKey, businessId, action, price, currency, 'failed');
                }
                console.log(`Balance not found in Redis for business ${businessId} key: ${balanceKey}`);
                return {
                    success: false,
                    error: 'Balance not found in Redis',
                    operation: `${action} charge`,
                    balanceKey
                };
            }
        }
        catch (redisError) {
            if (this.transactionModel && idempotencyKey) {
                await this.createTransactionRecord(idempotencyKey, businessId, action, price, currency, 'failed');
            }
            console.error(`Error getting/setting balance from Redis for business ${businessId}, ${action}:`, redisError);
            return {
                success: false,
                error: 'Redis error',
                redisError: redisError.message,
                operation: `${action} charge`,
                balanceKey
            };
        }
    }
    async checkExistingTransaction(idempotencyKey) {
        if (!this.transactionModel) {
            return null;
        }
        try {
            return await this.transactionModel.findOne({ idempotencyKey }).lean();
        }
        catch (error) {
            console.error(`Error checking existing transaction with idempotency key ${idempotencyKey}:`, error);
            return null;
        }
    }
    async createTransactionRecord(idempotencyKey, businessId, action, amount, currency, status) {
        if (!this.transactionModel) {
            return;
        }
        try {
            await this.transactionModel.create({
                idempotencyKey,
                businessId,
                action,
                amount,
                currency,
                status,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error(`Error creating transaction record for idempotency key ${idempotencyKey}:`, error);
        }
    }
    async fetchBusiness(businessId) {
        try {
            if (!this.businessModel) {
                console.error('Business model is required');
                return null;
            }
            if (typeof this.businessModel === 'function' &&
                this.businessModel.findById &&
                this.businessModel.findOne) {
                return await this.businessModel.findById(businessId).lean();
            }
            else if (this.businessModel.findById && this.businessModel.findOne) {
                return await this.businessModel.findById(businessId).lean();
            }
            else {
                console.error('Business model is not in expected format');
                return null;
            }
        }
        catch (error) {
            console.error(`Error fetching business ${businessId}:`, error);
            return null;
        }
    }
    setRedisClient(redisClient) {
        this.redisClient = redisClient;
    }
    setBusinessModel(businessModel) {
        this.businessModel = businessModel;
    }
    setTransactionModel(transactionModel) {
        this.transactionModel = transactionModel;
    }
}
//# sourceMappingURL=BalanceUtils.js.map