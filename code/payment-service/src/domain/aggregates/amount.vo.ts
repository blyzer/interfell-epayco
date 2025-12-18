/**
 * Amount - Value Object
 * 
 * Representa una cantidad de dinero con validaciones y operaciones.
 * 
 * Por qué es un Value Object y no solo un number:
 * - Encapsula validaciones (no negativos, precisión 2 decimales)
 * - Operaciones monetarias seguras
 * - Previene errores de tipo (no puedes pasar Amount donde se espera number)
 * - Facilita cambios futuros (moneda fija, conversión, etc.)
 * 
 * Ejemplo:
 * const amount = Amount.create(100000, 'COP')
 * const doubled = amount.multiply(2) // 200000
 * amount.getValue() // 100000
 * amount.getCurrency() // 'COP'
 */

export class Amount {
  private constructor(
    private readonly value: number,
    private readonly currency: string = 'COP'
  ) {
    // Validaciones en constructor privado
    if (!Number.isFinite(value)) {
      throw new Error('Amount debe ser un número válido');
    }
    if (value < 0) {
      throw new Error('Amount no puede ser negativo');
    }
    // Validar que no tenga más de 2 decimales
    if (!Number.isInteger(value * 100)) {
      throw new Error('Amount debe tener máximo 2 decimales');
    }
  }

  /**
   * Crea una instancia de Amount
   * @param value cantidad en unidades (ej: 100000 COP)
   * @param currency moneda (default: COP)
   * @returns instancia de Amount
   * @throws Error si value es negativo o inválido
   */
  static create(value: number, currency: string = 'COP'): Amount {
    return new Amount(value, currency);
  }

  /**
   * Crea un Amount desde una cantidad en string
   * Útil para parsear de JSON/API
   */
  static fromString(valueStr: string, currency: string = 'COP'): Amount {
    const parsed = parseFloat(valueStr);
    if (isNaN(parsed)) {
      throw new Error(`No se puede parsear "${valueStr}" como número`);
    }
    return new Amount(parsed, currency);
  }

  /**
   * Obtiene el valor numérico
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Obtiene la moneda
   */
  getCurrency(): string {
    return this.currency;
  }

  /**
   * Suma otro Amount (si tienen la misma moneda)
   */
  add(other: Amount): Amount {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden sumar monedas diferentes: ${this.currency} + ${other.currency}`
      );
    }
    return new Amount(this.value + other.value, this.currency);
  }

  /**
   * Resta otro Amount
   */
  subtract(other: Amount): Amount {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden restar monedas diferentes: ${this.currency} - ${other.currency}`
      );
    }
    const result = this.value - other.value;
    return new Amount(result, this.currency);
  }

  /**
   * Multiplica por un factor numérico
   */
  multiply(factor: number): Amount {
    if (!Number.isFinite(factor)) {
      throw new Error('Factor debe ser un número válido');
    }
    const result = this.value * factor;
    return new Amount(result, this.currency);
  }

  /**
   * Divide por un divisor
   */
  divide(divisor: number): Amount {
    if (divisor === 0) {
      throw new Error('No se puede dividir por cero');
    }
    if (!Number.isFinite(divisor)) {
      throw new Error('Divisor debe ser un número válido');
    }
    const result = this.value / divisor;
    return new Amount(result, this.currency);
  }

  /**
   * Compara si es igual
   */
  equals(other: Amount): boolean {
    return this.value === other.value && this.currency === other.currency;
  }

  /**
   * Compara si es mayor que
   */
  isGreaterThan(other: Amount): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden comparar monedas diferentes: ${this.currency} vs ${other.currency}`
      );
    }
    return this.value > other.value;
  }

  /**
   * Compara si es mayor o igual
   */
  isGreaterThanOrEqual(other: Amount): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden comparar monedas diferentes: ${this.currency} vs ${other.currency}`
      );
    }
    return this.value >= other.value;
  }

  /**
   * Compara si es menor que
   */
  isLessThan(other: Amount): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden comparar monedas diferentes: ${this.currency} vs ${other.currency}`
      );
    }
    return this.value < other.value;
  }

  /**
   * Compara si es menor o igual
   */
  isLessThanOrEqual(other: Amount): boolean {
    if (this.currency !== other.currency) {
      throw new Error(
        `No se pueden comparar monedas diferentes: ${this.currency} vs ${other.currency}`
      );
    }
    return this.value <= other.value;
  }

  /**
   * Verifica si es cero
   */
  isZero(): boolean {
    return this.value === 0;
  }

  /**
   * Verifica si es positivo
   */
  isPositive(): boolean {
    return this.value > 0;
  }

  /**
   * Obtiene valor negativo (para compensaciones)
   */
  negate(): Amount {
    return new Amount(-this.value, this.currency);
  }

  /**
   * Obtiene valor absoluto
   */
  abs(): Amount {
    return new Amount(Math.abs(this.value), this.currency);
  }

  /**
   * Formatea para presentación (ej: "100,000.00 COP")
   */
  format(): string {
    return `${this.value.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${this.currency}`;
  }

  /**
   * Para debugging y logs
   */
  toString(): string {
    return `Amount(${this.value} ${this.currency})`;
  }
}
