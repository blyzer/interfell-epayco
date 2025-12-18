import { WalletId } from './wallet-id.vo';
import { Amount } from './amount.vo';

/**
 * Wallet Aggregate Root
 * Manages wallet state, balance operations, and lock mechanisms
 */
export class Wallet {
  private walletId: WalletId;
  private userId: string;
  private balance: Amount;
  private lockedBalance: Amount;
  private createdAt: Date;
  private updatedAt: Date;

  /**
   * Constructor - Private to enforce factory pattern
   */
  private constructor(
    walletId: WalletId,
    userId: string,
    balance: Amount,
    lockedBalance: Amount = Amount.zero(),
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    this.walletId = walletId;
    this.userId = userId;
    this.balance = balance;
    this.lockedBalance = lockedBalance;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Factory method - Create new wallet
   */
  static create(walletId: WalletId, userId: string, initialBalance: Amount): Wallet {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (initialBalance.isNegative()) {
      throw new Error('Initial balance cannot be negative');
    }

    return new Wallet(walletId, userId, initialBalance);
  }

  /**
   * Restore wallet from persistence
   */
  static restore(
    walletId: WalletId,
    userId: string,
    balance: Amount,
    lockedBalance: Amount,
    createdAt: Date,
    updatedAt: Date,
  ): Wallet {
    return new Wallet(walletId, userId, balance, lockedBalance, createdAt, updatedAt);
  }

  /**
   * Get wallet ID
   */
  getWalletId(): WalletId {
    return this.walletId;
  }

  /**
   * Get user ID
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Get current balance
   */
  getBalance(): Amount {
    return this.balance;
  }

  /**
   * Get locked balance
   */
  getLockedBalance(): Amount {
    return this.lockedBalance;
  }

  /**
   * Get available balance (balance - locked)
   */
  getAvailableBalance(): Amount {
    return this.balance.subtract(this.lockedBalance);
  }

  /**
   * Check if wallet has sufficient available balance
   */
  canDebit(amount: Amount): boolean {
    if (amount.isNegative()) {
      return false;
    }

    return this.getAvailableBalance().isGreaterThanOrEqual(amount);
  }

  /**
   * Debit amount from wallet
   * Throws error if insufficient balance
   */
  debit(amount: Amount): void {
    if (amount.isNegative()) {
      throw new Error('Debit amount cannot be negative');
    }

    if (!this.canDebit(amount)) {
      throw new Error(
        `Insufficient available balance. Required: ${amount.getValue()}, Available: ${this.getAvailableBalance().getValue()}`,
      );
    }

    this.balance = this.balance.subtract(amount);
    this.updatedAt = new Date();
  }

  /**
   * Credit amount to wallet
   */
  credit(amount: Amount): void {
    if (amount.isNegative()) {
      throw new Error('Credit amount cannot be negative');
    }

    this.balance = this.balance.add(amount);
    this.updatedAt = new Date();
  }

  /**
   * Lock balance for pending transaction
   */
  lockBalance(amount: Amount): void {
    if (amount.isNegative()) {
      throw new Error('Lock amount cannot be negative');
    }

    if (!this.canDebit(amount)) {
      throw new Error(
        `Cannot lock more than available balance. Required: ${amount.getValue()}, Available: ${this.getAvailableBalance().getValue()}`,
      );
    }

    this.lockedBalance = this.lockedBalance.add(amount);
    this.updatedAt = new Date();
  }

  /**
   * Unlock previously locked balance
   */
  unlockBalance(amount: Amount): void {
    if (amount.isNegative()) {
      throw new Error('Unlock amount cannot be negative');
    }

    if (this.lockedBalance.isLessThan(amount)) {
      throw new Error(
        `Cannot unlock more than locked balance. Locked: ${this.lockedBalance.getValue()}, Attempted to unlock: ${amount.getValue()}`,
      );
    }

    this.lockedBalance = this.lockedBalance.subtract(amount);
    this.updatedAt = new Date();
  }

  /**
   * Get creation timestamp
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Get last update timestamp
   */
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Convert wallet to DTO for external communication
   */
  toDTO() {
    return {
      walletId: this.walletId.toString(),
      userId: this.userId,
      balance: this.balance.getValue(),
      lockedBalance: this.lockedBalance.getValue(),
      availableBalance: this.getAvailableBalance().getValue(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
