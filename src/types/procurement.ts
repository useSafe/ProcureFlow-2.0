// [Removed ProgressStatus - Legacy]

// Location Hierarchy Types
export type ProcurementStatus = 'active' | 'archived';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export interface Cabinet {
    id: string;
    name: string;
    code: string; // e.g., "C1", "C2" (UI: "Drawer")
    description?: string;
    createdAt: string;
}

export interface Shelf {
    id: string;
    cabinetId: string;
    name: string;
    code: string; // e.g., "S1", "S2" (UI: "Cabinet")
    description?: string;
    createdAt: string;
}

export interface Folder {
    id: string;
    shelfId?: string; // Optional now as it can be in a Box
    boxId?: string;   // New: Folder can be inside a Box
    name: string;
    code: string; // e.g., "F1", "F2"
    description?: string;
    color?: string; // Hex color code
    stackNumber?: number; // For ordering
    createdAt: string;
}

export interface Box {
    id: string;
    cabinetId?: string; // Optional: box might be standalone
    shelfId?: string;   // Optional: box might be standalone
    name: string;
    code: string; // e.g., "B1"
    description?: string;
    createdAt: string;
}

export interface Division {
    id: string;
    name: string;
    abbreviation: string; // e.g., "IT", "HR"
    endUser?: string; // Responsible person/head
    createdAt: string;
}

// Checklists (Simplified/Optional in Procurement, detailed in UI)
export interface ProcurementChecklist {
    // We can keep this generic or expand it, but mostly we will just store checks
    [key: string]: boolean | undefined;
}

// Expanded Statuses
export type ProcurementProcessStatus =
    | 'Completed'
    | 'In Progress'
    | 'Returned PR to EU'
    | 'Not yet Acted'
    | 'Failure'
    | 'Cancelled';

// [Removed ProgressStatus - Legacy]

// Simplified Procurement (File Record)
export interface Procurement {
    id: string;
    prNumber: string; // SVP: No Div/User, Regular: No Div/User
    description: string; // "Remarks" in Export
    projectName?: string; // "Particulars" in Export

    dateAdded: string; // System Creation Date

    // Location tracking (Drawer -> Cabinet -> Folder OR Box -> Folder)
    cabinetId?: string | null;
    shelfId?: string | null;
    folderId?: string | null;
    boxId?: string | null;

    // Status (Physical Location)
    status: ProcurementStatus; // 'active' (Borrowed) | 'archived' (Stored)

    // New Fields
    abc?: number;
    procurementStatus?: ProcurementProcessStatus;
    dateStatusUpdated?: string;

    // Monitoring Dates - SVP & Common
    receivedPrDate?: string;
    prDeliberatedDate?: string;
    publishedDate?: string; // Procurement Date
    rfqCanvassDate?: string;
    rfqOpeningDate?: string;
    bacResolutionDate?: string;
    forwardedGsdDate?: string;

    // Monitoring Dates - Regular Bidding
    preBidDate?: string;
    bidOpeningDate?: string;
    bidEvaluationDate?: string;
    postQualDate?: string;
    postQualReportDate?: string;
    forwardedOapiDate?: string; // OAPIA
    noaDate?: string;
    contractDate?: string;
    ntpDate?: string;
    awardedToDate?: string; // Date Awarded

    supplier?: string;
    bidAmount?: number;
    notes?: string;
    remarks?: string; // Explicit remarks field if description is used for something else, but Plan said Remarks <- Description. I'll add this just in case.

    urgencyLevel: UrgencyLevel;

    // Metadata
    procurementType?: 'Regular Bidding' | 'SVP' | 'Attendance Sheets' | 'Receipt' | 'Others';
    division?: string; // "End User"

    procurementDate?: string; // Alias for publishedDate if needed
    disposalDate?: string;

    checklist?: ProcurementChecklist;

    // Borrower tracking
    borrowedBy?: string;
    borrowerDivision?: string;
    borrowedDate?: string;
    returnDate?: string;
    returnedBy?: string;

    // Stack number
    stackNumber?: number;
    stackOrderDate?: number;

    tags: string[];

    // User tracking
    createdBy: string;
    createdByName: string; // "Staff Incharge"
    editedBy?: string;
    editedByName?: string;
    lastEditedAt?: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}


export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'bac-staff' | 'archiver' | 'viewer';
    status: 'active' | 'inactive';
    password?: string;
    createdAt?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
}

export interface ProcurementFilters {
    search: string;
    cabinetId: string;
    shelfId: string;
    folderId: string;
    boxId?: string;
    status: ProcurementStatus | '';
    monthYear: string;
    urgencyLevel: UrgencyLevel | '';
}

export interface DashboardMetrics {
    total: number;
    active: number;
    archived: number;
    critical: number;
}

export interface LocationStats {
    cabinetId: string;
    cabinetName: string;
    count: number;
}

// Helper type for location display
export interface LocationPath {
    cabinet?: Cabinet;
    shelf?: Shelf;
    folder?: Folder;
    box?: Box;
    fullPath: string;
}
