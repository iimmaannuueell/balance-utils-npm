# Balance Utils Redis

A Redis-based balance checking and debiting utility for Node.js applications with automatic pricing resolution. This package allows you to easily check and debit balances stored in Redis based on business context and service types with a single function call using dependency injection for clean architecture.

## Installation

```bash
npm install balance-utils-redis
```

## Prerequisites

You need to have:
- A Redis client connected to your Redis server (supports most Redis clients with `.get()` and `.set()` methods)
- A database connection for fetching business details (MongoDB/Mongoose, etc.)

## Usage

### TypeScript
```typescript
import { BalanceUtils } from 'balance-utils-redis';
import Redis from 'ioredis';
import mongoose from 'mongoose'; // or your preferred DB connection

// Create Redis client instance
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize BalanceUtils with both Redis and Database connections
const balanceService = new BalanceUtils(redisClient, mongoose.connection);

// Check and debit balance based on business context and service type
const result = await balanceService.checkAndDebitBalance(
  'business123',              // businessId
  'identity bvn verification' // action/service type
);

if (result.success) {
  console.log('Balance debited successfully. New balance:', result.newBalance);
} else {
  console.log('Balance operation failed:', result.error);
}
```

### JavaScript (CommonJS)
```javascript
const { BalanceUtils } = require('balance-utils-redis');
const Redis = require('ioredis');

// Create Redis client instance
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize BalanceUtils with both Redis and Database connections
const balanceService = new BalanceUtils(redisClient, dbConnection);

// Check and debit balance based on business context and service type
balanceService.checkAndDebitBalance(
  'business123',              // businessId
  'identity bvn verification' // action/service type
).then(result => {
  if (result.success) {
    console.log('Balance debited successfully. New balance:', result.newBalance);
  } else {
    console.log('Balance operation failed:', result.error);
  }
});
```

### JavaScript (ES Modules)
```javascript
import { BalanceUtils } from 'balance-utils-redis';
import Redis from 'ioredis';

// Create Redis client instance
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize BalanceUtils with both Redis and Database connections
const balanceService = new BalanceUtils(redisClient, dbConnection);

// Check and debit balance based on business context and service type
const result = await balanceService.checkAndDebitBalance(
  'business123',              // businessId
  'identity bvn verification' // action/service type
);

if (result.success) {
  console.log('Balance debited successfully. New balance:', result.newBalance);
} else {
  console.log('Balance operation failed:', result.error);
}
```

## API

### Constructor: `new BalanceUtils(redisClient, dbConnection)`

Initializes the BalanceUtils instance with dependency injection.

#### Parameters

- `redisClient`: Redis client instance with .get() and .set() methods
- `dbConnection`: Database connection for fetching business details (MongoDB/Mongoose, Prisma, etc.)

### Instance Method: `balanceService.checkAndDebitBalance(businessId, action)`

Checks if the balance for the business is sufficient and debits the appropriate amount based on the service type and business context.

#### Parameters

- `businessId` (string): The business ID to identify the user and fetch country/custom pricing
- `action` (string): The service action (e.g., 'identity bvn verification')

#### Returns

Promise resolving to an object with the following properties:

- `success` (boolean): Indicates if the operation was successful
- `newBalance` (number, optional): The new balance after deduction (present if success is true)
- `oldBalance` (number, optional): The previous balance before deduction (present if success is true)
- `amount` (number, optional): The amount debited (present if success is true)
- `operation` (string): Operation description
- `balanceKey` (string): The Redis key that was used for the operation
- `error` (string, optional): Error message if the operation failed
- `required` (number, optional): Amount required (present if insufficient balance)
- `available` (number, optional): Available balance (present if insufficient balance)
- `redisError` (string, optional): Redis error message if Redis operation failed
- `serviceInfo` (object, optional): Information about the service pricing

### How Pricing Resolution Works

The package automatically:
1. Fetches business details using the database connection
2. Determines the appropriate currency based on business country vs. service country
3. Looks up the correct price from the pricing lists (nairaPriceList, kePriceList, usdPriceList)
4. Checks for custom business pricing overrides
5. Builds the balance key internally as `wallet:${businessId}:${currency}`
6. Processes the balance check and debit operation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a new Pull Request

## License

MIT