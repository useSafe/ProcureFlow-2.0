export type ProcurementStatus = 'active' | 'archived';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProgressStatus = 'Pending' | 'Success' | 'Failed' | 'Cancelled';

// Location Hierarchy Types
export interface Cabinet {
    id: string;
    name: string;
    code: string; // e.g., "C1", "C2"
    description?: string;
    createdAt: string;
}

export interface Shelf {
    id: string;
    cabinetId: string;
    name: string;
    code: string; // e.g., "S1", "S2"
    description?: string;
    createdAt: string;
}

export interface Folder {
    id: string;
    shelfId: string;
    name: string;
    code: string; // e.g., "F1", "F2"
    description?: string;
    color?: string; // Hex color code
    stackNumber?: number; // For ordering
    createdAt: string;
}

export interface Box {
    id: string;
    name: string;
    code: string; // e.g., "B1"
    description?: string;
    createdAt: string;
}

export interface Division {
    id: string;
    name: string;
    abbreviation: string; // e.g., "IT", "HR"
    createdAt: string;
}

// Expanded Checklist based on user image
export interface ProcurementChecklist {
    noticeToProceed: boolean; // A
    contractOfAgreement: boolean; // B
    noticeOfAward: boolean; // C
    bacResolutionAward: boolean; // D
    postQualReport: boolean; // E
    noticePostQual: boolean; // F
    bacResolutionPostQual: boolean; // G
    abstractBidsEvaluated: boolean; // H
    twgBidEvalReport: boolean; // I
    minutesBidOpening: boolean; // J
    resultEligibilityCheck: boolean; // K
    biddersTechFinancialProposals: boolean; // L
    minutesPreBid: boolean; // M
    biddingDocuments: boolean; // N
    otherDocsPeculiar: boolean; // O
    // O.1 - O.4
    inviteObservers: boolean;
    officialReceipt: boolean;
    boardResolution: boolean;
    philgepsAwardNotice: boolean;
    // P
    inviteApplyEligibility: boolean;
    philgepsPosting: boolean; // P.1
    websitePosting: boolean; // P.2
    postingCertificate: boolean; // P.3
    // Q
    fundsAvailability: boolean;
}

// Simplified Procurement (File Record)
export interface Procurement {
    id: string;
    prNumber: string;
    description: string;
    dateAdded: string; // Date the record was added to system

    // Location tracking (Cabinet > Shelf > Folder OR Box)
    cabinetId?: string | null;
    shelfId?: string | null;
    folderId?: string | null;
    boxId?: string | null;

    // Status
    status: ProcurementStatus;
    urgencyLevel: UrgencyLevel;
    progressStatus?: ProgressStatus; // New: Pending, Success, Failed

    // Metadata
    procurementType?: 'Regular Bidding' | 'SVP' | 'Attendance Sheets' | 'Receipt' | 'Others';
    projectName?: string;
    division?: string; // Stores the Division Abbreviation or Name (User requested Dropdown reflecting this)
    procurementDate?: string; // New: Date Published / Procurement Date (ISO)
    disposalDate?: string;

    checklist?: Partial<ProcurementChecklist>;

    // Borrower tracking
    borrowedBy?: string;
    borrowerDivision?: string; // New: Division of the borrower, separate from file division
    borrowedDate?: string;
    returnDate?: string;
    returnedBy?: string; // New: Name of the person who returned the file

    // Stack number (position in folder, only for 'archived'/Available files)
    stackNumber?: number;
    stackOrderDate?: number; // Timestamp for consistent stack ordering

    // Optional metadata
    tags: string[];
    notes?: string;

    // User tracking
    createdBy: string;
    createdByName: string;
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
    role: 'admin' | 'user';
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
