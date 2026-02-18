/**
 * Utility functions for PR Number management
 */

import { Procurement } from '@/types/procurement';

/**
 * Format sequence number with leading zeros (001, 002, etc.)
 */
export function formatSequence(num: number): string {
    if (num < 10) return `00${num}`;
    if (num < 100) return `0${num}`;
    return `${num}`;
}

/**
 * Construct PR Number from components
 * Format: {DIVISION_ACRONYM}-{MONTH}-{YEAR}-{SEQUENCE}
 * Example: OSD-FEB-2026-001
 */
export function constructPrNumber(
    divisionAcronym: string,
    month: string,
    year: string,
    sequence: string
): string {
    if (!divisionAcronym || !month || !year || !sequence) {
        return '';
    }
    return `${divisionAcronym}-${month}-${year}-${sequence}`;
}

/**
 * Parse existing PR Number into components
 * Handles format: {DIVISION_ACRONYM}-{MONTH}-{YEAR}-{SEQUENCE}
 */
export function parsePrNumber(prNumber: string): {
    divisionAcronym?: string;
    month?: string;
    year?: string;
    sequence?: string;
} {
    if (!prNumber) return {};

    const parts = prNumber.split('-');
    if (parts.length !== 4) return {};

    return {
        divisionAcronym: parts[0],
        month: parts[1],
        year: parts[2],
        sequence: parts[3],
    };
}

/**
 * Generate next sequence number for given month/year
 * Searches existing procurements for matching month/year and returns next available number
 */
export function getNextPrSequence(
    procurements: Procurement[],
    month: string,
    year: string,
    divisionAcronym?: string
): string {
    if (!month || !year) return '001';

    // Filter procurements by month and year (and optionally division)
    const matchingProcurements = procurements.filter(p => {
        const parsed = parsePrNumber(p.prNumber);
        const monthMatch = parsed.month === month;
        const yearMatch = parsed.year === year;
        const divisionMatch = !divisionAcronym || parsed.divisionAcronym === divisionAcronym;

        return monthMatch && yearMatch && divisionMatch;
    });

    // Extract sequence numbers
    const sequences = matchingProcurements
        .map(p => {
            const parsed = parsePrNumber(p.prNumber);
            return parsed.sequence ? parseInt(parsed.sequence, 10) : 0;
        })
        .filter(num => !isNaN(num));

    // Find max sequence number
    const maxSequence = sequences.length > 0 ? Math.max(...sequences) : 0;

    // Return next sequence number
    return formatSequence(maxSequence + 1);
}
