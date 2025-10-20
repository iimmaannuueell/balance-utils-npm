# Balance Utils Redis

A Redis-based balance checking and debiting utility for Node.js applications. This package allows you to easily check and debit balances stored in Redis with a single function call using dependency injection for clean architecture.

## Installation

```bash
npm install balance-utils-redis
```

## Prerequisites

You need to have a Redis client connected to your Redis server. This package supports most Redis clients that have `.get()` and `.set()` methods, such as:
- [ioredis](https://github.com/luin/ioredis)
- [redis](https://github.com/redis/node-redis) (Node Redis)

## Usage

### TypeScript
```typescript
import { BalanceUtils } from 'balance-utils-redis';
import Redis from 'ioredis';

// Create Redis client instance
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize BalanceUtils with dependency injection
const balanceService = new BalanceUtils(redisClient);
// Or with database connection for fallback: new BalanceUtils(redisClient, dbConnection);

// Check and debit balance
const balanceKey = 'wallet:user123:ngn';
const result = await balanceService.checkAndDebitBalance(
  balanceKey,
  40, // amount to debit
  'Identity verification charge' // operation description (optional, defaults to 'Verification')
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

// Initialize BalanceUtils with dependency injection
const balanceService = new BalanceUtils(redisClient);

// Check and debit balance
const balanceKey = 'wallet:user123:ngn';
balanceService.checkAndDebitBalance(
  balanceKey,
  40,
  'Identity verification charge'
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

// Initialize BalanceUtils with dependency injection
const balanceService = new BalanceUtils(redisClient);

// Check and debit balance
const balanceKey = 'wallet:user123:ngn';
const result = await balanceService.checkAndDebitBalance(
  balanceKey,
  40,
  'Identity verification charge'
);

if (result.success) {
  console.log('Balance debited successfully. New balance:', result.newBalance);
} else {
  console.log('Balance operation failed:', result.error);
}
```

## API

### Constructor: `new BalanceUtils(redisClient, dbConnection?)`

Initializes the BalanceUtils instance with dependency injection.

#### Parameters

- `redisClient`: Redis client instance with `.get()` and `.set()` methods
- `dbConnection` (optional): Database connection for fallback operations

### Instance Method: `balanceService.checkAndDebitBalance(balanceKey, amount, operationDescription)`

Checks if the balance at `balanceKey` is sufficient and debits the specified `amount` if possible.

#### Parameters

- `balanceKey` (string): The Redis key for the balance
- `amount` (number): The amount to debit (default: 1)
- `operationDescription` (string): Description of the operation for logging (default: 'Verification')

#### Returns

Promise resolving to an object with the following properties:

- `success` (boolean): Indicates if the operation was successful
- `newBalance` (number, optional): The new balance after deduction (present if success is true)
- `oldBalance` (number, optional): The previous balance before deduction (present if success is true)
- `amount` (number, optional): The amount debited (present if success is true)
- `operation` (string): Operation description
- `error` (string, optional): Error message if the operation failed
- `required` (number, optional): Amount required (present if insufficient balance)
- `available` (number, optional): Available balance (present if insufficient balance)
- `redisError` (string, optional): Redis error message if Redis operation failed

### Instance Methods for Dependency Management

- `setRedisClient(redisClient)`: Update the Redis client instance
- `setDbConnection(dbConnection)`: Update the database connection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a new Pull Request

## License

MIT