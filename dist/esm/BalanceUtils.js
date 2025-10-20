import { priceListing, nairaPriceList, kePriceList, usdPriceList } from './pricing';
export class BalanceUtils {
    constructor(redisClient, dbConnection) {
        this.redisClient = redisClient;
        this.dbConnection = dbConnection;
    }
    async checkAndDebitBalance(businessId, action) {
        var _a;
        if (!this.dbConnection) {
            return {
                success: false,
                error: 'Database connection required to fetch business details',
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
    async fetchBusiness(businessId) {
        try {
            if (this.dbConnection.model && typeof this.dbConnection.model === 'function') {
                const BusinessModel = this.dbConnection.model('Business');
                return await BusinessModel.findById(businessId).lean();
            }
            else if (this.dbConnection.collection) {
                const collection = this.dbConnection.collection('businesses');
                return await collection.findOne({ _id: businessId });
            }
            else if (this.dbConnection.findOne) {
                return await this.dbConnection.findOne({ _id: businessId });
            }
            else if (typeof this.dbConnection === 'function') {
                return await this.dbConnection('businesses').where('_id', businessId).first();
            }
            else {
                console.error('Unsupported database connection type');
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
    setDbConnection(dbConnection) {
        this.dbConnection = dbConnection;
    }
}
//# sourceMappingURL=BalanceUtils.js.map