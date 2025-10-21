import { priceListing, nairaPriceList, kePriceList, usdPriceList } from './pricing';

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

interface Business {
  _id: string;
  country: string;
  pricingId?: Record<string, number>;
  [key: string]: any; // Allow other business properties
}

// Define types for pricing lists to avoid TypeScript error
interface PriceInfo {
  sourceCost: number;
  price: number;
  country: string;
}

type PriceList = Record<string, PriceInfo>;

/**
 * Utility class for handling balances and debit operations with dependency injection and automatic pricing
 */
export class BalanceUtils {
  private redisClient: any;
  private businessModel: any; // Business model for fetching business details
  private transactionModel?: any; // Optional Transaction model for idempotency checks

  /**
   * Constructor for BalanceUtils with dependency injection
   * @param redisClient - Redis client instance with .get() and .set() methods
   * @param businessModel - Business model for fetching business details
   * @param transactionModel - Optional Transaction model for idempotency checks
   */
  constructor(redisClient: any, businessModel: any, transactionModel?: any) {
    this.redisClient = redisClient;
    this.businessModel = businessModel;
    this.transactionModel = transactionModel;
  }

  /**
   * Check balance and debit if sufficient funds are available based on business context - all in one method
   * @param businessId - The business ID to identify the user and fetch country/custom pricing
   * @param action - The service action (e.g., 'identity bvn verification')
   * @param idempotencyKey - Optional idempotency key to prevent duplicate transactions
   * @returns Result with success status, new balance, and details
   */
  async checkAndDebitBalance(
    businessId: string,
    action: string,
    idempotencyKey?: string
  ): Promise<BalanceResult> {
    // 0. Check for duplicate transaction if idempotency key is provided
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

    // 1. Fetch business details from database
    if (!this.businessModel) {
      return {
        success: false,
        error: 'Business model required to fetch business details',
        operation: `Failed to retrieve business ${businessId}`
      };
    }
    
    const business: Business | null = await this.fetchBusiness(businessId);
    if (!business) {
      return {
        success: false,
        error: `Business not found: ${businessId}`,
        operation: `Failed to retrieve business ${businessId}`
      };
    }

    // 2. Determine currency based on business country (like your billing service)
    let currency = 'ngn';
    let priceList: PriceList = nairaPriceList as PriceList; // default
    
    const actionCountry = (priceListing as Record<string, any>)[action]?.country;
    if (actionCountry && business.country && 
        actionCountry !== business.country.toLowerCase()) {
      priceList = usdPriceList as PriceList;
      currency = 'usd';
    } else if (business.country.toLowerCase() === 'kenya') {
      priceList = kePriceList as PriceList;
      currency = 'kes';
    } else if (business.country.toLowerCase() === 'nigeria') {
      priceList = nairaPriceList as PriceList;
      currency = 'ngn';
    } else {
      // Default to USD for other countries
      priceList = usdPriceList as PriceList;
      currency = 'usd';
    }

    // 3. Build balance key internally
    const balanceKey = `wallet:${businessId}:${currency}`;
    
    // 4. Get price with custom pricing support (like your billing service)
    const actionKey = action.replace(/\s+/g, "_");
    let price = 0;
    
    if (action in priceList) {
      // Use custom business pricing if available, otherwise use default pricing
      if (business.pricingId) {
        price = business.pricingId[actionKey] || (priceList as Record<string, any>)[action].price;
      } else {
        price = (priceList as Record<string, any>)[action].price;
      }
    }

    // 5. Perform balance check and debit
    try {
      let currentBalance = 0;
      const balanceFromRedis = await this.redisClient.get(balanceKey);
      
      if (balanceFromRedis !== null) {
        currentBalance = parseFloat(balanceFromRedis.toString());

        if (currentBalance >= price) {
          // Only debit if sufficient balance (won't go negative)
          const newBalance = currentBalance - price;
          await this.redisClient.set(balanceKey, newBalance.toString());
          console.log(`${action} balance debited for business ${businessId}. Amount: ${price}, New balance: ${newBalance}`);
          
          // Create transaction record if transaction model is provided and idempotency key exists
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
        } else {
          // Create failed transaction record if transaction model is provided and idempotency key exists
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
      } else {
        // Create failed transaction record if transaction model is provided and idempotency key exists
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
    } catch (redisError: any) {
      // Create failed transaction record if transaction model is provided and idempotency key exists
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

  /**
   * Check if a transaction with the given idempotency key already exists
   * @param idempotencyKey - The idempotency key to check
   * @returns Transaction object if exists, null otherwise
   */
  private async checkExistingTransaction(idempotencyKey: string) {
    if (!this.transactionModel) {
      return null;
    }
    
    try {
      // Assuming the transaction model has an 'idempotencyKey' field
      return await this.transactionModel.findOne({ idempotencyKey }).lean();
    } catch (error) {
      console.error(`Error checking existing transaction with idempotency key ${idempotencyKey}:`, error);
      return null; // If there's an error checking, we'll proceed as if no transaction exists
    }
  }

  /**
   * Create a transaction record
   * @param idempotencyKey - The idempotency key
   * @param businessId - The business ID
   * @param action - The action/service name
   * @param amount - The amount charged
   * @param currency - The currency used
   * @param status - The transaction status
   */
  private async createTransactionRecord(idempotencyKey: string, businessId: string, action: string, amount: number, currency: string, status: string) {
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
    } catch (error) {
      console.error(`Error creating transaction record for idempotency key ${idempotencyKey}:`, error);
    }
  }

  /**
   * Fetch business details from the database
   * @param businessId - The business ID
   * @returns Business object or null if not found
   */
  private async fetchBusiness(businessId: string): Promise<Business | null> {
    try {
      if (!this.businessModel) {
        console.error('Business model is required');
        return null;
      }

      // Check if businessModel is a direct model reference (function with findById/findOne)
      if (typeof this.businessModel === 'function' && 
          this.businessModel.findById && 
          this.businessModel.findOne) {
        // Direct model reference (like Business from mongoose.model('Business'))
        return await this.businessModel.findById(businessId).lean();
      }
      // Check if it's an object that has findById and findOne (like a model instance)
      else if (this.businessModel.findById && this.businessModel.findOne) {
        // Direct model instance
        return await this.businessModel.findById(businessId).lean();
      }
      // If none of the above matched, return null
      else {
        console.error('Business model is not in expected format');
        return null;
      }
    } catch (error) {
      console.error(`Error fetching business ${businessId}:`, error);
      return null;
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
   * Update the business model
   * @param businessModel - New business model
   */
  setBusinessModel(businessModel: any) {
    this.businessModel = businessModel;
  }

  /**
   * Update the transaction model
   * @param transactionModel - New transaction model
   */
  setTransactionModel(transactionModel: any) {
    this.transactionModel = transactionModel;
  }
}