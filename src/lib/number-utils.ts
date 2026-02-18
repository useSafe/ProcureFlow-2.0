/**
 * Utility functions for number formatting with thousand separators
 */

/**
 * Format number with thousand separators (commas)
 * Input: "5000000" or 5000000
 * Output: "5,000,000"
 */
export function formatNumberWithCommas(value: string | number): string {
    if (!value && value !== 0) return '';

    const stringValue = typeof value === 'number' ? value.toString() : value;

    // Remove existing commas
    const cleanValue = stringValue.replace(/,/g, '');

    // Split into integer and decimal parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Reconstruct with decimal if present
    return decimalPart !== undefined
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;
}

/**
 * Remove thousand separators (commas) for storage
 * Input: "5,000,000"
 * Output: "5000000"
 */
export function removeCommas(value: string): string {
    if (!value) return '';
    return value.replace(/,/g, '');
}

/**
 * Handle input change with automatic comma insertion
 * This function formats the input value and calls the setter
 */
export function handleNumberInput(
    value: string,
    setter: (val: string) => void
): void {
    // Remove all non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    const sanitized = parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : cleanValue;

    // Store the clean value (without commas)
    setter(sanitized);
}

/**
 * Get display value with commas for input fields
 */
export function getDisplayValue(value: string): string {
    if (!value) return '';
    return formatNumberWithCommas(value);
}
