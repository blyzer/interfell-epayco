/**
 * TransactionId - Value Object
 * 
 * Representa el identificador único de una transacción.
 * 
 * Por qué es un Value Object y no solo un string UUID:
 * - Encapsula validación de UUID válido
 * - Previene bugs (no puedes pasar cualquier string)
 * - Facilita comparación de identidades
 * - Genera UUID automáticamente si es necesario
 * - Type-safe: TypeScript previene confusiones con otros IDs
 * 
 * Ejemplo:
 * const id = TransactionId.generate()
 * id.getValue() // "550e8400-e29b-41d4-a716-446655440000"
 * 
 * const id2 = TransactionId.from("550e8400-e29b-41d4-a716-446655440000")
 * id.equals(id2) // true
 */

export class TransactionId {
  private constructor(private readonly value: string) {
    // Validar UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      throw new Error(`UUID inválido: ${value}`);
    }
  }

  /**
   * Genera un nuevo UUID v4
   */
  static generate(): TransactionId {
    const uuid = this.generateUuidV4();
    return new TransactionId(uuid);
  }

  /**
   * Crea TransactionId desde un string UUID existente
   * @param value UUID válido
   * @throws Error si no es un UUID válido
   */
  static from(value: string): TransactionId {
    return new TransactionId(value);
  }

  /**
   * Obtiene el valor del UUID
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Compara si dos TransactionIds son iguales
   */
  equals(other: TransactionId): boolean {
    return this.value === other.value;
  }

  /**
   * Para debugging y logs
   */
  toString(): string {
    return this.value;
  }

  /**
   * Para JSON serialización
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * Genera UUID v4 siguiendo RFC 4122
   * Implementación simple pero efectiva para Node.js
   * 
   * Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * donde x es cualquier hex digit (0-9a-f)
   * y y es 8, 9, a, o b
   */
  private static generateUuidV4(): string {
    // Usar crypto si está disponible (Node.js)
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      const array = new Uint8Array(16);
      globalThis.crypto.getRandomValues(array);

      // Establecer versión (4) y variant (RFC 4122)
      array[6] = (array[6] & 0x0f) | 0x40; // version 4
      array[8] = (array[8] & 0x3f) | 0x80; // variant 1

      const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0'));

      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    }

    // Fallback: Math.random() (menos seguro pero funcional)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
