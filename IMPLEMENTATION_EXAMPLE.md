// Example of how to use the balance-utils-redis package in your verification service
// This would replace the import in your verification.service.ts file

// First, install the package:
// npm install balance-utils-redis

// Then update your imports in verification.service.ts:
import { BalanceUtils } from 'balance-utils-redis';
import redisClient from '../../config/redis'; // your existing Redis config

// Initialize BalanceUtils with dependency injection at the class level or service initialization
class VerificationService extends BaseService {
  private balanceService: BalanceUtils;
  
  constructor() {
    super();
    this.balanceService = new BalanceUtils(redisClient); // Initialize with your Redis client
    // Optionally with database connection: new BalanceUtils(redisClient, dbConnection);
  }

  public async verifyUserData(query, authBusiness, req: Request) {
    // ... existing code ...
    
    if (req.query.bvn) {
      // ... existing code ...
      
      const currency = 'ngn'
      const balanceKey = `wallet:${businessId.toString()}:${currency}`
      const debitResult = await this.balanceService.checkAndDebitBalance(balanceKey, 40);
      if (!debitResult.success) {
        return this.internalResponse(false, {}, 400, debitResult.error || 'Insufficient balance');
      }
      
      // ... rest of existing code ...
    } else if (req.query.nin) {
      // ... existing code ...
      
      const currency = 'ngn'
      const balanceKey = `wallet:${businessId.toString()}:${currency}`
      const debitResult = await this.balanceService.checkAndDebitBalance(balanceKey, 70);
      if (!debitResult.success) {
        return this.internalResponse(false, {}, 400, debitResult.error || 'Insufficient balance');
      }
      
      // ... rest of existing code ...
    }
    // ... handle other verification types similarly ...
    
    // The usage is cleaner now - no need to pass redisClient every time!
  }
}

// This refactoring allows the BalanceUtils functionality to be used in any service
// that has access to a Redis client, making it reusable across different projects.
// The BalanceUtils instance is initialized once with your dependencies.