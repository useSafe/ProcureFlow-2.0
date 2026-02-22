import { Procurement } from '@/types/procurement';
import { format } from 'date-fns';

/**
 * Format date for CSV export
 */
export const formatDateForExport = (date: string | undefined): string => {
    if (!date) return '';
    try {
        return format(new Date(date), 'MM/dd/yyyy');
    } catch {
        return '';
    }
};

/**
 * Map procurement record to SVP CSV row
 */
export const mapProcurementToSVPRow = (procurement: Procurement): Record<string, any> => {
    return {
        'Particulars': procurement.projectName || '',
        'PR No.': procurement.prNumber,
        'End User': procurement.division || '',
        'ABC (Pesos)': procurement.abc || '',
        'Status': procurement.procurementStatus || '',
        'Date Status Updated': formatDateForExport(procurement.dateStatusUpdated),
        'Remarks': procurement.description || '',
        'Received PR for Action': formatDateForExport(procurement.receivedPrDate),
        'PR Deliberated': formatDateForExport(procurement.prDeliberatedDate),
        'Published': formatDateForExport(procurement.publishedDate),
        'RFQ for Canvass': formatDateForExport(procurement.rfqCanvassDate),
        'RFQ Opening': formatDateForExport(procurement.rfqOpeningDate),
        'BAC Resolution': formatDateForExport(procurement.bacResolutionDate),
        'Forwarded GSD for P.O.': formatDateForExport(procurement.forwardedGsdDate),
        'Staff Incharge': procurement.createdByName || '',
        'Supplier': procurement.supplier || '',
        'Bid Amount': procurement.bidAmount || '',
        'Notes': procurement.notes || '',
        'Progress Status': procurement.procurementStatus || ''
    };
};

/**
 * Map procurement record to Regular Bidding CSV row
 */
export const mapProcurementToRegularBiddingRow = (procurement: Procurement): Record<string, any> => {
    return {
        'Particulars': procurement.projectName || '',
        'PR No.': procurement.prNumber,
        'End User': procurement.division || '',
        'ABC (Pesos)': procurement.abc || '',
        'Status': procurement.procurementStatus || '',
        'Date Status Updated': formatDateForExport(procurement.dateStatusUpdated),
        'Remarks': procurement.description || '',
        'Received PR for Action': formatDateForExport(procurement.receivedPrDate),
        'PR Deliberated': formatDateForExport(procurement.prDeliberatedDate),
        'Published': formatDateForExport(procurement.publishedDate),
        'Pre-bid': formatDateForExport(procurement.preBidDate),
        'Bid Opening': formatDateForExport(procurement.bidOpeningDate),
        'Bid Evaluation Report': formatDateForExport(procurement.bidEvaluationDate),
        'BAC Resolution': formatDateForExport(procurement.bacResolutionDate),
        'Post-Qualification': formatDateForExport(procurement.postQualDate),
        'Post-Qualification Report': formatDateForExport(procurement.postQualReportDate),
        'Forwarded to OAPIA': formatDateForExport(procurement.forwardedOapiDate),
        'NOA': formatDateForExport(procurement.noaDate),
        'Contract Date': formatDateForExport(procurement.contractDate),
        'NTP': formatDateForExport(procurement.ntpDate),
        'Awarded to': procurement.supplier || '',
        'Staff Incharge': procurement.createdByName || '',
        'Bid Amount': procurement.bidAmount || '',
        'Notes': procurement.notes || '',
        'Progress Status': procurement.procurementStatus || ''
    };
};

/**
 * Generate CSV content from array of objects
 */
const objectsToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            const escaped = ('' + value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

/**
 * Generate SVP export CSV
 */
export const generateSVPExport = (procurements: Procurement[]): string => {
    const svpRecords = procurements.filter(p => p.procurementType === 'SVP');
    const rows = svpRecords.map(mapProcurementToSVPRow);
    return objectsToCSV(rows);
};

/**
 * Generate Regular Bidding export CSV
 */
export const generateRegularBiddingExport = (procurements: Procurement[]): string => {
    const regularRecords = procurements.filter(p => p.procurementType === 'Regular Bidding');
    const rows = regularRecords.map(mapProcurementToRegularBiddingRow);
    return objectsToCSV(rows);
};

/**
 * Download CSV file
 */
export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
