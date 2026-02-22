import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteProcurement, updateProcurement, onProcurementsChange, onCabinetsChange, onShelvesChange, onFoldersChange, onDivisionsChange, onBoxesChange } from '@/lib/storage';
import { Procurement, Cabinet, Shelf, Folder, Box, ProcurementStatus, UrgencyLevel, ProcurementFilters, Division } from '@/types/procurement';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import ProcurementDetailsDialog from '@/components/procurement/ProcurementDetailsDialog';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import { handleNumberInput, getDisplayValue, removeCommas } from '@/lib/number-utils';
import {
    Plus,
    Search,
    MoreVertical,
    FileText,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    MapPin,
    FilterX,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Eye,
    Activity,
    Calendar as CalendarIcon,
    Package,
    Loader2,
    Info
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProcurementProcessStatus, ProcurementType } from '@/types/core';

const MONTHS = [
    { value: 'JAN', label: 'Jan' },
    { value: 'FEB', label: 'Feb' },
    { value: 'MAR', label: 'Mar' },
    { value: 'APR', label: 'Apr' },
    { value: 'MAY', label: 'May' },
    { value: 'JUN', label: 'Jun' },
    { value: 'JUL', label: 'Jul' },
    { value: 'AUG', label: 'Aug' },
    { value: 'SEP', label: 'Sep' },
    { value: 'OCT', label: 'Oct' },
    { value: 'NOV', label: 'Nov' },
    { value: 'DEC', label: 'Dec' },
];

const checklistItems = CHECKLIST_ITEMS;

const MonitoringDateField = ({ label, value, onChange, disabled, activeColor = 'blue' }: { label: string; value: string | undefined; onChange: (date: string | undefined) => void; disabled: boolean; activeColor?: 'blue' | 'purple' | 'emerald' }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dateStr = value ? format(new Date(value), 'yyyy-MM-dd') : '';

    React.useEffect(() => {
        if (inputRef.current && inputRef.current.value !== dateStr) {
            inputRef.current.value = dateStr;
        }
    }, [dateStr]);

    const activeClasses = {
        blue: { border: 'border-blue-500/30', bg: 'bg-blue-900/10', text: 'text-blue-400', checkBg: 'data-[state=checked]:bg-blue-600', checkBorder: 'data-[state=checked]:border-blue-600', ring: 'focus:ring-blue-500' },
        purple: { border: 'border-purple-500/30', bg: 'bg-purple-900/10', text: 'text-purple-400', checkBg: 'data-[state=checked]:bg-purple-600', checkBorder: 'data-[state=checked]:border-purple-600', ring: 'focus:ring-purple-500' },
        emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-900/10', text: 'text-emerald-400', checkBg: 'data-[state=checked]:bg-emerald-600', checkBorder: 'data-[state=checked]:border-emerald-600', ring: 'focus:ring-emerald-500' }
    }[activeColor] as any;

    return (
        <div className={`space-y-2 p-3 rounded-lg border transition-all ${disabled ? 'border-slate-800 bg-slate-900/30 opacity-50' : value ? `${activeClasses.border} ${activeClasses.bg}` : 'border-slate-700 bg-[#1e293b]/50'}`}>
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={!!value}
                    onCheckedChange={(c) => onChange(c ? (value || new Date().toISOString()) : undefined)}
                    disabled={disabled}
                    className={`h-4 w-4 border-slate-500 ${activeClasses.checkBg} ${activeClasses.checkBorder} disabled:opacity-50`}
                />
                <span className={`text-sm font-medium ${value ? activeClasses.text : disabled ? 'text-slate-600' : 'text-slate-300'}`}>{label}</span>
            </div>
            <div className="pl-6">
                <Input
                    ref={inputRef}
                    type="date"
                    max="9999-12-31"
                    defaultValue={dateStr}
                    onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== dateStr) onChange(val ? new Date(val).toISOString() : undefined);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (val !== dateStr) onChange(val ? new Date(val).toISOString() : undefined);
                        }
                    }}
                    disabled={disabled}
                    className={`h-8 px-2 rounded-md bg-[#0f172a] border border-slate-700 text-slate-300 text-xs w-full outline-none ${activeClasses.ring} ${disabled ? 'cursor-not-allowed text-slate-500' : ''} [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert`}
                />
            </div>
        </div>
    );
};

interface ProcurementListProps {
    forcedType?: string; // 'Small Value Procurement(SVP)' | 'Regular Bidding' | etc.
    pageTitle?: string;
}

