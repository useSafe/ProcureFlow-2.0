import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteProcurement, updateProcurement, onProcurementsChange, onCabinetsChange, onShelvesChange, onFoldersChange, onDivisionsChange, onBoxesChange } from '@/lib/storage';
import { Procurement, Cabinet, Shelf, Folder, Box, ProcurementStatus, UrgencyLevel, ProcurementFilters, Division } from '@/types/procurement';
import { toast } from 'sonner';
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
    Package
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import ProcurementDetailsDialog from '@/components/procurement/ProcurementDetailsDialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const checklistItems = [
    { key: 'noticeToProceed', label: 'A. Notice to Proceed' },
    { key: 'biddersTechFinancialProposals', label: 'L. Bidders Technical and Financial Proposals' },
    { key: 'contractOfAgreement', label: 'B. Contract of Agreement' },
    { key: 'minutesPreBid', label: 'M. Minutes of Pre-Bid Conference' },
    { key: 'noticeOfAward', label: 'C. Notice of Award' },
    { key: 'biddingDocuments', label: 'N. Bidding Documents' },
    { key: 'bacResolutionAward', label: 'D. BAC Resolution to Award' },
    { key: 'inviteObservers', label: 'O.1. Letter Invitation to Observers' },
    { key: 'postQualReport', label: 'E. Post-Qual Evaulation Report' },
    { key: 'officialReceipt', label: 'O.2. Official Receipt' },
    { key: 'noticePostQual', label: 'F. Notice of Post-qualification' },
    { key: 'boardResolution', label: 'O.3. Board Resolution' },
    { key: 'bacResolutionPostQual', label: 'G. BAC Resolution to Post-qualify' },
    { key: 'philgepsAwardNotice', label: 'O.4. PhilGEPS Award Notice Abstract' },
    { key: 'abstractBidsEvaluated', label: 'H. Abstract of Bids as Evaluated' },
    { key: 'philgepsPosting', label: 'P.1. PhilGEPS Posting' },
    { key: 'twgBidEvalReport', label: 'I. TWG Bid Evaluation Report' },
    { key: 'websitePosting', label: 'P.2. Website Posting' },
    { key: 'minutesBidOpening', label: 'J. Minutes of Bid Opening' },
    { key: 'postingCertificate', label: 'P.3. Posting Certificate' },
    { key: 'resultEligibilityCheck', label: 'K. Eligibility Check Results' },
    { key: 'fundsAvailability', label: 'Q. CAF, PR, TOR & APP' },
];

