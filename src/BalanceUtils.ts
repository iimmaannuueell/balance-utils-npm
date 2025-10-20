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
  private dbConnection?: any; // Database connection for fetching business details

  /**
   * Constructor for BalanceUtils with dependency injection
   * @param redisClient - Redis client instance with .get() and .set() methods
   * @param dbConnection - Database connection for fetching business details
   */
  constructor(redisClient: any, dbConnection?: any) {
    this.redisClient = redisClient;
    this.dbConnection = dbConnection;
  }

  /**
   * Check balance and debit if sufficient funds are available based on business context - all in one method
   * @param businessId - The business ID to identify the user and fetch country/custom pricing
   * @param action - The service action (e.g., 'identity bvn verification')
   * @returns Result with success status, new balance, and details
   */
  async checkAndDebitBalance(
    businessId: string,
    action: string
  ): Promise<BalanceResult> {
    // 1. Fetch business details from database
    if (!this.dbConnection) {
      return {
        success: false,
        error: 'Database connection required to fetch business details',
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
          
          return {
            success: true,
            oldBalance: currentBalance,
            newBalance,
            amount: price,
            operation: `${action} charge`,
            balanceKey
          };
        } else {
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
        console.log(`Balance not found in Redis for business ${businessId} key: ${balanceKey}`);
        return {
          success: false,
          error: 'Balance not found in Redis',
          operation: `${action} charge`,
          balanceKey
        };
      }
    } catch (redisError: any) {
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
   * Fetch business details from the database
   * @param businessId - The business ID
   * @returns Business object or null if not found
   */
  private async fetchBusiness(businessId: string): Promise<Business | null> {
    try {
      if (!this.dbConnection) {
        console.error('Database connection/model is required');
        return null;
      }

      // Check if dbConnection is a direct model reference (function with findById/findOne)
      // This check should come first to prioritize model usage
      if (typeof this.dbConnection === 'function' && 
          this.dbConnection.findById && 
          this.dbConnection.findOne) {
        // Direct model reference (like Business from mongoose.model('Business'))
        return await this.dbConnection.findById(businessId).lean();
      }
      // Check if it's an object that has findById and findOne (like a model instance)
      else if (this.dbConnection.findById && this.dbConnection.findOne) {
        // Direct model instance
        return await this.dbConnection.findById(businessId).lean();
      }
      // Check if it's a Mongoose connection object with model method
      else if (this.dbConnection.model && typeof this.dbConnection.model === 'function') {
        // Mongoose connection object - get the Business model from it
        const BusinessModel = this.dbConnection.model('Business');
        return await BusinessModel.findById(businessId).lean();
      } 
      // MongoDB native driver
      else if (this.dbConnection.collection) {
        const collection = this.dbConnection.collection('businesses');
        return await collection.findOne({ _id: businessId });
      } 
      // If dbConnection is a generic function
      else if (typeof this.dbConnection === 'function') {
        return await this.dbConnection('businesses').where('_id', businessId).first();
      }
      // Generic findOne method (for Prisma, etc.)
      else if (this.dbConnection.findOne) {
        return await this.dbConnection.findOne({ _id: businessId });
      }
      
      // If none of the above matched, return null
      console.error('Unsupported database connection type');
      return null;
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
   * Update the database connection
   * @param dbConnection - New database connection
   */
  setDbConnection(dbConnection: any) {
    this.dbConnection = dbConnection;
  }
}