const ProcurementList: React.FC<ProcurementListProps> = ({ forcedType, pageTitle }) => {
    // Helper Functions
    // Updated Helper to Determine CURRENT Progress Stage (Last Completed Step)
    const getNextStage = (procurement: Procurement): string => {
        // 1. Check if "Not yet Acted" (No dates set)
        // If Status is Failure/Cancelled/Returned, show that instead of next stage? 
        // User asked for "Progress Values should stick to plain text... and the value should be the next of the current setted date"
        // But if it's "Completed", what is the next stage? "Completed"?
        const pStatus = procurement.procurementStatus || 'Not yet Acted';

        if (pStatus === 'Completed') return 'Completed';
        if (pStatus === 'Failure') return 'Failure';
        if (pStatus === 'Cancelled') return 'Cancelled';
        if (pStatus === 'Returned PR to EU') return 'Returned PR to EU';

        const type = procurement.procurementType;

        // Define stages based on type
        // Regular Bidding
        if (type === 'Regular Bidding') {
            if (!procurement.receivedPrDate) return 'Received PR for Action';
            if (!procurement.prDeliberatedDate) return 'PR Deliberated';
            if (!procurement.publishedDate) return 'Published';
            if (!procurement.preBidDate) return 'Pre-bid';
            if (!procurement.bidOpeningDate) return 'Bid Opening';
            if (!procurement.bidEvaluationDate) return 'Bid Evaluation Report';
            if (!procurement.bacResolutionDate) return 'Add BAC Resolution';
            if (!procurement.postQualDate) return 'Post-Qualification';
            if (!procurement.postQualReportDate) return 'Post-Qualification Report';
            if (!procurement.forwardedOapiDate) return 'Forwarded to OAPIA'; // Typo in user prompt "Forwareded"
            if (!procurement.noaDate) return 'NOA';
            if (!procurement.contractDate) return 'Contract Date';
            if (!procurement.ntpDate) return 'NTP';
            // If NTP is set, maybe it's "Awarded"?
            return 'Awarded to Supplier';
        }

        // SVP and others (Default)
        // SVP Monitoring Process:
        // Received PR -> PR Deliberated -> Published -> RFQ for Canvass -> RFQ Opening -> BAC Resolution -> Forwarded GSD -> PO
        if (!procurement.receivedPrDate) return 'Received PR for Action';
        if (!procurement.prDeliberatedDate) return 'PR Deliberated';
        if (!procurement.publishedDate) return 'Published';
        if (!procurement.rfqCanvassDate) return 'RFQ for Canvass';
        if (!procurement.rfqOpeningDate) return 'RFQ Opening';
        if (!procurement.bacResolutionDate) return 'BAC Resolution';
        if (!procurement.forwardedGsdDate) return 'Forwarded GSD for P.O.';

        return 'P.O. Created';
    };
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderIdFromUrl = searchParams.get('folderId');

    const [procurements, setProcurements] = useState<Procurement[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Location Data - Note: cabinets table stores Shelves (Tier 1), shelves table stores Cabinets (Tier 2)
    const [cabinets, setCabinets] = useState<Cabinet[]>([]); // These are actually Shelves (Tier 1)
    const [shelves, setShelves] = useState<Shelf[]>([]); // These are actually Cabinets (Tier 2)
    const [folders, setFolders] = useState<Folder[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [jumpPage, setJumpPage] = useState('');
    const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);



    // Filters (existing)
    const [filters, setFilters] = useState<ProcurementFilters>({
        search: '',
        cabinetId: '',
        shelfId: '',
        folderId: folderIdFromUrl || '',
        boxId: searchParams.get('boxId') || '',
        status: '', // kept for backward compatibility, not used for multi-select
        monthYear: '',
        urgencyLevel: '',
    });

    // New: multi-select status filter state (empty = all)

    const [statusFilters, setStatusFilters] = useState<string[]>([]); // Procurement Status (Active/Archived)
    const [procurementStatusFilters, setProcurementStatusFilters] = useState<string[]>([]);

    // Phase 6 Filters
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [filterDivision, setFilterDivision] = useState<string>('all_divisions');
    const [typeFilters, setTypeFilters] = useState<string[]>([]); // Multi-select Type filter
    const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>(undefined);

    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    // Automatically determined export format based on forcedType
    const exportFormat = forcedType === 'SVP' ? 'svp' : forcedType === 'Regular Bidding' ? 'regular' : 'standard';

    const [exportFilters, setExportFilters] = useState<{
        storageStatus: string;
        division: string;
        year: string;
        abcRange: { min: string; max: string };
        bidAmountRange: { min: string; max: string };
        storageLocation: string;
        processStatus: string;
    }>({
        storageStatus: 'all',
        division: 'all',
        year: 'all',
        abcRange: { min: '', max: '' },
        bidAmountRange: { min: '', max: '' },
        storageLocation: 'all',
        processStatus: 'all'
    });

    // Compute Available Years for Export Dropdown
    const availableExportYears = useMemo(() => {
        const years = new Set<string>();
        procurements.forEach(p => {
            if (p.dateAdded) {
                try {
                    years.add(new Date(p.dateAdded).getFullYear().toString());
                } catch (e) { }
            }
        });
        return Array.from(years).sort().reverse();
    }, [procurements]);

    // Edit Modal State for PR Number Split
    const [editDivisionId, setEditDivisionId] = useState('');
    const [editPrMonth, setEditPrMonth] = useState('');
    const [editPrYear, setEditPrYear] = useState('');
    const [editPrSequence, setEditPrSequence] = useState('');

    useEffect(() => {
        const unsub = onDivisionsChange(setDivisions);
        return () => unsub();
    }, []);
    const [viewProcurement, setViewProcurement] = useState<Procurement | null>(null);
    const [isNonProcurement, setIsNonProcurement] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sorting state
    const [sortField, setSortField] = useState<'name' | 'prNumber' | 'date' | 'stackNumber'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Relocate Modal State
    const [isRelocateDialogOpen, setIsRelocateDialogOpen] = useState(false);
    const [relocateProcurement, setRelocateProcurement] = useState<Procurement | null>(null);
    const [newStackNumber, setNewStackNumber] = useState<number | ''>('');

    const isFolderView = !!filters.folderId && filters.folderId !== 'all_folders';

    const itemsPerPage = 15;

    // --- Helper Functions ---


    const calculateStackNumbers = (procurements: Procurement[], folderId: string): Map<string, number> => {
        // Get all Available files in this folder, sorted by stackNumber then dateAdded
        const availableInFolder = procurements
            .filter(p => p.folderId === folderId && p.status === 'archived')
            .sort((a, b) => {
                // If both have stack numbers, use them
                if (a.stackNumber && b.stackNumber) {
                    return a.stackNumber - b.stackNumber;
                }
                // Otherwise sort by date added (older first)
                return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
            });

        // Assign sequential stack numbers
        const stackMap = new Map<string, number>();
        availableInFolder.forEach((p, index) => {
            stackMap.set(p.id, index + 1);
        });

        return stackMap;
    };

    // Update stack numbers for all files in a folder
    const updateStackNumbersForFolder = async (folderId: string) => {
        const stackMap = calculateStackNumbers(procurements, folderId);

        // Update each file in the folder
        for (const [procId, stackNum] of stackMap.entries()) {
            await updateProcurement(procId, { stackNumber: stackNum });
        }

        // Clear stack number for borrowed files in this folder
        const borrowedInFolder = procurements
            .filter(p => p.folderId === folderId && p.status === 'active');
        for (const proc of borrowedInFolder) {
            if (proc.stackNumber !== undefined) {
                await updateProcurement(proc.id, { stackNumber: undefined });
            }
        }
    };


    // Status change confirmation
    const [pendingStatusChange, setPendingStatusChange] = useState<{
        procurement: Procurement;
        newStatus: ProcurementStatus;
    } | null>(null);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

    // Borrow edit modal
    const [borrowEditModal, setBorrowEditModal] = useState<{
        procurement: Procurement;
        borrowedBy: string;
        borrowerDivision: string;
        borrowedDate?: string;
    } | null>(null);

    // Return modal
    const [returnModal, setReturnModal] = useState<{
        procurement: Procurement;
        returnedBy: string;
    } | null>(null);

    // Helper functions for status
    const getStatusLabel = (status: ProcurementStatus): string => {
        return status === 'active' ? 'Borrowed' : 'Archived';
    };

    const getStatusColor = (status: ProcurementStatus): string => {
        return status === 'active'
            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    };

    // Status change workflow
    const handleStatusChange = (procurement: Procurement, newStatus: ProcurementStatus) => {
        if (newStatus === 'active') {
            // Going to Borrowed - show edit modal
            setBorrowEditModal({
                procurement,
                borrowedBy: procurement.borrowedBy || '',
                borrowerDivision: procurement.borrowerDivision || '',
                borrowedDate: procurement.borrowedDate || new Date().toISOString()
            });
        } else {
            // Going to Available (Archived) - show return modal
            setReturnModal({
                procurement,
                returnedBy: ''
            });
        }
    };

    const saveBorrowChanges = async () => {
        if (!borrowEditModal) return;

        try {
            await updateProcurement(borrowEditModal.procurement.id, {
                borrowedBy: borrowEditModal.borrowedBy,
                borrowerDivision: borrowEditModal.borrowerDivision,
                borrowedDate: borrowEditModal.borrowedDate || new Date().toISOString(),
                status: 'active'
            });

            // Recalculate stack numbers
            await updateStackNumbersForFolder(borrowEditModal.procurement.folderId);

            setBorrowEditModal(null);
            toast.success('Borrow details updated');
        } catch (error) {
            console.error('Failed to update borrow details:', error);
            toast.error('Failed to update borrow details');
        }
    };

    const confirmReturnFile = async () => {
        if (!returnModal) return;
        const { procurement, returnedBy } = returnModal;

        try {
            await updateProcurement(procurement.id, {
                status: 'archived',
                returnDate: new Date().toISOString(),
                returnedBy: returnedBy || undefined
            });

            // Recalculate stack numbers
            await updateStackNumbersForFolder(procurement.folderId);

            setReturnModal(null);
            toast.success('File returned and marked as archived');
        } catch (error) {
            toast.error('Failed to return file');
        }
    };

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubProcurements = onProcurementsChange((data) => {
            setProcurements(data);
            setIsLoading(false);
        });
        const unsubCabinets = onCabinetsChange(setCabinets);
        const unsubShelves = onShelvesChange(setShelves);
        const unsubFolders = onFoldersChange(setFolders);
        const unsubBoxes = onBoxesChange(setBoxes);
        const unsubDivisions = onDivisionsChange(setDivisions);

        return () => {
            unsubProcurements();
            unsubCabinets();
            unsubShelves();
            unsubFolders();
            unsubBoxes();
            unsubDivisions();
        };
    }, []);

    useEffect(() => {
        if (folderIdFromUrl) {
            const folder = folders.find(f => f.id === folderIdFromUrl);
            if (folder) {
                const shelf = shelves.find(s => s.id === folder.shelfId);
                if (shelf) {
                    setFilters(prev => ({
                        ...prev,
                        cabinetId: shelf.cabinetId,
                        shelfId: folder.shelfId,
                        folderId: folderIdFromUrl,
                        boxId: ''
                    }));
                }
            }
        }
    }, [folderIdFromUrl, folders, shelves]);

    // Forced Type Effect
    useEffect(() => {
        if (forcedType) {
            setTypeFilters([forcedType]);
        }
    }, [forcedType]);

    // Read search parameter from URL and populate search box
    useEffect(() => {
        const searchFromUrl = searchParams.get('search');
        if (searchFromUrl) {
            setFilters(prev => ({
                ...prev,
                search: searchFromUrl
            }));
        }

        const boxIdFromUrl = searchParams.get('boxId');
        if (boxIdFromUrl) {
            setFilters(prev => ({
                ...prev,
                boxId: boxIdFromUrl,
                // Clear shelf filters if box is selected
                cabinetId: '',
                shelfId: '',
                folderId: ''
            }));
        }
    }, [searchParams]);

    // Dynamic Edit Form Data
    const [editAvailableShelves, setEditAvailableShelves] = useState<Shelf[]>([]);
    const [editAvailableBoxes, setEditAvailableBoxes] = useState<Box[]>([]);
    const [editAvailableFolders, setEditAvailableFolders] = useState<Folder[]>([]);

    // Cascading Filter Data
    const [filterAvailableShelves, setFilterAvailableShelves] = useState<Shelf[]>([]);
    const [filterAvailableFolders, setFilterAvailableFolders] = useState<Folder[]>([]);

    // Filters (existing)
    // Update edit form cascading dropdowns
    useEffect(() => {
        if (editingProcurement && editingProcurement.cabinetId) {
            setEditAvailableShelves(shelves.filter(s => s.cabinetId === editingProcurement.cabinetId));
        } else {
            setEditAvailableShelves([]);
        }
    }, [editingProcurement?.cabinetId, shelves]);

    // Box filtering
    useEffect(() => {
        if (editingProcurement) {
            // If in Box Storage mode (boxId is not null), show all boxes
            // The user selects a box directly from the list
            if (editingProcurement.boxId !== null && editingProcurement.boxId !== undefined) {
                setEditAvailableBoxes(boxes);
            } else if (editingProcurement.shelfId) {
                // Legacy/Drawer mode: show boxes in specific shelf (if applicable)
                setEditAvailableBoxes(boxes.filter(b => b.shelfId === editingProcurement.shelfId));
            } else {
                setEditAvailableBoxes([]);
            }
        }
    }, [editingProcurement?.shelfId, editingProcurement?.boxId, boxes]);

    // Folder filtering (Tier 2 -> Tier 4 or Tier 3 -> Tier 4)
    useEffect(() => {
        if (editingProcurement) {
            if (editingProcurement.boxId) {
                // If Box is selected, show folders in that box
                setEditAvailableFolders(folders.filter(f => f.boxId === editingProcurement.boxId));
            } else if (editingProcurement.shelfId) {
                // If no Box, show folders in Cabinet (legacy/direct)
                setEditAvailableFolders(folders.filter(f => f.shelfId === editingProcurement.shelfId && !f.boxId));
            } else {
                setEditAvailableFolders([]);
            }
        } else {
            setEditAvailableFolders([]);
        }
    }, [editingProcurement?.shelfId, editingProcurement?.boxId, folders]);

    // Update filter cascading dropdowns
    useEffect(() => {
        if (filters.cabinetId) {
            setFilterAvailableShelves(shelves.filter(s => s.cabinetId === filters.cabinetId));
        } else {
            setFilterAvailableShelves([]);
        }
    }, [filters.cabinetId, shelves]);

    useEffect(() => {
        if (filters.shelfId) {
            setFilterAvailableFolders(folders.filter(f => f.shelfId === filters.shelfId));
        } else {
            setFilterAvailableFolders([]);
        }
    }, [filters.shelfId, folders]);

    // build status options based on current procurements (fall back to common ones)
    // Filter options
    // build status options based on current procurements (fall back to common ones)
    // Filter options
    const statusOptions: ProcurementStatus[] = ['active', 'archived'];
    const typeOptions = ['Regular Bidding', 'SVP'];

    const toggleStatusFilter = (status: string) => {
        setStatusFilters(prev => {
            if (prev.includes(status)) return prev.filter(s => s !== status);
            return [...prev, status];
        });
    };



    const toggleTypeFilter = (type: string) => {
        setTypeFilters(prev => {
            if (prev.includes(type)) return prev.filter(t => t !== type);
            return [...prev, type];
        });
    };



    const filteredProcurements = (procurements || []).filter(procurement => {
        const matchesSearch =
            procurement.prNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
            procurement.description.toLowerCase().includes(filters.search.toLowerCase()) ||
            (procurement.projectName && procurement.projectName.toLowerCase().includes(filters.search.toLowerCase()));

        const matchesCabinet = !filters.cabinetId || filters.cabinetId === 'all_cabinets' || procurement.cabinetId === filters.cabinetId;
        const matchesShelf = !filters.shelfId || filters.shelfId === 'all_shelves' || procurement.shelfId === filters.shelfId;
        const matchesFolder = !filters.folderId || filters.folderId === 'all_folders' || procurement.folderId === filters.folderId;

        // New: multi-select status filtering (empty -> all)
        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(procurement.status);


        const matchesUrgency = !filters.urgencyLevel || (filters.urgencyLevel as any) === 'all_urgency' || procurement.urgencyLevel === (filters.urgencyLevel as any);

        // Phase 6 Filters
        // Division (stored as name in procurement.division)
        const matchesDivision = !filterDivision || filterDivision === 'all_divisions' || procurement.division === filterDivision;

        // Type Filter (Multi-select)
        const matchesType = typeFilters.length === 0 || typeFilters.includes(procurement.procurementType || '');

        // Date Range (Date Added)
        const matchesDate = !filterDateRange || !filterDateRange.from || (
            isWithinInterval(new Date(procurement.dateAdded), {
                start: startOfDay(filterDateRange.from),
                end: endOfDay(filterDateRange.to || filterDateRange.from)
            })
        );

        const matchesBox = !filters.boxId || procurement.boxId === filters.boxId;

        return matchesSearch && matchesCabinet && matchesShelf && matchesFolder && matchesStatus && matchesUrgency && matchesDivision && matchesType && matchesDate && matchesBox;
    }).sort((a, b) => {
        let comparison = 0;

        if (sortField === 'name') {
            comparison = a.description.localeCompare(b.description);
        } else if (sortField === 'prNumber') {
            comparison = a.prNumber.localeCompare(b.prNumber);
        } else if (sortField === 'date') {
            // Reverse comparison for date: newer dates first when ascending
            comparison = new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        } else if (sortField === 'stackNumber') {
            // Sort by stack number (files without stack numbers go to end)
            const aStack = a.stackNumber || 999;
            const bStack = b.stackNumber || 999;
            comparison = aStack - bStack;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(filteredProcurements.length / itemsPerPage);
    const paginatedProcurements = filteredProcurements.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleJumpToPage = () => {
        const page = parseInt(jumpPage);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPage('');
        } else {
            toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
        }
    };



    const clearFilters = () => {
        setFilters({
            search: '',
            cabinetId: '',
            shelfId: '',
            folderId: '',
            status: '',
            monthYear: '',
            urgencyLevel: '',
            boxId: '' // Clear boxId
        });
        // clear multi-select status
        setStatusFilters([]);

        setFilterDivision('all_divisions');
        setTypeFilters([]);
        setFilterDateRange(undefined);
        // reset sorting
        setSortField('date');
        setSortDirection('asc');
        setCurrentPage(1);
    };

    const handleEdit = (procurement: Procurement) => {
        setEditingProcurement(procurement);
        setIsEditDialogOpen(true);

        // Parse PR Number for Edit Modal (Format: DIV-MMM-YY-SEQ)
        const parts = procurement.prNumber.split('-');
        if (parts.length >= 4) {
            const divAbbr = parts[0];
            const div = divisions.find(d => d.abbreviation === divAbbr);
            if (div) setEditDivisionId(div.id);
            else setEditDivisionId(''); // Or handle unknown division

            setEditPrMonth(parts[1]);
            setEditPrYear(parts[2]);
            setEditPrSequence(parts[3]);
        } else {
            // Reset if format doesn't match
            setEditDivisionId('');
            setEditPrMonth('');
            setEditPrYear('');
            setEditPrSequence('');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingProcurement) return;
        setIsSaving(true);
        try {
            await handleUpdateProcurement();
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateProcurement = async () => {
        if (!editingProcurement) return;

        // Reconstruct PR Number from split fields
        let finalPrNumber = editingProcurement.prNumber;
        if (editDivisionId && editPrMonth && editPrYear && editPrSequence) {
            const div = divisions.find(d => d.id === editDivisionId);
            if (div) {
                finalPrNumber = `${div.abbreviation}-${editPrMonth}-${editPrYear}-${editPrSequence}`;
            }
        }

        const updatedProcurement: Procurement = {
            ...editingProcurement,
            prNumber: finalPrNumber,
            // Ensure division name is updated if division ID changed (optional but good practice)
            division: divisions.find(d => d.id === editDivisionId)?.name || editingProcurement.division,
            // Parse financials
            abc: editingProcurement.abc ? parseFloat(removeCommas(String(editingProcurement.abc))) : undefined,
            bidAmount: editingProcurement.bidAmount ? parseFloat(removeCommas(String(editingProcurement.bidAmount))) : undefined,
        };


        try {
            await updateProcurement(
                updatedProcurement.id,
                updatedProcurement,
                user?.email,
                user?.name
            );
            setIsEditDialogOpen(false);
            setEditingProcurement(null);
            toast.success('Record updated successfully');
        } catch (error) {
            toast.error('Failed to update record');
        }
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteProcurement(deleteId);
            toast.success('Record deleted successfully');
            setDeleteId(null);
        }
    };

    const handleRelocateClick = (procurement: Procurement) => {
        setRelocateProcurement(procurement);
        setNewStackNumber(procurement.stackNumber || '');
        setIsRelocateDialogOpen(true);
    };

    const handleRelocateSave = async () => {
        if (!relocateProcurement || !newStackNumber) return;

        const folderId = relocateProcurement.folderId;
        if (!folderId) return;

        // Get all archived items in this folder, sorted by current stack number
        const folderItems = procurements
            .filter(p => p.folderId === folderId && p.status === 'archived' && p.id !== relocateProcurement.id)
            .sort((a, b) => (a.stackNumber || 0) - (b.stackNumber || 0));

        let targetStack = parseInt(String(newStackNumber));
        if (isNaN(targetStack) || targetStack < 1) targetStack = 1;
        if (targetStack > folderItems.length + 1) targetStack = folderItems.length + 1;

        // Find prev and next items around the insertion point
        // Indices are 0-based. Stack numbers are 1-based.
        // no opbe at Stack X, we insert at index X-1.
        // Prev item is at index X-2. Next item is at index X-1.

        let newOrderDate: number;

        if (targetStack === 1) {
            // Insert at start
            const firstItem = folderItems[0];
            const firstDate = firstItem?.stackOrderDate || new Date(firstItem?.dateAdded || Date.now()).getTime();
            newOrderDate = firstDate - 100000; // Subtract arbitrary time
        } else if (targetStack > folderItems.length) {
            // Insert at end
            const lastItem = folderItems[folderItems.length - 1];
            const lastDate = lastItem?.stackOrderDate || new Date(lastItem?.dateAdded || Date.now()).getTime();
            newOrderDate = lastDate + 100000;
        } else {
            // Insert in middle
            const prevItem = folderItems[targetStack - 2];
            const nextItem = folderItems[targetStack - 1];

            const prevDate = prevItem?.stackOrderDate || new Date(prevItem?.dateAdded || 0).getTime();
            const nextDate = nextItem?.stackOrderDate || new Date(nextItem?.dateAdded || 0).getTime();

            newOrderDate = (prevDate + nextDate) / 2;
        }

        try {
            await updateProcurement(
                relocateProcurement.id,
                { ...relocateProcurement, stackOrderDate: newOrderDate },
                user?.email,
                user?.name
            );
            toast.success('Stack number updated');
            setIsRelocateDialogOpen(false);
            setRelocateProcurement(null);
        } catch (error) {
            toast.error('Failed to update stack number');
        }
    };

    // Status change handlers


    // Helper to Determine CURRENT Progress Stage (Last Completed Step)
    const getCurrentStage = (p: Procurement) => {
        if (p.procurementType === 'SVP') {
            if (p.forwardedGsdDate) return 'Forwarded GSD for P.O.';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.rfqOpeningDate) return 'RFQ Opening';
            if (p.rfqCanvassDate) return 'RFQ for Canvass';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        } else {
            // Regular Bidding - Check in reverse chronological order (latest step first)
            if (p.awardedToDate) return 'Awarded to Supplier';
            if (p.forwardedOapiDate) return 'Forwarded to OAPIA';
            if (p.ntpDate) return 'NTP';
            if (p.contractDate) return 'Contract Date';
            if (p.noaDate) return 'NOA';
            if (p.postQualReportDate) return 'Post-Qualification Report';
            if (p.postQualDate) return 'Post-Qualification';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.bidEvaluationDate) return 'Bid Evaluation Report';
            if (p.bidOpeningDate) return 'Bid Opening';
            if (p.preBidDate) return 'Pre-bid';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        }
    };

    // Helper to get Latest Activity Date
    const getLatestActionDate = (p: Procurement) => {
        const dates = [
            p.receivedPrDate, p.prDeliberatedDate, p.publishedDate, p.preBidDate, p.bidOpeningDate,
            p.bidEvaluationDate, p.bacResolutionDate, p.postQualDate, p.postQualReportDate,
            p.forwardedOapiDate, p.noaDate, p.contractDate, p.ntpDate, p.forwardedGsdDate,
            p.rfqCanvassDate, p.rfqOpeningDate, p.dateAdded, p.createdAt
        ].filter(d => d).map(d => new Date(d!));

        if (dates.length === 0) return null;
        return new Date(Math.max.apply(null, dates.map(d => d.getTime())));
    };

    // Updated to show: Shelf-Cabinet-Folder (Legacy) OR Box-Folder (New)
    const getLocationString = (p: Procurement) => {
        if (p.boxId) {
            // Box Storage Mode: B{code}-{Fcode} (e.g., B1-F1)
            const box = boxes.find(b => b.id === p.boxId);
            const folder = folders.find(f => f.id === p.folderId);

            const boxCode = box ? box.code : '?';
            const folderCode = folder ? folder.code : '?';

            return `${boxCode}-${folderCode}`;
        } else {
            // Drawer Storage Mode: D{code}-{Ccode}-{Fcode}
            const drawer = cabinets.find(c => c.id === p.cabinetId);
            const cabinet = shelves.find(s => s.id === p.shelfId);
            const folder = folders.find(f => f.id === p.folderId);

            const drawerCode = drawer ? drawer.code : '?';
            const cabinetCode = cabinet ? cabinet.code : '?';
            const folderCode = folder ? folder.code : '?';

            // Use simplified format if possible, but keep Drawer-Cabinet-Folder for now as requested default
            return `${drawerCode}-${cabinetCode}-${folderCode}`;
        }
    };

    const handleExportClick = () => {
        // Initialize export filters defaults
        setExportFilters({
            storageStatus: 'all',
            division: 'all',
            year: 'all',
            abcRange: { min: '', max: '' },
            bidAmountRange: { min: '', max: '' },
            storageLocation: 'all',
            processStatus: 'all'
        });
        setIsExportModalOpen(true);
    };

    const handleExportConfirm = () => {
        // Filter procurements based on advanced Export Modal state
        const exportData = (procurements || []).filter(procurement => {
            // Lock to current page's procurement type
            const matchesType = !forcedType || procurement.procurementType === forcedType;

            // Storage Status
            const matchesStorageStatus = exportFilters.storageStatus === 'all' ||
                (exportFilters.storageStatus === 'borrowed' && procurement.status === 'active') ||
                (exportFilters.storageStatus === 'archived' && procurement.status === 'archived');

            // End User Division
            const matchesDivision = exportFilters.division === 'all' || procurement.division === exportFilters.division;

            // Date (Year) match against dateAdded
            const matchesYear = exportFilters.year === 'all' || (procurement.dateAdded && new Date(procurement.dateAdded).getFullYear().toString() === exportFilters.year);

            // ABC Range
            const minAbc = parseFloat(exportFilters.abcRange.min);
            const maxAbc = parseFloat(exportFilters.abcRange.max);
            const abc = procurement.abc || 0;
            const matchesAbcRange = (!exportFilters.abcRange.min || abc >= minAbc) && (!exportFilters.abcRange.max || abc <= maxAbc);

            // Bid Amount Range
            const minBid = parseFloat(exportFilters.bidAmountRange.min);
            const maxBid = parseFloat(exportFilters.bidAmountRange.max);
            const bid = procurement.bidAmount || 0;
            const matchesBidRange = (!exportFilters.bidAmountRange.min || bid >= minBid) && (!exportFilters.bidAmountRange.max || bid <= maxBid);

            // Storage Location filter by type (All / Drawers only / Boxes only)
            const isBox = !!procurement.boxId;
            const matchesStorageLoc =
                exportFilters.storageLocation === 'all' ||
                (exportFilters.storageLocation === 'drawers' && !isBox) ||
                (exportFilters.storageLocation === 'boxes' && isBox);

            // Process Status
            const matchesProcessStatus = exportFilters.processStatus === 'all' || procurement.procurementStatus === exportFilters.processStatus;

            return matchesType && matchesStorageStatus && matchesDivision && matchesYear && matchesAbcRange && matchesBidRange && matchesStorageLoc && matchesProcessStatus;
        }).map(p => {
            const checklist = p.checklist || {};

            if (exportFormat === 'svp') {
                return {
                    'Particulars/Project name': p.projectName || '',
                    'PR Number': p.prNumber,
                    'End User': p.division || '',
                    'ABC': p.abc ? `₱${p.abc.toLocaleString()}` : '',
                    'Status': p.status === 'active' ? 'Borrowed' : 'Archived',
                    'Borrowed by': p.borrowedBy || '',
                    'Borrower Division': p.borrowerDivision || '',
                    'Borrowed Date': p.borrowedDate ? format(new Date(p.borrowedDate), 'MMM d, yyyy') : '',
                    'Return by': p.returnedBy || '',
                    'Return Date': p.returnDate ? format(new Date(p.returnDate), 'MMM d, yyyy') : '',
                    'Date of Current Status': p.dateStatusUpdated ? format(new Date(p.dateStatusUpdated), 'MMM d, yyyy') : '',
                    'Remarks': p.description || '',
                    'Received PR to Action(Date)': p.receivedPrDate ? format(new Date(p.receivedPrDate), 'MMM d, yyyy') : '',
                    'PR Deliberated(Date)': p.prDeliberatedDate ? format(new Date(p.prDeliberatedDate), 'MMM d, yyyy') : '',
                    'Published(Date)': p.publishedDate ? format(new Date(p.publishedDate), 'MMM d, yyyy') : '',
                    'RFQ to Canvass(Date)': p.rfqCanvassDate ? format(new Date(p.rfqCanvassDate), 'MMM d, yyyy') : '',
                    'RFQ Opening(Date)': p.rfqOpeningDate ? format(new Date(p.rfqOpeningDate), 'MMM d, yyyy') : '',
                    'BAC Resolution(Date)': p.bacResolutionDate ? format(new Date(p.bacResolutionDate), 'MMM d, yyyy') : '',
                    'Forwarded to GSD for P.O(Date)': p.forwardedGsdDate ? format(new Date(p.forwardedGsdDate), 'MMM d, yyyy') : '',
                    'Staff in Charge': p.createdByName || '',
                    'Supplier': p.supplier || '',
                    'Bid Amount': p.bidAmount ? `₱${p.bidAmount.toLocaleString()}` : '',
                    'Notes': p.notes || '',
                    'A.': checklist.noticeToProceed ? 'Yes' : '',
                    'B.': checklist.contractOfAgreement ? 'Yes' : '',
                    'C.': checklist.noticeOfAward ? 'Yes' : '',
                    'D.': checklist.bacResolutionAward ? 'Yes' : '',
                    'E.': checklist.postQualReport ? 'Yes' : '',
                    'F.': checklist.noticePostQual ? 'Yes' : '',
                    'G.': checklist.bacResolutionPostQual ? 'Yes' : '',
                    'H.': checklist.abstractBidsEvaluated ? 'Yes' : '',
                    'I.': checklist.twgBidEvalReport ? 'Yes' : '',
                    'J.': checklist.minutesBidOpening ? 'Yes' : '',
                    'K.': checklist.resultEligibilityCheck ? 'Yes' : '',
                    'L.': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                    'M.': checklist.minutesPreBid ? 'Yes' : '',
                    'N.': checklist.biddingDocuments ? 'Yes' : '',
                    'O.1.': checklist.inviteObservers ? 'Yes' : '',
                    'O.2.': checklist.officialReceipt ? 'Yes' : '',
                    'O.3.': checklist.boardResolution ? 'Yes' : '',
                    'O.4.': checklist.philgepsAwardNotice ? 'Yes' : '',
                    'P.1.': checklist.philgepsPosting ? 'Yes' : '',
                    'P.2.': checklist.websitePosting ? 'Yes' : '',
                    'P.3.': checklist.postingCertificate ? 'Yes' : '',
                    'Q.': checklist.fundsAvailability ? 'Yes' : '',
                    'Date Added': format(new Date(p.dateAdded), 'MMM d, yyyy'),
                };
            }
            if (exportFormat === 'regular') {
                return {
                    'Particulars/Project name': p.projectName || '',
                    'PR Number': p.prNumber,
                    'End User': p.division || '',
                    'ABC': p.abc ? `₱${p.abc.toLocaleString()}` : '',
                    'Status': p.status === 'active' ? 'Borrowed' : 'Archived',
                    'Borrowed by': p.borrowedBy || '',
                    'Borrower Division': p.borrowerDivision || '',
                    'Borrowed Date': p.borrowedDate ? format(new Date(p.borrowedDate), 'MMM d, yyyy') : '',
                    'Return by': p.returnedBy || '',
                    'Return Date': p.returnDate ? format(new Date(p.returnDate), 'MMM d, yyyy') : '',
                    'Date of Current Status': p.dateStatusUpdated ? format(new Date(p.dateStatusUpdated), 'MMM d, yyyy') : '',
                    'Remarks': p.description || '',
                    'Received PR to Action(Date)': p.receivedPrDate ? format(new Date(p.receivedPrDate), 'MMM d, yyyy') : '',
                    'PR Deliberated(Date)': p.prDeliberatedDate ? format(new Date(p.prDeliberatedDate), 'MMM d, yyyy') : '',
                    'Published(Date)': p.publishedDate ? format(new Date(p.publishedDate), 'MMM d, yyyy') : '',
                    'Pre-Bid(Date)': p.preBidDate ? format(new Date(p.preBidDate), 'MMM d, yyyy') : '',
                    'Bid Opening(Date)': p.bidOpeningDate ? format(new Date(p.bidOpeningDate), 'MMM d, yyyy') : '',
                    'Bid Evaluation Report(Date)': p.bidEvaluationDate ? format(new Date(p.bidEvaluationDate), 'MMM d, yyyy') : '',
                    'Post Qualification(Date)': p.postQualDate ? format(new Date(p.postQualDate), 'MMM d, yyyy') : '',
                    'Post Qualification Report(Date)': p.postQualReportDate ? format(new Date(p.postQualReportDate), 'MMM d, yyyy') : '',
                    'Forwarded to OAPIA(Date)': p.forwardedOapiDate ? format(new Date(p.forwardedOapiDate), 'MMM d, yyyy') : '',
                    'Notice of Award(Date)': p.noaDate ? format(new Date(p.noaDate), 'MMM d, yyyy') : '',
                    'Contract Date(Date)': p.contractDate ? format(new Date(p.contractDate), 'MMM d, yyyy') : '',
                    'Notice to Proceed(Date)': p.ntpDate ? format(new Date(p.ntpDate), 'MMM d, yyyy') : '',
                    'Awarded to Supplier(Date)': p.awardedToDate ? format(new Date(p.awardedToDate), 'MMM d, yyyy') : '',
                    'Staff in Charge': p.createdByName || '',
                    'Supplier': p.supplier || '',
                    'Bid Amount': p.bidAmount ? `₱${p.bidAmount.toLocaleString()}` : '',
                    'Notes': p.notes || '',
                    'A.': checklist.noticeToProceed ? 'Yes' : '',
                    'B.': checklist.contractOfAgreement ? 'Yes' : '',
                    'C.': checklist.noticeOfAward ? 'Yes' : '',
                    'D.': checklist.bacResolutionAward ? 'Yes' : '',
                    'E.': checklist.postQualReport ? 'Yes' : '',
                    'F.': checklist.noticePostQual ? 'Yes' : '',
                    'G.': checklist.bacResolutionPostQual ? 'Yes' : '',
                    'H.': checklist.abstractBidsEvaluated ? 'Yes' : '',
                    'I.': checklist.twgBidEvalReport ? 'Yes' : '',
                    'J.': checklist.minutesBidOpening ? 'Yes' : '',
                    'K.': checklist.resultEligibilityCheck ? 'Yes' : '',
                    'L.': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                    'M.': checklist.minutesPreBid ? 'Yes' : '',
                    'N.': checklist.biddingDocuments ? 'Yes' : '',
                    'O.1.': checklist.inviteObservers ? 'Yes' : '',
                    'O.2.': checklist.officialReceipt ? 'Yes' : '',
                    'O.3.': checklist.boardResolution ? 'Yes' : '',
                    'O.4.': checklist.philgepsAwardNotice ? 'Yes' : '',
                    'P.1.': checklist.philgepsPosting ? 'Yes' : '',
                    'P.2.': checklist.websitePosting ? 'Yes' : '',
                    'P.3.': checklist.postingCertificate ? 'Yes' : '',
                    'Q.': checklist.fundsAvailability ? 'Yes' : '',
                    'Date Added': format(new Date(p.dateAdded), 'MMM d, yyyy'),
                };
            }

            return {
                'PR Number/IB Number': p.prNumber,
                'Procurement Type': p.procurementType || '',
                'Project Name': p.projectName || '',
                'Description': p.description,
                'Division': p.division || '',
                'Location': getLocationString(p),
                'Status': p.status === 'active' ? 'Borrowed' : 'Archived',
                'Progress Status': p.procurementStatus || 'Pending',
                'Stack Number': p.stackNumber || '',
                'Borrowed By': p.borrowedBy || '',
                'Borrower Division': p.borrowerDivision || '',
                'Borrowed Date': p.borrowedDate ? format(new Date(p.borrowedDate), 'MMM d, yyyy') : '',
                'Return By': p.returnedBy || '',
                'Return Date': p.returnDate ? format(new Date(p.returnDate), 'MMM d, yyyy') : '',
                'Procurement Date': p.procurementDate ? format(new Date(p.procurementDate), 'MMM d, yyyy') : '',
                'Tags': (p.tags || []).join(', '),
                'Created By': p.createdByName || '',
                'Created At': p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : '',

                // Documents Handed Over (Checklist A-Q)
                'A': checklist.noticeToProceed ? 'Yes' : '',
                'B': checklist.contractOfAgreement ? 'Yes' : '',
                'C': checklist.noticeOfAward ? 'Yes' : '',
                'D': checklist.bacResolutionAward ? 'Yes' : '',
                'E': checklist.postQualReport ? 'Yes' : '',
                'F': checklist.noticePostQual ? 'Yes' : '',
                'G': checklist.bacResolutionPostQual ? 'Yes' : '',
                'H': checklist.abstractBidsEvaluated ? 'Yes' : '',
                'I': checklist.twgBidEvalReport ? 'Yes' : '',
                'J': checklist.minutesBidOpening ? 'Yes' : '',
                'K': checklist.resultEligibilityCheck ? 'Yes' : '',
                'L': checklist.biddersTechFinancialProposals ? 'Yes' : '',
                'M': checklist.minutesPreBid ? 'Yes' : '',
                'N': checklist.biddingDocuments ? 'Yes' : '',
                'O.1': checklist.inviteObservers ? 'Yes' : '',
                'O.2': checklist.officialReceipt ? 'Yes' : '',
                'O.3': checklist.boardResolution ? 'Yes' : '',
                'O.4': checklist.philgepsAwardNotice ? 'Yes' : '',
                'P.1': checklist.philgepsPosting ? 'Yes' : '',
                'P.2': checklist.websitePosting ? 'Yes' : '',
                'P.3': checklist.postingCertificate ? 'Yes' : '',
                'Q': checklist.fundsAvailability ? 'Yes' : '',

                'Date Added': format(new Date(p.dateAdded), 'MMM d, yyyy'),
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `procurement_records_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();

        setIsExportModalOpen(false);
        toast.success(`Exported ${exportData.length} records to CSV`);
    };



    const handleExportPDFSummary = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Procurement Records - Summary Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy - hh:mm a')}`, 14, 28);

        const summaryData = filteredProcurements.map(p => [
            p.prNumber,
            p.description.substring(0, 40) + (p.description.length > 40 ? '...' : ''),
            getLocationString(p),
            p.status,
            format(new Date(p.dateAdded), 'MMM d, yyyy')
        ]);

        autoTable(doc, {
            head: [['PR Number', 'Description', 'Location', 'Status', 'Date Added']],
            body: summaryData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
        });

        doc.save(`procurement-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF summary exported successfully');
    };

    const handleExportPDFFull = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Procurement Records - Full Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy - hh:mm a')}`, 14, 28);

        const fullData = filteredProcurements.map(p => [
            p.prNumber,
            p.description.substring(0, 30) + (p.description.length > 30 ? '...' : ''),
            getLocationString(p),
            p.status,
            p.urgencyLevel,
            format(new Date(p.dateAdded), 'MMM d, yyyy'),
            p.tags.join(', ').substring(0, 20),
            p.createdByName || 'N/A'
        ]);

        autoTable(doc, {
            head: [['PR #', 'Description', 'Location', 'Status', 'Urgency', 'Date', 'Tags', 'Created By']],
            body: fullData,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            styles: { fontSize: 8 },
        });

        doc.save(`procurement-full-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF full report exported successfully');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;

        try {
            await deleteProcurement(deleteId);
            toast.success('Record deleted successfully');
            setDeleteId(null);
            if (selectedIds.includes(deleteId)) {
                setSelectedIds(prev => prev.filter(id => id !== deleteId));
            }
        } catch (error) {
            toast.error('Failed to delete record');
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = paginatedProcurements.map(p => p.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = paginatedProcurements.map(p => p.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        try {
            await Promise.all(selectedIds.map(id => deleteProcurement(id)));

            toast.success(`${selectedIds.length} records deleted successfully`);
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error('Failed to delete some records');
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold text-white">{pageTitle || "Records"}</h1>

                    </div>

                    <p className="text-slate-400 mt-1">View and manage file tracking records</p>
                </div>

                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Selected ({selectedIds.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1e293b] border-slate-800 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {selectedIds.length} Records?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        This action cannot be undone. This will permanently delete the selected procurement records.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {!['viewer', 'archiver'].includes(user?.role || '') && (
                        <Button onClick={() => navigate('/procurement/add')} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Record
                        </Button>
                    )}
                    {(typeFilters.includes('SVP') || typeFilters.includes('Regular Bidding')) && !['viewer', 'archiver'].includes(user?.role || '') && (
                        <Button onClick={handleExportClick} className="bg-emerald-600 hover:bg-emerald-700">
                            <FileText className="mr-2 h-4 w-4" />
                            Export as CSV
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border-none bg-[#0f172a] shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search and Date Range */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Search PR Number, Project Name or description..."
                                    className="pl-9 bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500 h-8 text-xs"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                            {/* Date Range Filter (Typable) */}
                            <div className="flex items-center gap-2 bg-[#1e293b] rounded-md border border-slate-700 p-1 min-w-fit">
                                <div className="flex items-center gap-1 px-2">
                                    <span className="text-xs text-slate-400">From:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-white text-xs focus:ring-0 w-[110px] h-6"
                                        value={filterDateRange?.from ? format(filterDateRange.from, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => setFilterDateRange(prev => ({ from: e.target.value ? new Date(e.target.value) : undefined, to: prev?.to }))}
                                    />
                                </div>
                                <div className="flex items-center gap-1 px-2 border-l border-slate-700">
                                    <span className="text-xs text-slate-400">To:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-white text-xs focus:ring-0 w-[110px] h-6"
                                        value={filterDateRange?.to ? format(filterDateRange.to, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => setFilterDateRange(prev => ({ from: prev?.from, to: e.target.value ? new Date(e.target.value) : undefined }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Location Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {/* Box Filter */}
                            <div className="bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filters.boxId || "all"}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, boxId: val === "all" ? "" : val, cabinetId: "", shelfId: "", folderId: "" }))}
                                    disabled={!!filters.cabinetId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Boxes" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all">All Boxes</SelectItem>
                                        {boxes.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Cabinet Filter */}
                            <div className="bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filters.cabinetId || "all"}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, cabinetId: val === "all" ? "" : val, shelfId: "", folderId: "", boxId: "" }))} // Clear box if shelf selected
                                    disabled={!!filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Drawers" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all">All Drawers</SelectItem>
                                        {cabinets.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filters.shelfId}
                                    onValueChange={(value) => setFilters({
                                        ...filters,
                                        shelfId: value,
                                        folderId: '' // Reset child
                                    })}
                                    disabled={!filters.cabinetId || !!filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Cabinet" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all_shelves">All Cabinets</SelectItem>
                                        {filterAvailableShelves.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filters.folderId}
                                    onValueChange={(value) => setFilters({ ...filters, folderId: value })}
                                    disabled={!filters.shelfId && !filters.boxId}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Folder" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all_folders">All Folders</SelectItem>
                                        {filterAvailableFolders.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 3: Properties & Sort */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* STATUS multi-select dropdown */}
                            <div className="flex-1 min-w-[120px] bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>Status</span>
                                                {statusFilters.length > 0 && (
                                                    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-medium">
                                                        {statusFilters.length}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-[#1e293b] border-slate-700 text-white p-3 w-56">
                                        <div className="mb-2 text-slate-300 text-sm">Select status</div>
                                        <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                            {statusOptions.map((status) => (
                                                <div key={status} className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={statusFilters.includes(status)}
                                                        onCheckedChange={() => toggleStatusFilter(status)}
                                                        className="border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatusFilter(status)}
                                                        className="text-sm text-slate-200 text-left w-full"
                                                    >
                                                        {getStatusLabel(status)}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>



                            {/* Division Filter */}
                            <div className="flex-1 min-w-[150px] bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filterDivision}
                                    onValueChange={setFilterDivision}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Divisions" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all_divisions">All Divisions</SelectItem>
                                        {divisions.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((d) => (
                                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type Filter (Multi-select) - OR specific column toggles? */}
                            {!forcedType && (
                                <div className="flex-1 min-w-[120px] bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span>Type</span>
                                                    {typeFilters.length > 0 && (
                                                        <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-medium">
                                                            {typeFilters.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="bg-[#1e293b] border-slate-700 text-white p-3 w-56">
                                            <div className="mb-2 text-slate-300 text-sm">Select type</div>
                                            <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                                {typeOptions.map((type) => (
                                                    <div key={type} className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={typeFilters.includes(type)}
                                                            onCheckedChange={() => toggleTypeFilter(type)}
                                                            className="border-slate-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleTypeFilter(type)}
                                                            className="text-sm text-slate-200 text-left w-full"
                                                        >
                                                            {type}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}

                            {/* SORT controls */}
                            <div className="flex-none flex items-center gap-2 bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select value={sortField} onValueChange={(value) => setSortField(value as 'name' | 'prNumber' | 'date' | 'stackNumber')}>
                                    <SelectTrigger className="w-[120px] border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="name">Name</SelectItem>
                                        <SelectItem value="prNumber">PR Number</SelectItem>
                                        <SelectItem value="date">Date Added</SelectItem>
                                        <SelectItem value="stackNumber">Stack Number</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="h-6 w-8 text-slate-400 hover:text-white"
                                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                onClick={clearFilters}
                                className="bg-[#1e293b] border-slate-700 text-slate-400 hover:text-white ml-auto h-8 px-3"
                                title="Clear Filters"
                            >
                                <FilterX className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-800 overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="w-[50px]">
                                        {!['viewer', 'archiver'].includes(user?.role || '') && (
                                            <Checkbox
                                                checked={paginatedProcurements.length > 0 && paginatedProcurements.every(p => selectedIds.includes(p.id))}
                                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        )}
                                    </TableHead>
                                    <TableHead className="text-slate-300 w-[100px]">{forcedType === 'Regular Bidding' ? 'IB Number' : 'PR Number'}</TableHead>
                                    <TableHead className="text-slate-300">Project Title (Particulars)</TableHead>
                                    {forcedType === 'Regular Bidding' && <TableHead className="text-slate-300">ABC</TableHead>}
                                    <TableHead className="text-slate-300 w-[90px]">End User</TableHead>
                                    {!forcedType && <TableHead className="text-slate-300 w-[100px]">Type</TableHead>}
                                    <TableHead className="text-slate-300 w-[100px]">Location</TableHead>
                                    <TableHead className="text-center text-slate-300 w-[70px]">Stack #</TableHead>
                                    <TableHead className="text-slate-300 w-[120px]">Current Progress</TableHead>
                                    <TableHead className="text-slate-300 w-[110px]">Status</TableHead>
                                    <TableHead className="text-slate-300 w-[120px]">Date Progress Updated</TableHead>
                                    <TableHead className="text-right text-slate-300 w-[140px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedProcurements.length === 0 ? (
                                    <TableRow className="border-slate-800">
                                        <TableCell colSpan={13} className="h-24 text-center text-slate-500">
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProcurements.map((procurement) => {
                                        const pStatus = procurement.procurementStatus || 'Not yet Acted';

                                        // Current Stage (Last Completed Step)
                                        const getLastStage = (p: Procurement) => {
                                            if (p.procurementType === 'SVP') {
                                                if (p.forwardedGsdDate) return 'Forwarded GSD for P.O.';
                                                if (p.bacResolutionDate) return 'BAC Resolution';
                                                if (p.rfqOpeningDate) return 'RFQ Opening';
                                                if (p.rfqCanvassDate) return 'RFQ for Canvass';
                                                if (p.publishedDate) return 'Published';
                                                if (p.prDeliberatedDate) return 'PR Deliberated';
                                                if (p.receivedPrDate) return 'Received PR for Action';
                                                return 'Not yet Acted';
                                            } else {
                                                // Regular Bidding - Check in reverse chronological order (latest first)
                                                if (p.awardedToDate) return 'Awarded to Supplier';
                                                if (p.forwardedOapiDate) return 'To OAPIA';
                                                if (p.ntpDate) return 'NTP';
                                                if (p.contractDate) return 'Contract Date';
                                                if (p.noaDate) return 'NOA';
                                                if (p.postQualReportDate) return 'Post-Qual Report';
                                                if (p.postQualDate) return 'Post-Qual';
                                                if (p.bidEvaluationDate) return 'Bid Eval Report';
                                                if (p.bidOpeningDate) return 'Bid Opening';
                                                if (p.preBidDate) return 'Pre-bid';
                                                if (p.publishedDate) return 'Published';
                                                if (p.prDeliberatedDate) return 'PR Deliberated';
                                                if (p.receivedPrDate) return 'Received PR for Action';
                                                return 'Not yet Acted';
                                            }
                                        };
                                        const currentStage = getLastStage(procurement);

                                        // Determine Effective Status for Coloring
                                        // User logic: "Completed(Green), In Progress(Yellow), Returned PR to EU(Purple), Not yet Acted(Gray), Failure(Red), Cancelled(Red Orange)"
                                        let effectiveStatus = pStatus || 'Not yet Acted';

                                        // Auto-detect 'In Progress' if marked 'Not yet Acted' but has updates
                                        if (effectiveStatus === 'Not yet Acted') {
                                            // Check if any progress monitoring dates are set
                                            const hasProgress = [
                                                procurement.receivedPrDate,
                                                procurement.prDeliberatedDate,
                                                procurement.publishedDate,
                                                procurement.preBidDate,
                                                procurement.bidOpeningDate,
                                                procurement.bidEvaluationDate,
                                                procurement.bacResolutionDate,
                                                procurement.postQualDate,
                                                procurement.postQualReportDate,
                                                procurement.forwardedOapiDate,
                                                procurement.noaDate,
                                                procurement.contractDate,
                                                procurement.ntpDate,
                                                procurement.rfqCanvassDate,
                                                procurement.rfqOpeningDate,
                                                procurement.forwardedGsdDate
                                            ].some(d => !!d);

                                            if (hasProgress) {
                                                effectiveStatus = 'In Progress';
                                            }
                                        }

                                        // If status is Pending (legacy), treat as In Progress
                                        if (pStatus === 'Pending') effectiveStatus = 'In Progress';

                                        // Row Background & Border Classes
                                        let bgClass = '';
                                        let borderClass = '';
                                        let textStatusClass = '';

                                        // Pure vivid colors: Completed=Green, In Progress=Yellow, Returned PR=Purple, Failure=Red, Cancelled=Orange, Not yet Acted=Gray
                                        switch (effectiveStatus) {
                                            case 'Completed':
                                            case 'Success': // Legacy
                                                bgClass = 'bg-green-500/25 hover:bg-green-500/35';
                                                borderClass = 'border-l-4 border-l-green-500';
                                                textStatusClass = 'text-green-400 font-semibold';
                                                break;
                                            case 'In Progress':
                                                bgClass = 'bg-yellow-400/20 hover:bg-yellow-400/30';
                                                borderClass = 'border-l-4 border-l-yellow-400';
                                                textStatusClass = 'text-yellow-400 font-semibold';
                                                break;
                                            case 'Returned PR to EU':
                                            case 'Return PR to EU' as any:
                                                bgClass = 'bg-purple-500/25 hover:bg-purple-500/35';
                                                borderClass = 'border-l-4 border-l-purple-500';
                                                textStatusClass = 'text-purple-400 font-semibold';
                                                break;
                                            case 'Failure':
                                            case 'Failed': // Legacy
                                                bgClass = 'bg-red-500/25 hover:bg-red-500/35';
                                                borderClass = 'border-l-4 border-l-red-500';
                                                textStatusClass = 'text-red-400 font-semibold';
                                                break;
                                            case 'Cancelled':
                                                bgClass = 'bg-orange-500/25 hover:bg-orange-500/35';
                                                borderClass = 'border-l-4 border-l-orange-500';
                                                textStatusClass = 'text-orange-400 font-semibold';
                                                break;
                                            case 'Not yet Acted':
                                            default:
                                                bgClass = 'bg-slate-500/10 hover:bg-slate-500/20';
                                                borderClass = 'border-l-4 border-l-slate-500';
                                                textStatusClass = 'text-slate-400';
                                                break;
                                        }

                                        // Find Division Acronym
                                        const div = divisions.find(d => d.name === procurement.division);
                                        const divAcronym = div ? div.abbreviation : (procurement.division || '-');

                                        return (
                                            <TableRow key={procurement.id} className={`border-slate-800 transition-colors ${bgClass}`}>
                                                <TableCell className={`${borderClass}`}>
                                                    {!['viewer', 'archiver'].includes(user?.role || '') && (
                                                        <Checkbox
                                                            checked={selectedIds.includes(procurement.id)}
                                                            onCheckedChange={(checked) => handleSelectOne(procurement.id, checked as boolean)}
                                                            className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium text-white text-xs w-[140px]">
                                                    {procurement.prNumber}
                                                </TableCell>
                                                <TableCell className="max-w-[250px] truncate text-slate-300 font-medium" title={procurement.projectName || ''}>
                                                    {procurement.projectName || '-'}
                                                    <div className="text-[10px] text-slate-500 italic truncate">{procurement.description}</div>
                                                </TableCell>
                                                {forcedType === 'Regular Bidding' && (
                                                    <TableCell className="text-slate-300">
                                                        {procurement.abc ? `₱${procurement.abc.toLocaleString()}` : '-'}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-slate-300 text-xs" title={procurement.division || ''}>
                                                    {divAcronym}
                                                </TableCell>
                                                {!forcedType && (
                                                    <TableCell className="text-slate-300">
                                                        {procurement.procurementType === 'Regular Bidding' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                Regular
                                                            </span>
                                                        ) : procurement.procurementType === 'SVP' ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                SVP
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                                {procurement.procurementType || '-'}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-slate-300">
                                                        <span className="font-mono text-xs bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                                                            {getLocationString(procurement)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-slate-400 text-xs font-mono">
                                                        {procurement.stackNumber ? `${procurement.stackNumber}` : '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {/* "Current Progress" shows the NEXT stage/step */}
                                                    <span className={`${textStatusClass}`} title={`Status: ${effectiveStatus}`}>
                                                        {currentStage}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={procurement.status}
                                                        onValueChange={(value) => handleStatusChange(procurement, value as ProcurementStatus)}
                                                        disabled={['viewer', 'archiver'].includes(user?.role || '')}
                                                    >
                                                        <SelectTrigger className={`w-[110px] h-7 text-xs border ${procurement.status === 'active'
                                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                            : 'bg-slate-700/50 text-slate-300 border-slate-700'
                                                            }`}>
                                                            <SelectValue>
                                                                {procurement.status === 'active' ? 'Borrowed' : 'In Storage'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                            <SelectItem value="active" className="text-orange-400 focus:text-orange-400 text-xs">Borrowed</SelectItem>
                                                            <SelectItem value="archived" className="text-slate-300 focus:text-white text-xs">In Storage</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-slate-400">
                                                    {(() => {
                                                        const latest = getLatestActionDate(procurement);
                                                        return latest ? format(latest, 'MMM d, yyyy') : '-';
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* {isFolderView && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRelocateClick(procurement)}
                                                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                            title="Relocate / Reorder"
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                    )} */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => navigate(`/procurement/progress?search=${encodeURIComponent(procurement.prNumber)}`)}
                                                            className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                                                            title="View Progress Tracking"
                                                        >
                                                            <Activity className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewProcurement(procurement)}
                                                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {!['viewer', 'archiver'].includes(user?.role || '') && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEdit(procurement)}
                                                                    className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                                                    title="Edit Details"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => setDeleteId(procurement.id)}
                                                                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="bg-[#1e293b] border-slate-800 text-white">
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                                            <AlertDialogDescription className="text-slate-400">
                                                                                This action cannot be undone. This will permanently delete the procurement record.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Legend Card - Floating Bottom Right */}
                    {/* Legend Popover - Fixed Bottom Right */}
                    <div className="fixed bottom-6 right-6 z-50">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-full bg-[#1e293b] border-slate-700 shadow-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all hover:scale-105"
                                >
                                    <Info className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 bg-[#1e293b] border-slate-700 p-4 shadow-xl mb-2 mr-2" align="end" side="top">
                                <h4 className="font-semibold text-white mb-3 text-sm border-b border-slate-700 pb-2">Status Legend</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-xs text-slate-300">Completed</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                                        <span className="text-xs text-slate-300">In Progress</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                        <span className="text-xs text-slate-300">Returned PR to EU</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"></div>
                                        <span className="text-xs text-slate-300">Not yet Acted</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                        <span className="text-xs text-slate-300">Failure</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.5)]"></div>
                                        <span className="text-xs text-slate-300">Cancelled</span>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-400">
                            Showing {paginatedProcurements.length} of {filteredProcurements.length} records
                            <span className="mx-2">•</span>
                            Page {currentPage} of {totalPages}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-400">Go to:</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    placeholder="#"
                                    className="w-16 h-8 bg-[#0f172a] border-slate-700 text-white text-xs"
                                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleJumpToPage}
                                    className="h-8 px-2 bg-[#1e293b] border-slate-700 text-white hover:bg-slate-800"
                                >
                                    Go
                                </Button>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="bg-[#1e293b] border-slate-700 text-white disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="bg-[#1e293b] border-slate-700 text-white disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Edit Dialog - Fixed Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="border-slate-800 bg-[#0f172a] text-white max-w-7xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Edit Record</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the procurement details and location.
                        </DialogDescription>
                    </DialogHeader>

                    {editingProcurement && (<>
                        <div className="flex-1 overflow-y-auto p-6 pt-2">
                            <div className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        {!['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                            <>
                                                <Label className="text-slate-300">PR Number Construction</Label>
                                                <div className="grid grid-cols-4 gap-2 items-end p-3 rounded-lg bg-[#1e293b]/50 border border-slate-700/50">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Division</Label>
                                                        <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white h-8 text-xs">
                                                                <SelectValue placeholder="Div" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                                                {divisions.map(div => (
                                                                    <SelectItem key={div.id} value={div.id}>{div.abbreviation}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Month</Label>
                                                        <Select value={editPrMonth} onValueChange={setEditPrMonth}>
                                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                                                {MONTHS.map(m => (
                                                                    <SelectItem key={m.value} value={m.value}>{m.value}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Year</Label>
                                                        <Input
                                                            value={editPrYear}
                                                            onChange={(e) => setEditPrYear(e.target.value)}
                                                            className="bg-[#1e293b] border-slate-700 text-white h-8 text-xs"
                                                            maxLength={2}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Seq</Label>
                                                        <Input
                                                            value={editPrSequence}
                                                            onChange={(e) => setEditPrSequence(e.target.value)}
                                                            className="bg-[#1e293b] border-slate-700 text-white h-8 text-xs"
                                                            maxLength={3}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500 text-right">
                                                    Current: <span className="font-mono text-emerald-500">{editingProcurement.prNumber}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Project Name</Label>
                                        <Input
                                            value={editingProcurement.projectName || ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, projectName: e.target.value })}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Procurement Date</Label>
                                        <Input
                                            type="date"
                                            value={editingProcurement.procurementDate ? format(new Date(editingProcurement.procurementDate), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, procurementDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Date Added</Label>
                                        <Input
                                            type="date"
                                            value={format(new Date(editingProcurement.dateAdded), 'yyyy-MM-dd')}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, dateAdded: e.target.value ? new Date(e.target.value).toISOString() : editingProcurement.dateAdded })}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">End User (Division)</Label>
                                        <Select
                                            value={editingProcurement.division || ''}
                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, division: val })}
                                        >
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select Division" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                                {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Project Description</Label>
                                    <Textarea
                                        value={editingProcurement.description}
                                        onChange={(e) => setEditingProcurement({ ...editingProcurement, description: e.target.value })}
                                        className="bg-[#1e293b] border-slate-700 text-white"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Procurement Type Dropdown - Restricted or Full based on type */}
                                    {!['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Procurement Type</Label>
                                            <Select
                                                value={(editingProcurement.procurementType || 'Regular Bidding') as any}
                                                onValueChange={(value) => setEditingProcurement({ ...editingProcurement, procurementType: value as any })}
                                            >
                                                <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                    {['Regular Bidding', 'SVP', 'Receipt', 'Official Receipt'].includes(editingProcurement.procurementType || 'Regular Bidding') ? (
                                                        <>
                                                            <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                                            <SelectItem value="SVP">Small Value Procurement (SVP)</SelectItem>
                                                            <SelectItem value="Receipt">Receipt</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                                            <SelectItem value="SVP">Small Value Procurement (SVP)</SelectItem>
                                                            <SelectItem value="Shopping">Shopping</SelectItem>
                                                            <SelectItem value="Direct Contracting">Direct Contracting</SelectItem>
                                                            <SelectItem value="Negotiated Procurement">Negotiated Procurement</SelectItem>
                                                            <SelectItem value="Attendance Sheets">Attendance Sheet</SelectItem>
                                                            <SelectItem value="Receipt">Receipt</SelectItem>
                                                            <SelectItem value="Others">Others</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-5">
                                        <Label className="text-slate-300">Process Status</Label>
                                        <Select
                                            value={editingProcurement.procurementStatus || 'Not yet Acted'}
                                            onValueChange={(value) => setEditingProcurement({ ...editingProcurement, procurementStatus: value })}
                                        >
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                <SelectItem value="Returned PR to EU">Returned PR to EU</SelectItem>
                                                <SelectItem value="Not yet Acted">Not yet Acted</SelectItem>
                                                <SelectItem value="Failure">Failure</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Financial Information */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">ABC (Approved Budget for Contract)</Label>
                                            <Input
                                                type="text"
                                                value={getDisplayValue(String(editingProcurement.abc || ''))}
                                                onChange={(e) => handleNumberInput(e.target.value, (val) => setEditingProcurement({ ...editingProcurement, abc: val as any }))}
                                                placeholder="5,000,000.00"
                                                className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                            />
                                            <p className="text-xs text-slate-500">Amount in Philippine Pesos</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Bid Amount (Contract Price)</Label>
                                            <Input
                                                type="text"
                                                value={getDisplayValue(String(editingProcurement.bidAmount || ''))}
                                                onChange={(e) => handleNumberInput(e.target.value, (val) => setEditingProcurement({ ...editingProcurement, bidAmount: val as any }))}
                                                placeholder="5,000,000.00"
                                                className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                            />
                                            <p className="text-xs text-slate-500">Actual awarded/contract amount</p>
                                        </div>
                                    </div>


                                    {/* Supplier/Awarded to - Only for Regular Bidding */}
                                    {editingProcurement.procurementType === 'Regular Bidding' && (
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Supplier / Awarded to</Label>
                                            <Input
                                                value={editingProcurement.supplier || ''}
                                                onChange={(e) => setEditingProcurement({ ...editingProcurement, supplier: e.target.value })}
                                                placeholder="Enter supplier or awardee name..."
                                                className="bg-[#1e293b] border-slate-700 text-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Monitoring Process (Standard Grid) */}
                            <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 border-l-4 border-l-blue-500 space-y-4  mt-4 mb-4 shadow-sm min-h-[100px]">
                                <div className="border-b border-slate-800 pb-2">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                                        Monitoring Process
                                    </h3>
                                    <p className="text-xs text-slate-400">Update key dates. Use checkboxes to enable/disable steps.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Pre-Procurement */}
                                    <div className="space-y-2">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            <MonitoringDateField label="Received PR to Action" value={editingProcurement.receivedPrDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, receivedPrDate: d, ...(!d ? { prDeliberatedDate: undefined, publishedDate: undefined, preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined } : {}) })} disabled={false} activeColor="blue" />
                                            <MonitoringDateField label="PR Deliberated" value={editingProcurement.prDeliberatedDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, prDeliberatedDate: d, ...(!d ? { publishedDate: undefined, preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.receivedPrDate} activeColor="blue" />
                                            <MonitoringDateField label="Published" value={editingProcurement.publishedDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, publishedDate: d, ...(!d ? { preBidDate: undefined, bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined, rfqCanvassDate: undefined, rfqOpeningDate: undefined, forwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.prDeliberatedDate} activeColor="blue" />
                                        </div>
                                    </div>

                                    {/* Bidding / Canvass */}
                                    <div className="space-y-2">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {editingProcurement.procurementType === 'Regular Bidding' ? (
                                                <>
                                                    <MonitoringDateField label="Pre-Bid" value={editingProcurement.preBidDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, preBidDate: d, ...(!d ? { bidOpeningDate: undefined, bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.publishedDate} activeColor="purple" />
                                                    <MonitoringDateField label="Bid Opening" value={editingProcurement.bidOpeningDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bidOpeningDate: d, ...(!d ? { bidEvaluationDate: undefined, bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.preBidDate} activeColor="purple" />
                                                    <MonitoringDateField label="Bid Evaluation Report" value={editingProcurement.bidEvaluationDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bidEvaluationDate: d, ...(!d ? { bacResolutionDate: undefined, postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bidOpeningDate} activeColor="purple" />
                                                </>
                                            ) : (
                                                <>
                                                    <MonitoringDateField label="RFQ to Canvass" value={editingProcurement.rfqCanvassDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, rfqCanvassDate: d, ...(!d ? { rfqOpeningDate: undefined, bacResolutionDate: undefined, forwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.publishedDate} activeColor="purple" />
                                                    <MonitoringDateField label="RFQ Opening" value={editingProcurement.rfqOpeningDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, rfqOpeningDate: d, ...(!d ? { bacResolutionDate: undefined, forwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.rfqCanvassDate} activeColor="purple" />
                                                    <MonitoringDateField label="BAC Resolution" value={editingProcurement.bacResolutionDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bacResolutionDate: d, ...(!d ? { forwardedGsdDate: undefined } : {}) })} disabled={!editingProcurement.rfqOpeningDate} activeColor="purple" />
                                                    <MonitoringDateField label="Forwarded to GSD for P.O" value={editingProcurement.forwardedGsdDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, forwardedGsdDate: d })} disabled={!editingProcurement.bacResolutionDate} activeColor="purple" />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Qualification & Award */}
                                    <div className="space-y-2">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {editingProcurement.procurementType === 'Regular Bidding' && (
                                                <>
                                                    <MonitoringDateField label="BAC Resolution" value={editingProcurement.bacResolutionDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, bacResolutionDate: d, ...(!d ? { postQualDate: undefined, postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bidEvaluationDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Post Qualification" value={editingProcurement.postQualDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, postQualDate: d, ...(!d ? { postQualReportDate: undefined, forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.bacResolutionDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Post Qualification Report" value={editingProcurement.postQualReportDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, postQualReportDate: d, ...(!d ? { forwardedOapiDate: undefined, noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.postQualDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Forwarded to OAPIA" value={editingProcurement.forwardedOapiDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, forwardedOapiDate: d, ...(!d ? { noaDate: undefined, contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.postQualReportDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Notice of Award" value={editingProcurement.noaDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, noaDate: d, ...(!d ? { contractDate: undefined, ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.forwardedOapiDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Contract Date" value={editingProcurement.contractDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, contractDate: d, ...(!d ? { ntpDate: undefined, awardedToDate: undefined } : {}) })} disabled={!editingProcurement.noaDate} activeColor="emerald" />
                                                    <MonitoringDateField label="Notice to Proceed" value={editingProcurement.ntpDate} onChange={(d: string | undefined) => setEditingProcurement({ ...editingProcurement, ntpDate: d, ...(!d ? { awardedToDate: undefined } : {}) })} disabled={!editingProcurement.contractDate} activeColor="emerald" />
                                                </>
                                            )}

                                            {editingProcurement.procurementType === 'Regular Bidding' ? (
                                                <>
                                                    {/* Awarded to (Date + Supplier Name) - Regular Bidding Only */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className={`text-xs ${!editingProcurement.ntpDate ? 'text-slate-600' : 'text-slate-300'}`}>Awarded Date</Label>
                                                            <Checkbox
                                                                checked={!!editingProcurement.awardedToDate}
                                                                onCheckedChange={(checked) => {
                                                                    const newDate = checked ? (editingProcurement.awardedToDate || new Date().toISOString()) : undefined;
                                                                    setEditingProcurement({ ...editingProcurement, awardedToDate: newDate });
                                                                }}
                                                                disabled={!editingProcurement.ntpDate}
                                                                className="h-3.5 w-3.5 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 disabled:opacity-50"
                                                            />
                                                        </div>
                                                        <Input
                                                            type="date"
                                                            value={editingProcurement.awardedToDate ? format(new Date(editingProcurement.awardedToDate), 'yyyy-MM-dd') : ''}
                                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, awardedToDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                            disabled={!editingProcurement.ntpDate}
                                                            className={`bg-[#1e293b] border-slate-700 text-white h-8 text-xs ${!editingProcurement.ntpDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label className={`text-xs ${!editingProcurement.awardedToDate ? 'text-slate-600' : 'text-slate-300'}`}>Supplier</Label>
                                                        </div>
                                                        <Input
                                                            type="text"
                                                            value={editingProcurement.supplier || ''}
                                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, supplier: e.target.value })}
                                                            placeholder="Supplier Name"
                                                            disabled={!editingProcurement.awardedToDate || !editingProcurement.ntpDate}
                                                            className={`bg-[#1e293b] border-slate-700 text-white h-8 text-xs ${!editingProcurement.awardedToDate || !editingProcurement.ntpDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                /* To GSD (For SVP / Others) */
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className={`text-xs ${!editingProcurement.forwardedGsdDate ? 'text-slate-600' : 'text-slate-300'}`}>To GSD</Label>
                                                        <Checkbox
                                                            checked={!!editingProcurement.forwardedGsdDate}
                                                            onCheckedChange={(checked) => setEditingProcurement({ ...editingProcurement, forwardedGsdDate: checked ? (editingProcurement.forwardedGsdDate || new Date().toISOString()) : undefined })}
                                                            disabled={!editingProcurement.bacResolutionDate}
                                                            className="h-3.5 w-3.5 border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:opacity-50"
                                                        />
                                                    </div>
                                                    <Input
                                                        type="date"
                                                        value={editingProcurement.forwardedGsdDate ? format(new Date(editingProcurement.forwardedGsdDate), 'yyyy-MM-dd') : ''}
                                                        onChange={(e) => setEditingProcurement({ ...editingProcurement, forwardedGsdDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                        disabled={!editingProcurement.bacResolutionDate}
                                                        className={`bg-[#1e293b] border-slate-700 text-white h-8 text-xs ${!editingProcurement.bacResolutionDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checklist (Always shown for reference, or user can ignore) */}
                            {editingProcurement && !['Attendance Sheets', 'Others'].includes(editingProcurement.procurementType || '') && (
                                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">Attached Documents</h3>
                                            <p className="text-xs text-slate-400">Combined Checklist</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Replace the Check All button */}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] h-6 px-2 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                                                onClick={() => {
                                                    // Create a new checklist object with all items checked
                                                    // Dynamic Check All
                                                    const allChecked = checklistItems.reduce((acc, item) => ({ ...acc, [item.key]: true }), {});

                                                    setEditingProcurement(prev => ({
                                                        ...prev!,
                                                        checklist: allChecked
                                                    }));
                                                }}
                                            >
                                                Check All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] h-6 px-2 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                                                onClick={() => {
                                                    // Create a new checklist object with all items unchecked
                                                    // Dynamic Clear All
                                                    const allUnchecked = checklistItems.reduce((acc, item) => ({ ...acc, [item.key]: false }), {});

                                                    setEditingProcurement(prev => ({
                                                        ...prev!,
                                                        checklist: allUnchecked
                                                    }));
                                                }}
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-xs max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {checklistItems.map((item) => (
                                            <div key={item.key} className="flex items-center space-x-2 p-1 rounded hover:bg-slate-800/50">
                                                <Checkbox
                                                    id={`edit-${item.key}`}
                                                    checked={editingProcurement.checklist?.[item.key as keyof typeof editingProcurement.checklist] || false}
                                                    onCheckedChange={(checked) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        checklist: {
                                                            ...editingProcurement.checklist,
                                                            [item.key]: checked
                                                        } as any
                                                    })}
                                                    className="h-3 w-3 border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <Label
                                                    htmlFor={`edit-${item.key}`}
                                                    className="text-[10px] leading-none text-slate-300 cursor-pointer"
                                                >
                                                    {item.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}




                            <div className="space-y-4 border-t border-slate-800 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-lg font-semibold text-white">Location</Label>
                                    <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Switch to Drawer Mode (Clear Box ID)
                                                setEditingProcurement({ ...editingProcurement, boxId: null, folderId: null });
                                            }}
                                            className={`px-3 py-1 text-xs rounded-md transition-all ${!editingProcurement.boxId ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Drawer Storage
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Switch to Box Mode (Clear Cabinet/Shelf)
                                                setEditingProcurement({ ...editingProcurement, cabinetId: null, shelfId: null, folderId: null, boxId: '' });
                                            }}
                                            className={`px-3 py-1 text-xs rounded-md transition-all ${editingProcurement.boxId !== null && editingProcurement.boxId !== undefined ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            Box Storage
                                        </button>
                                    </div>
                                </div>

                                <div className="animate-in fade-in">
                                    {editingProcurement.boxId !== null && editingProcurement.boxId !== undefined ? (
                                        // Box Storage Mode
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Box</Label>
                                                <Select
                                                    value={editingProcurement.boxId || ''}
                                                    onValueChange={(val) => {
                                                        setEditingProcurement({
                                                            ...editingProcurement,
                                                            boxId: val,
                                                            folderId: null // Reset folder
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue placeholder="Select Box" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {boxes.map((b) => (
                                                            <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Folder</Label>
                                                <Select
                                                    value={editingProcurement.folderId || ''}
                                                    onValueChange={(val) => setEditingProcurement({ ...editingProcurement, folderId: val })}
                                                    disabled={!editingProcurement.boxId}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue placeholder="Select Folder" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {folders.filter(f => f.boxId === editingProcurement.boxId).map((f) => (
                                                            <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : (
                                        // Drawer Storage Mode
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Drawer</Label>
                                                <Select
                                                    value={editingProcurement.cabinetId || ''}
                                                    onValueChange={(val) => {
                                                        setEditingProcurement({
                                                            ...editingProcurement,
                                                            cabinetId: val,
                                                            shelfId: null,
                                                            folderId: null
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue placeholder="Select Drawer" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {cabinets.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Cabinet</Label>
                                                <Select
                                                    value={editingProcurement.shelfId || ''}
                                                    onValueChange={(val) => {
                                                        setEditingProcurement({
                                                            ...editingProcurement,
                                                            shelfId: val,
                                                            folderId: null
                                                        });
                                                    }}
                                                    disabled={!editingProcurement.cabinetId}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue placeholder="Select Cabinet" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {shelves.filter(s => s.cabinetId === editingProcurement.cabinetId).map((s) => (
                                                            <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Folder</Label>
                                                <Select
                                                    value={editingProcurement.folderId || ''}
                                                    onValueChange={(val) => setEditingProcurement({ ...editingProcurement, folderId: val })}
                                                    disabled={!editingProcurement.shelfId}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue placeholder="Select Folder" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {folders.filter(f => f.shelfId === editingProcurement.shelfId && !f.boxId).map((f) => (
                                                            <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Status</Label>
                                    <Select
                                        value={editingProcurement.status}
                                        onValueChange={(val) => {
                                            const newStatus = val as ProcurementStatus;
                                            const updates = { ...editingProcurement, status: newStatus };

                                            // Auto-set borrowed date if moving to active and no date set
                                            if (newStatus === 'active' && !updates.borrowedDate) {
                                                const now = new Date();
                                                // Adjust for offset if needed, or just use ISO (common practice)
                                                // Using local YYYY-MM-DD for input compatibility or ISO for storage
                                                updates.borrowedDate = now.toISOString();
                                            }

                                            setEditingProcurement(updates);
                                        }}
                                    >
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectItem value="archived">Archived (In Storage)</SelectItem>
                                            <SelectItem value="active">Borrowed (Out)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Borrower Information Section - Always shown when Active */}
                            {
                                editingProcurement.status === 'active' && (
                                    <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                            <h4 className="text-amber-400 font-semibold text-sm">Borrowed Information</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Who Borrows</Label>
                                                <Input
                                                    value={editingProcurement.borrowedBy || ''}
                                                    onChange={(e) => setEditingProcurement({ ...editingProcurement, borrowedBy: e.target.value })}
                                                    className="bg-[#1e293b] border-amber-500/30 text-white focus:border-amber-500"
                                                    placeholder="Enter borrower name"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Division Who Borrows</Label>
                                                <Select
                                                    value={editingProcurement.borrowerDivision || ''}
                                                    onValueChange={(val) => setEditingProcurement({ ...editingProcurement, borrowerDivision: val })}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-amber-500/30 text-white focus:border-amber-500">
                                                        <SelectValue placeholder="Select Division" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                                        {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">When Was Borrowed</Label>
                                                <Input
                                                    type="date"
                                                    value={editingProcurement.borrowedDate ? format(new Date(editingProcurement.borrowedDate), 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        borrowedDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
                                                    })}
                                                    className="bg-[#1e293b] border-amber-500/30 text-white focus:border-amber-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-amber-300">Return Date</Label>
                                                <Input
                                                    type="date"
                                                    value={editingProcurement.returnDate ? format(new Date(editingProcurement.returnDate), 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => setEditingProcurement({ ...editingProcurement, returnDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                    className="bg-[#1e293b] border-amber-500/30 text-white focus:border-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            }


                            {/* Record History Section */}
                            <div className="space-y-4 border-t border-slate-800 pt-4">
                                <Label className="text-lg font-semibold text-white">Record History</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Created By</Label>
                                        <Input
                                            value={`${editingProcurement.createdByName || 'Unknown'} (${editingProcurement.createdBy || 'N/A'})`}
                                            disabled
                                            className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Created At</Label>
                                        <Input
                                            value={format(new Date(editingProcurement.createdAt), 'MMMM d, yyyy - hh:mm a')}
                                            disabled
                                            className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {
                                    editingProcurement.editedBy && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Last Edited By</Label>
                                                <Input
                                                    value={`${editingProcurement.editedByName || 'Unknown'} (${editingProcurement.editedBy})`}
                                                    disabled
                                                    className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Last Edited At</Label>
                                                <Input
                                                    value={editingProcurement.lastEditedAt ? format(new Date(editingProcurement.lastEditedAt), 'MMMM d, yyyy - hh:mm a') : 'N/A'}
                                                    disabled
                                                    className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        </div>

                        <DialogFooter className="p-6 pt-2 border-t border-slate-800 bg-[#0f172a]">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </>)
                    }
                </DialogContent>
            </Dialog>

            {/* Return Modal */}
            <Dialog open={!!returnModal} onOpenChange={() => setReturnModal(null)}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Return File</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Mark this file as returned. Optionally specify who returned it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="returnedBy" className="text-slate-300">Returned By (Optional)</Label>
                            <Input
                                id="returnedBy"
                                value={returnModal?.returnedBy || ''}
                                onChange={(e) => setReturnModal(prev =>
                                    prev ? { ...prev, returnedBy: e.target.value } : null
                                )}
                                placeholder="Enter name"
                                className="bg-[#1e293b] border-slate-700 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReturnModal(null)}
                            className="border-slate-700 text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmReturnFile}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Confirm Return
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Borrow Edit Modal */}
            <Dialog open={!!borrowEditModal} onOpenChange={() => setBorrowEditModal(null)}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Borrow File</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter the borrower details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="borrowedBy" className="text-slate-300">Borrowed By *</Label>
                            <Input
                                id="borrowedBy"
                                value={borrowEditModal?.borrowedBy || ''}
                                onChange={(e) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowedBy: e.target.value } : null
                                )}
                                placeholder="Enter name"
                                className="bg-[#1e293b] border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="borrowedDate" className="text-slate-300">Borrowed Date</Label>
                            <Input
                                id="borrowedDate"
                                type="date"
                                value={borrowEditModal?.borrowedDate ? format(new Date(borrowEditModal.borrowedDate), 'yyyy-MM-dd') : ''}
                                onChange={(e) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowedDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null
                                )}
                                className="bg-[#1e293b] border-slate-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="division" className="text-slate-300">Borrower Division *</Label>
                            <Select
                                value={borrowEditModal?.borrowerDivision}
                                onValueChange={(val) => setBorrowEditModal(prev =>
                                    prev ? { ...prev, borrowerDivision: val } : null
                                )}
                            >
                                <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                    <SelectValue placeholder="Select Division" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white h-[200px]">
                                    {divisions.sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
                                        <SelectItem key={d.id} value={d.name}>{d.name} ({d.abbreviation})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBorrowEditModal(null)}
                            className="border-slate-700 text-white hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={saveBorrowChanges}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Configuration Dialog */}
            <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen} >
                <DialogContent className="bg-[#1e293b] border-slate-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Export CSV Configuration</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Select filters to apply to the exported data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        {/* Storage Status */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Storage Status</Label>
                            <Select
                                value={exportFilters.storageStatus}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, storageStatus: val }))}
                            >
                                <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="borrowed">Borrowed</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* End User (Divisions) */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">End User (Division)</Label>
                            <Select
                                value={exportFilters.division}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, division: val }))}
                            >
                                <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                                    <SelectValue placeholder="All Divisions" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                    <SelectItem value="all">All Divisions</SelectItem>
                                    {divisions.map((d) => (
                                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date (Year) */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Date (Year)</Label>
                            <Select
                                value={exportFilters.year}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, year: val }))}
                            >
                                <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                                    <SelectValue placeholder="All Years" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableExportYears.map((y) => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Range of ABC */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Range of ABC</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min ABC"
                                    className="bg-[#0f172a] border-slate-700 text-white h-9"
                                    value={exportFilters.abcRange.min}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        abcRange: { ...prev.abcRange, min: e.target.value }
                                    }))}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max ABC"
                                    className="bg-[#0f172a] border-slate-700 text-white h-9"
                                    value={exportFilters.abcRange.max}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        abcRange: { ...prev.abcRange, max: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>

                        {/* Range of Bid Amount */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Range of Bid Amount</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Min Bid"
                                    className="bg-[#0f172a] border-slate-700 text-white h-9"
                                    value={exportFilters.bidAmountRange.min}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        bidAmountRange: { ...prev.bidAmountRange, min: e.target.value }
                                    }))}
                                />
                                <Input
                                    type="number"
                                    placeholder="Max Bid"
                                    className="bg-[#0f172a] border-slate-700 text-white h-9"
                                    value={exportFilters.bidAmountRange.max}
                                    onChange={(e) => setExportFilters(prev => ({
                                        ...prev,
                                        bidAmountRange: { ...prev.bidAmountRange, max: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>

                        {/* Storage Location */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Storage Location</Label>
                            <Select
                                value={exportFilters.storageLocation}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, storageLocation: val }))}
                            >
                                <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                                    <SelectValue placeholder="All Storage" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                    <SelectItem value="all">All Storage</SelectItem>
                                    <SelectItem value="drawers">Drawers only</SelectItem>
                                    <SelectItem value="boxes">Boxes only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Process Status */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Process Status</Label>
                            <Select
                                value={exportFilters.processStatus}
                                onValueChange={(val) => setExportFilters(prev => ({ ...prev, processStatus: val }))}
                            >
                                <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[250px]">
                                    <SelectItem value="all">All Process Status</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Returned PR to EU">Returned PR to EU</SelectItem>
                                    <SelectItem value="Not yet Acted">Not yet Acted</SelectItem>
                                    <SelectItem value="Failure">Failure</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportModalOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">
                            Cancel
                        </Button>
                        <Button onClick={handleExportConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Export CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ProcurementDetailsDialog
                open={!!viewProcurement}
                onOpenChange={(open) => !open && setViewProcurement(null)}
                procurement={viewProcurement}
                getLocationString={getLocationString}
            />
            {/* Relocate/Reorder Dialog */}
            <Dialog open={isRelocateDialogOpen} onOpenChange={setIsRelocateDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Relocate / Reorder</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter the new stack number for this document.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stack-number" className="text-right text-slate-300">Stack #</Label>
                            <Input
                                id="stack-number"
                                type="number"
                                value={newStackNumber}
                                onChange={(e) => setNewStackNumber(e.target.value ? parseInt(e.target.value) : '')}
                                className="col-span-3 bg-[#0f172a] border-slate-700 text-white"
                                placeholder="Enter stack number"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRelocateDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">
                            Cancel
                        </Button>
                        <Button onClick={handleRelocateSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Update Stack Number
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProcurementList;