const ProcurementList: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const folderIdFromUrl = searchParams.get('folderId');

    const [procurements, setProcurements] = useState<Procurement[]>([]);

    // Location Data - Note: cabinets table stores Shelves (Tier 1), shelves table stores Cabinets (Tier 2)
    const [cabinets, setCabinets] = useState<Cabinet[]>([]); // These are actually Shelves (Tier 1)
    const [shelves, setShelves] = useState<Shelf[]>([]); // These are actually Cabinets (Tier 2)
    const [folders, setFolders] = useState<Folder[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    // Dynamic Edit Form Data
    const [editAvailableShelves, setEditAvailableShelves] = useState<Shelf[]>([]);
    const [editAvailableFolders, setEditAvailableFolders] = useState<Folder[]>([]);

    // Cascading Filter Data
    const [filterAvailableShelves, setFilterAvailableShelves] = useState<Shelf[]>([]);
    const [filterAvailableFolders, setFilterAvailableFolders] = useState<Folder[]>([]);

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
    const [progressStatusFilters, setProgressStatusFilters] = useState<string[]>([]);
    const [statusFilters, setStatusFilters] = useState<string[]>([]); // Procurement Status (Active/Archived)

    // Phase 6 Filters
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [filterDivision, setFilterDivision] = useState<string>('all_divisions');
    const [filterType, setFilterType] = useState<string>('all_types'); // Type filter (Regular Bidding / SVP)
    const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>(undefined);

    // Divisions for PR Number construction
    // const [divisions, setDivisions] = useState<Division[]>([]); // This line is a duplicate, removed.

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

    // Sorting state
    const [sortField, setSortField] = useState<'name' | 'prNumber' | 'date' | 'stackNumber'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Relocate Modal State
    const [isRelocateDialogOpen, setIsRelocateDialogOpen] = useState(false);
    const [relocateProcurement, setRelocateProcurement] = useState<Procurement | null>(null);
    const [newStackNumber, setNewStackNumber] = useState<number | ''>('');

    const isFolderView = !!filters.folderId && filters.folderId !== 'all_folders';

    const itemsPerPage = 20;

    // Stack number calculation helper
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
                borrowerDivision: procurement.borrowerDivision || ''
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

        const { procurement, borrowedBy, borrowerDivision } = borrowEditModal;

        if (!borrowedBy || !borrowerDivision) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await updateProcurement(procurement.id, {
                status: 'active',
                borrowedBy,
                borrowerDivision,
                borrowedDate: new Date().toISOString()
            });

            // Recalculate stack numbers
            await updateStackNumbersForFolder(procurement.folderId);

            setBorrowEditModal(null);
            toast.success('File marked as borrowed');
        } catch (error) {
            toast.error('Failed to update file status');
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
        const unsubProcurements = onProcurementsChange(setProcurements);
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

    // Update edit form cascading dropdowns
    useEffect(() => {
        if (editingProcurement && editingProcurement.cabinetId) {
            setEditAvailableShelves(shelves.filter(s => s.cabinetId === editingProcurement.cabinetId));
        } else {
            setEditAvailableShelves([]);
        }
    }, [editingProcurement?.cabinetId, shelves]);

    useEffect(() => {
        if (editingProcurement && editingProcurement.shelfId) {
            setEditAvailableFolders(folders.filter(f => f.shelfId === editingProcurement.shelfId));
        } else {
            setEditAvailableFolders([]);
        }
    }, [editingProcurement?.shelfId, folders]);

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
    const statusOptions: ProcurementStatus[] = ['active', 'archived'];
    const progressStatusOptions = ['Pending', 'Success', 'Failed', 'Cancelled'];

    const toggleStatusFilter = (status: string) => {
        setStatusFilters(prev => {
            if (prev.includes(status)) return prev.filter(s => s !== status);
            return [...prev, status];
        });
    };

    const toggleProgressStatusFilter = (status: string) => {
        setProgressStatusFilters(prev => {
            if (prev.includes(status)) return prev.filter(s => s !== status);
            return [...prev, status];
        });
    };

    const filteredProcurements = (procurements || []).filter(procurement => {
        const matchesSearch =
            procurement.prNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
            procurement.description.toLowerCase().includes(filters.search.toLowerCase());

        const matchesCabinet = !filters.cabinetId || filters.cabinetId === 'all_cabinets' || procurement.cabinetId === filters.cabinetId;
        const matchesShelf = !filters.shelfId || filters.shelfId === 'all_shelves' || procurement.shelfId === filters.shelfId;
        const matchesFolder = !filters.folderId || filters.folderId === 'all_folders' || procurement.folderId === filters.folderId;

        // New: multi-select status filtering (empty -> all)
        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(procurement.status);
        const matchesProgressStatus = progressStatusFilters.length === 0 || progressStatusFilters.includes(procurement.progressStatus || 'Pending');

        const matchesUrgency = !filters.urgencyLevel || filters.urgencyLevel === 'all_urgency' || procurement.urgencyLevel === (filters.urgencyLevel as UrgencyLevel);

        // Phase 6 Filters
        // Division (stored as name in procurement.division)
        const matchesDivision = !filterDivision || filterDivision === 'all_divisions' || procurement.division === filterDivision;

        // Type Filter (Regular Bidding / SVP)
        const matchesType = !filterType || filterType === 'all_types' || procurement.procurementType === filterType;

        // Date Range (Date Added)
        const matchesDate = !filterDateRange || !filterDateRange.from || (
            isWithinInterval(new Date(procurement.dateAdded), {
                start: startOfDay(filterDateRange.from),
                end: endOfDay(filterDateRange.to || filterDateRange.from)
            })
        );

        const matchesBox = !filters.boxId || procurement.boxId === filters.boxId;

        return matchesSearch && matchesCabinet && matchesShelf && matchesFolder && matchesStatus && matchesProgressStatus && matchesUrgency && matchesDivision && matchesType && matchesDate && matchesBox;
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
        setProgressStatusFilters([]);
        setFilterDivision('all_divisions');
        setFilterType('all_types');
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

        // Reconstruct PR Number from split fields
        let finalPrNumber = editingProcurement.prNumber;
        if (editDivisionId && editPrMonth && editPrYear && editPrSequence) {
            const div = divisions.find(d => d.id === editDivisionId);
            if (div) {
                finalPrNumber = `${div.abbreviation}-${editPrMonth}-${editPrYear}-${editPrSequence}`;
            }
        }

        const updatedProcurement = {
            ...editingProcurement,
            prNumber: finalPrNumber,
            // Ensure division name is updated if division ID changed (optional but good practice)
            division: divisions.find(d => d.id === editDivisionId)?.name || editingProcurement.division
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
        // To be at Stack X, we insert at index X-1.
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




    // Updated to show: Shelf-Cabinet-Folder (S1-C1-F1)
    const getLocationString = (p: Procurement) => {
        const shelf = cabinets.find(c => c.id === p.cabinetId)?.code || '?'; // cabinetId points to Shelf (Tier 1)
        const cabinet = shelves.find(s => s.id === p.shelfId)?.code || '?'; // shelfId points to Cabinet (Tier 2)
        const folder = folders.find(f => f.id === p.folderId)?.code || '?'; // folderId points to Folder (Tier 3)
        const box = boxes.find(b => b.id === p.boxId)?.code || '?'; // boxId points to Box

        if (p.boxId) {
            return box; // Show only box code (e.g., "B1")
        } else {
            return `${shelf}-${cabinet}-${folder}`;
        }
    };

    const handleExportCSV = () => {
        // Use ALL procurements, not just filtered ones
        const exportData = procurements.map(p => {
            const checklist = p.checklist || {};

            return {
                'PR Number': p.prNumber,
                'Project Name': p.projectName || '',
                'Description': p.description,
                'Division': p.division || '',
                'Location': getLocationString(p),
                'Status': p.status,
                'Progress Status': p.progressStatus || 'Pending',
                'Stack Number': p.stackNumber || '',
                'Borrowed By': p.borrowedBy || '',
                'Borrower Division': p.borrowerDivision || '',
                'Borrowed Date': p.borrowedDate ? format(new Date(p.borrowedDate), 'MMM d, yyyy') : '',
                'Return By': p.returnedBy || '',
                'Return Date': p.returnDate ? format(new Date(p.returnDate), 'MMM d, yyyy') : '',
                'Procurement Date': p.procurementDate ? format(new Date(p.procurementDate), 'MMM d, yyyy') : '',

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
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `procurement_records_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        toast.success('Exported to CSV successfully');
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
                    <h1 className="text-3xl font-bold text-white">Records</h1>

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

                    <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700">
                        <FileText className="mr-2 h-4 w-4" />
                        Export as CSV
                    </Button>
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
                                    placeholder="Search PR Number or description..."
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
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Shelves" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all">All Shelves</SelectItem>
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
                                    disabled={!filters.cabinetId}
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
                                    disabled={!filters.shelfId}
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

                            {/* PROGRESS STATUS multi-select dropdown */}
                            <div className="flex-1 min-w-[120px] bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="w-full flex justify-between items-center text-white px-3 py-1 h-6 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span>Progress</span>
                                                {progressStatusFilters.length > 0 && (
                                                    <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-medium">
                                                        {progressStatusFilters.length}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-[#1e293b] border-slate-700 text-white p-3 w-56">
                                        <div className="mb-2 text-slate-300 text-sm">Select progress</div>
                                        <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                                            {progressStatusOptions.map((status) => (
                                                <div key={status} className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={progressStatusFilters.includes(status)}
                                                        onCheckedChange={() => toggleProgressStatusFilter(status)}
                                                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleProgressStatusFilter(status)}
                                                        className="text-sm text-slate-200 text-left w-full"
                                                    >
                                                        {status}
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

                            {/* Type Filter */}
                            <div className="flex-1 min-w-[120px] bg-[#1e293b] rounded-md border border-slate-700 p-1">
                                <Select
                                    value={filterType}
                                    onValueChange={setFilterType}
                                >
                                    <SelectTrigger className="w-full border-none bg-transparent text-white focus:ring-0 h-6 text-xs">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all_types">All Types</SelectItem>
                                        <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                        <SelectItem value="Small Value Procurement(SVP)">Small Value Procurement(SVP)</SelectItem>
                                        <SelectItem value="Attendance Sheets">Attendance Sheets</SelectItem>
                                        <SelectItem value="Receipt">Receipt</SelectItem>
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                                size="icon"
                                onClick={clearFilters}
                                className="bg-[#1e293b] border-slate-700 text-slate-400 hover:text-white ml-auto h-8 w-8"
                                title="Clear Filters"
                            >
                                <FilterX className="h-4 w-4" />
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
                                        <Checkbox
                                            checked={paginatedProcurements.length > 0 && paginatedProcurements.every(p => selectedIds.includes(p.id))}
                                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                            className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                    </TableHead>
                                    <TableHead className="text-slate-300 w-[150px]">PR Number</TableHead>
                                    <TableHead className="text-slate-300">Project Title</TableHead>
                                    <TableHead className="text-slate-300">Division</TableHead>
                                    <TableHead className="text-slate-300">Type</TableHead>
                                    <TableHead className="text-slate-300 w-[130px]">Location</TableHead>
                                    <TableHead className="text-center text-slate-300 w-[80px]">Stack #</TableHead>
                                    <TableHead className="text-slate-300">Storage Unit</TableHead>
                                    <TableHead className="text-slate-300">Progress</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Procurement Date</TableHead>
                                    <TableHead className="text-right text-slate-300">Actions</TableHead>
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
                                    paginatedProcurements.map((procurement) => (
                                        <TableRow key={procurement.id} className="border-slate-800 hover:bg-[#1e293b]">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(procurement.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(procurement.id, checked as boolean)}
                                                    className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-white">
                                                {procurement.procurementType === 'Attendance Sheets' ? 'N/A' : procurement.prNumber}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-slate-400" title={procurement.projectName || ''}>
                                                {procurement.projectName || '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-slate-300" title={procurement.division || ''}>
                                                {procurement.division || '-'}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {procurement.procurementType === 'Regular Bidding' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        Regular Bidding
                                                    </span>
                                                ) : procurement.procurementType === 'Small Value Procurement(SVP)' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        Small Value Procurement(SVP)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                        {procurement.procurementType || '-'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <MapPin className="h-3 w-3 text-blue-500" />
                                                    <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                                                        {getLocationString(procurement)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-slate-400 text-sm font-mono">
                                                    {procurement.stackNumber ? `↕${procurement.stackNumber}` : '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {procurement.boxId ? (
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4 text-orange-400" />
                                                        <span className="text-slate-400 text-sm font-mono">
                                                            {boxes.find(b => b.id === procurement.boxId)?.code || 'BOX'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-4 w-4 rounded-full border border-slate-600 flex-shrink-0"
                                                            style={{
                                                                backgroundColor: folders.find(f => f.id === procurement.folderId)?.color || '#FF6B6B'
                                                            }}
                                                        />
                                                        <span className="text-slate-400 text-sm font-mono">
                                                            {folders.find(f => f.id === procurement.folderId)?.code || '-'}
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {procurement.procurementType === 'Attendance Sheets' ? (
                                                    <span className="text-slate-500">N/A</span>
                                                ) : (
                                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${procurement.progressStatus === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        procurement.progressStatus === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            procurement.progressStatus === 'Cancelled' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                                                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                        }`}>
                                                        {procurement.progressStatus || 'Pending'}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {procurement.procurementType === 'Attendance Sheets' ? (
                                                    <span className="text-slate-500">N/A</span>
                                                ) : (
                                                    <Select
                                                        value={procurement.status}
                                                        onValueChange={(value) => handleStatusChange(procurement, value as ProcurementStatus)}
                                                    >
                                                        <SelectTrigger className={`w-[130px] border ${procurement.status === 'active'
                                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                            : 'bg-slate-700/50 text-slate-300 border-slate-700'
                                                            }`}>
                                                            <SelectValue>
                                                                {procurement.status === 'active' ? 'Borrowed' : 'Archived'}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                            <SelectItem value="active" className="text-orange-400 focus:text-orange-400">Borrowed</SelectItem>
                                                            <SelectItem value="archived" className="text-slate-300 focus:text-white">Archived</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-400">
                                                {procurement.procurementDate ? format(new Date(procurement.procurementDate), 'MMM d, yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isFolderView && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRelocateClick(procurement)}
                                                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                            title="Relocate / Reorder"
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setViewProcurement(procurement)}
                                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
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
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
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
                )}
            </Card>

            {/* Edit Dialog - Fixed Layout */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="border-slate-800 bg-[#0f172a] text-white max-w-2xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Edit Record</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the procurement details and location.
                        </DialogDescription>
                    </DialogHeader>

                    {editingProcurement && (
                        <div className="flex-1 overflow-y-auto p-6 pt-2">
                            <div className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-slate-300">PR Number Construction</Label>
                                        <div className="grid grid-cols-4 gap-2 items-end p-3 rounded-lg bg-[#1e293b]/50 border border-slate-700/50">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-400">Division</Label>
                                                <Select value={editDivisionId} onValueChange={setEditDivisionId}>
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white h-8 text-xs">
                                                        <SelectValue placeholder="Div" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
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
                                            value={format(new Date(editingProcurement.dateAdded), 'yyyy-MM-dd')}
                                            disabled
                                            className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Division</Label>
                                        <Input
                                            value={editingProcurement.division || ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, division: e.target.value })}
                                            className="bg-[#1e293b] border-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Enter division"
                                            disabled={editingProcurement.status === 'archived'}
                                        />
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
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Procurement Type</Label>
                                        <Select
                                            value={editingProcurement.procurementType || 'Regular Bidding'}
                                            onValueChange={(value) => setEditingProcurement({ ...editingProcurement, procurementType: value })}
                                        >
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                                                <SelectItem value="Small Value Procurement">Small Value Procurement (SVP)</SelectItem>
                                                <SelectItem value="Shopping">Shopping</SelectItem>
                                                <SelectItem value="Direct Contracting">Direct Contracting</SelectItem>
                                                <SelectItem value="Negotiated Procurement">Negotiated Procurement</SelectItem>
                                                <SelectItem value="Attendance Sheet">Attendance Sheet</SelectItem>
                                                <SelectItem value="Official Receipt">Official Receipt</SelectItem>
                                                <SelectItem value="Others">Others</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Progress Status</Label>
                                        <Select
                                            value={editingProcurement.progressStatus || 'Pending'}
                                            onValueChange={(value) => setEditingProcurement({ ...editingProcurement, progressStatus: value as 'Pending' | 'Success' | 'Failed' })}
                                        >
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectItem value="Pending" className="text-yellow-400">Pending</SelectItem>
                                                <SelectItem value="Success" className="text-emerald-400">Success</SelectItem>
                                                <SelectItem value="Failed" className="text-red-400">Failed</SelectItem>
                                                <SelectItem value="Cancelled" className="text-slate-400">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div >
                            </div>

                            {/* Checklist (Always shown for reference, or user can ignore) */}
                            < div className="bg-[#0f172a] p-4 rounded-lg border border-slate-800 space-y-4" >
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
                                                const allChecked = {
                                                    noticeToProceed: true,
                                                    contractOfAgreement: true,
                                                    noticeOfAward: true,
                                                    bacResolutionAward: true,
                                                    postQualReport: true,
                                                    noticePostQual: true,
                                                    bacResolutionPostQual: true,
                                                    abstractBidsEvaluated: true,
                                                    twgBidEvalReport: true,
                                                    minutesBidOpening: true,
                                                    resultEligibilityCheck: true,
                                                    biddersTechFinancialProposals: true,
                                                    minutesPreBid: true,
                                                    biddingDocuments: true,
                                                    inviteObservers: true,
                                                    officialReceipt: true,
                                                    boardResolution: true,
                                                    philgepsAwardNotice: true,
                                                    philgepsPosting: true,
                                                    websitePosting: true,
                                                    postingCertificate: true,
                                                    fundsAvailability: true
                                                };

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
                                                const allUnchecked = {
                                                    noticeToProceed: false,
                                                    contractOfAgreement: false,
                                                    noticeOfAward: false,
                                                    bacResolutionAward: false,
                                                    postQualReport: false,
                                                    noticePostQual: false,
                                                    bacResolutionPostQual: false,
                                                    abstractBidsEvaluated: false,
                                                    twgBidEvalReport: false,
                                                    minutesBidOpening: false,
                                                    resultEligibilityCheck: false,
                                                    biddersTechFinancialProposals: false,
                                                    minutesPreBid: false,
                                                    biddingDocuments: false,
                                                    inviteObservers: false,
                                                    officialReceipt: false,
                                                    boardResolution: false,
                                                    philgepsAwardNotice: false,
                                                    philgepsPosting: false,
                                                    websitePosting: false,
                                                    postingCertificate: false,
                                                    fundsAvailability: false
                                                };

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
                            </div >


                            {
                                editingProcurement.status === 'active' && (
                                    <div className="grid grid-cols-2 gap-4 bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                                        <div className="space-y-2">
                                            <Label className="text-orange-300">Borrower Name</Label>
                                            <Input
                                                value={editingProcurement.borrowerName || ''}
                                                onChange={(e) => setEditingProcurement({ ...editingProcurement, borrowerName: e.target.value })}
                                                className="bg-[#1e293b] border-orange-500/30 text-white focus:border-orange-500"
                                                placeholder="Enter borrower name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-orange-300">Return Date</Label>
                                            <Input
                                                type="date"
                                                value={editingProcurement.returnDate ? format(new Date(editingProcurement.returnDate), 'yyyy-MM-dd') : ''}
                                                onChange={(e) => setEditingProcurement({ ...editingProcurement, returnDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                className="bg-[#1e293b] border-orange-500/30 text-white focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                )
                            }

                            < div className="space-y-2 border-t border-slate-800 pt-4" >
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-lg font-semibold text-white">Location</Label>
                                    <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setEditingProcurement({ ...editingProcurement, boxId: null })}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${!editingProcurement.boxId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Shelf
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingProcurement({ ...editingProcurement, boxId: '', shelfId: null, cabinetId: null, folderId: null })} // Set boxId to managed empty string (to show dropdown) but clear others
                                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${editingProcurement.boxId !== undefined && editingProcurement.boxId !== null ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Box
                                        </button>
                                    </div>
                                </div>

                                {
                                    !editingProcurement.boxId && editingProcurement.boxId !== '' ? (
                                        <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Shelf</Label>
                                                <Select
                                                    value={editingProcurement.cabinetId}
                                                    onValueChange={(val) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        cabinetId: val,
                                                        cabinetId: val,
                                                        shelfId: null,
                                                        folderId: null
                                                    })}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue />
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
                                                    value={editingProcurement.shelfId}
                                                    onValueChange={(val) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        shelfId: val,
                                                        shelfId: val,
                                                        folderId: null
                                                    })}
                                                    disabled={!editingProcurement.cabinetId}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {editAvailableShelves.map((s) => (
                                                            <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Folder</Label>
                                                <Select
                                                    value={editingProcurement.folderId}
                                                    onValueChange={(val) => setEditingProcurement({ ...editingProcurement, folderId: val })}
                                                    disabled={!editingProcurement.shelfId}
                                                >
                                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                        {editAvailableFolders.map((f) => (
                                                            <SelectItem key={f.id} value={f.id}>{f.code} - {f.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Box</Label>
                                                <Select
                                                    value={editingProcurement.boxId || ''}
                                                    onValueChange={(val) => setEditingProcurement({
                                                        ...editingProcurement,
                                                        boxId: val,
                                                        boxId: val,
                                                        shelfId: null, cabinetId: null, folderId: null // Clear others
                                                    })}
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
                                        </div>
                                    )
                                }
                            </div >

                            <div className="border-t border-slate-800 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Status</Label>
                                    <Select
                                        value={editingProcurement.status}
                                        onValueChange={(val) => setEditingProcurement({ ...editingProcurement, status: val as ProcurementStatus })}
                                    >
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectItem value="archived">Archived</SelectItem>
                                            <SelectItem value="active">Borrowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Borrower Information Section - Always shown */}
                            <div className="space-y-4 border-t border-slate-800 pt-4">
                                <Label className="text-lg font-semibold text-white">Borrower Information</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Borrowed By</Label>
                                        <Input
                                            value={editingProcurement.borrowedBy || ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, borrowedBy: e.target.value })}
                                            className="bg-[#1e293b] border-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Enter name"
                                            disabled={editingProcurement.status === 'archived'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Borrower Division</Label>
                                        <Select
                                            value={editingProcurement.borrowerDivision || ''}
                                            onValueChange={(val) => setEditingProcurement({ ...editingProcurement, borrowerDivision: val })}
                                            disabled={editingProcurement.status === 'archived'}
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Borrowed Date</Label>
                                        <Input
                                            type="text"
                                            value={editingProcurement.borrowedDate ? format(new Date(editingProcurement.borrowedDate), 'MMMM d, yyyy') : 'Not set'}
                                            disabled
                                            className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Return Date</Label>
                                        <Input
                                            type="text"
                                            value={editingProcurement.returnDate ? format(new Date(editingProcurement.returnDate), 'MMMM d, yyyy') : 'Not set'}
                                            disabled
                                            className="bg-[#1e293b]/50 border-slate-700 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {editingProcurement.status === 'archived' && (
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Returned By</Label>
                                        <Input
                                            value={editingProcurement.returnedBy || ''}
                                            onChange={(e) => setEditingProcurement({ ...editingProcurement, returnedBy: e.target.value })}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                            placeholder="Enter name of person who returned"
                                        />
                                    </div>
                                )}
                            </div>


                            {/* Record History Section */}
                            < div className="space-y-4 border-t border-slate-800 pt-4" >
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
                            </div >
                        </div >

                    )}

                    <DialogFooter className="p-6 pt-2 border-t border-slate-800 bg-[#0f172a]">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >

            {/* Return Modal */}
            < Dialog open={!!returnModal} onOpenChange={() => setReturnModal(null)}>
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
            </Dialog >

            {/* Borrow Edit Modal */}
            < Dialog open={!!borrowEditModal} onOpenChange={() => setBorrowEditModal(null)}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Borrow File</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter the borrower details. The borrowed date will be automatically recorded.
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
            </Dialog >
            <ProcurementDetailsDialog
                open={!!viewProcurement}
                onOpenChange={(open) => !open && setViewProcurement(null)}
                procurement={viewProcurement}
                getLocationString={getLocationString}
                folders={folders}
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
        </div >
    );
};

export default ProcurementList;
