/**
 * WalletId Value Object
 * Encapsulates wallet identifier logic
 * Immutable and type-safe
 */
export class WalletId {
    private readonly value: string;
  
    /**
     * Constructor - Private to enforce factory method
     */
    private constructor(value: string) {
      if (!value || value.trim().length === 0) {
        throw new Error('Wallet ID cannot be empty');
      }
  
      if (value.length < 3) {
        throw new Error('Wallet ID must be at least 3 characters');
      }
  
      if (value.length > 50) {
        throw new Error('Wallet ID cannot exceed 50 characters');
      }
  
      // Validate format: alphanumeric and hyphens only
      if (!/^[a-zA-Z0-9-]+$/.test(value)) {
        throw new Error('Wallet ID can only contain alphanumeric characters and hyphens');
      }
  
      this.value = value;
    }
  
    /**
     * Factory method - Create WalletId from string
     */
    static create(value: string): WalletId {
      return new WalletId(value.trim());
    }
  
    /**
     * Factory method - Generate new WalletId with UUID
     */
    static generate(): WalletId {
      const { v4: uuidv4 } = require('uuid');
      return new WalletId(`wallet-${uuidv4()}`);
    }
  
    /**
     * Get string representation
     */
    toString(): string {
      return this.value;
    }
  
    /**
     * Get primitive value
     */
    valueOf(): string {
      return this.value;
    }
  
    /**
     * Check equality with another WalletId
     */
    equals(other: WalletId): boolean {
      if (!(other instanceof WalletId)) {
        return false;
      }
      return this.value === other.value;
    }
  
    /**
     * Check if this WalletId equals a string value
     */
    equalsString(value: string): boolean {
      return this.value === value;
    }
  
    /**
     * JSON serialization
     */
    toJSON(): string {
      return this.value;
    }
  
    /**
     * Get hash code for collections
     */
    hashCode(): number {
      let hash = 0;
      for (let i = 0; i < this.value.length; i++) {
        const char = this.value.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash;
    }
  
    /**
     * Get length of wallet ID
     */
    get length(): number {
      return this.value.length;
    }
  
    /**
     * Check if WalletId matches pattern
     */
    matches(pattern: RegExp): boolean {
      return pattern.test(this.value);
    }
  
    /**
     * Get prefix of WalletId
     */
    getPrefix(): string {
      const hyphenIndex = this.value.indexOf('-');
      if (hyphenIndex === -1) {
        return this.value;
      }
      return this.value.substring(0, hyphenIndex);
    }
  
    /**
     * Check if WalletId is UUID-based
     */
    isUuidBased(): boolean {
      return this.value.includes('-') && this.value.startsWith('wallet-');
    }
  
    /**
     * Get WalletId as buffer (for hashing)
     */
    toBuffer(): Buffer {
      return Buffer.from(this.value, 'utf-8');
    }
  }
  