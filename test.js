// Test script to verify the package functionality
import { BalanceUtils } from './dist/index.js';
import Redis from 'ioredis';

// Create a mock Redis client for testing purposes
// In a real application, you would use an actual Redis connection
const mockRedis = {
  data: {},
  async get(key) {
    return this.data[key] || null;
  },
  async set(key, value) {
    this.data[key] = value;
    return 'OK';
  }
};

async function testBalanceUtils() {
  console.log('Testing BalanceUtils functionality...\n');

  // Set an initial balance
  await mockRedis.set('wallet:test_user:ngn', '100');

  // Test successful debit
  console.log('1. Testing successful debit...');
  let result = await BalanceUtils.checkAndDebitBalance(
    mockRedis,
    'wallet:test_user:ngn',
    40,
    'Test debit'
  );
  
  console.log('Result:', result);
  console.log('Success?', result.success);
  console.log('New balance:', result.newBalance);
  console.log('');

  // Test insufficient balance
  console.log('2. Testing insufficient balance...');
  result = await BalanceUtils.checkAndDebitBalance(
    mockRedis,
    'wallet:test_user:ngn',
    100, // Attempt to debit more than available
    'Test insufficient funds'
  );
  
  console.log('Result:', result);
  console.log('Success?', result.success);
  console.log('Error:', result.error);
  console.log('');

  // Test non-existent balance key
  console.log('3. Testing non-existent balance key...');
  result = await BalanceUtils.checkAndDebitBalance(
    mockRedis,
    'wallet:nonexistent:user',
    10,
    'Test missing balance'
  );
  
  console.log('Result:', result);
  console.log('Success?', result.success);
  console.log('Error:', result.error);
  console.log('');

  console.log('All tests completed!');
}

testBalanceUtils().catch(console.error);