import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { addProcurement, onDivisionsChange, addFolder } from '@/lib/storage';
import { getProcessSteps, isStepDisabled } from '@/lib/validation-utils';
import { useData } from '@/contexts/DataContext';
import { Shelf, Folder, Box, ProcurementStatus, Division, ProcurementProcessStatus } from '@/types/procurement';
import { toast } from 'sonner';
import { Loader2, Save, CalendarIcon, Archive, FolderTree, Plus, X } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { constructPrNumber, getNextPrSequence, formatSequence } from '@/lib/pr-number-utils';
import { formatNumberWithCommas, removeCommas, handleNumberInput, getDisplayValue } from '@/lib/number-utils';

const MONTHS = [
    { value: 'JAN', label: 'January' },
    { value: 'FEB', label: 'February' },
    { value: 'MAR', label: 'March' },
    { value: 'APR', label: 'April' },
    { value: 'MAY', label: 'May' },
    { value: 'JUN', label: 'June' },
    { value: 'JUL', label: 'July' },
    { value: 'AUG', label: 'August' },
    { value: 'SEP', label: 'September' },
    { value: 'OCT', label: 'October' },
    { value: 'NOV', label: 'November' },
    { value: 'DEC', label: 'December' },
];

const checklistItems = CHECKLIST_ITEMS;

const PROCUREMENT_PROCESS_STATUSES: ProcurementProcessStatus[] = [
    'Completed',
    'In Progress',
    'Returned PR to EU',
    'Not yet Acted',
    'Failure',
    'Cancelled'
];

type FormMode = 'SVP' | 'Regular';

const AddProcurement: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { cabinets, shelves, folders, boxes, procurements } = useData(); // cabinets=Drawers, shelves=Cabinets

    // Divisions State
    const [divisions, setDivisions] = useState<Division[]>([]);

    // Filtered location options based on selection
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]); // "Cabinets"
    const [availableBoxes, setAvailableBoxes] = useState<Box[]>([]);
    const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);

    // Form Mode
    const [formMode, setFormMode] = useState<FormMode>('SVP');
    const [activeTab, setActiveTab] = useState<'basic' | 'monitoring' | 'documents' | 'storage'>('basic');

    // Common Fields
    const [projectName, setProjectName] = useState(''); // "Particulars"
    const [description, setDescription] = useState(''); // "Remarks"
    const [status, setStatus] = useState<ProcurementStatus>('archived'); // Storage Status
    const [procurementProcessStatus, setProcurementProcessStatus] = useState<ProcurementProcessStatus>('Not yet Acted');
    const [dateStatusUpdated, setDateStatusUpdated] = useState<Date | undefined>(new Date());

    // Financials
    const [abc, setAbc] = useState<string>('');
    const [bidAmount, setBidAmount] = useState<string>('');
    const [supplier, setSupplier] = useState('');

    // Additional Fields
    const [notes, setNotes] = useState('');
    const [staffIncharge, setStaffIncharge] = useState(user?.name || '');

    // Borrowed Information (conditional on status === 'borrowed')
    const [borrowerName, setBorrowerName] = useState('');
    const [borrowingDivisionId, setBorrowingDivisionId] = useState('');
    const [borrowedDate, setBorrowedDate] = useState<Date | undefined>();

    // Date Added
    const [dateAdded, setDateAdded] = useState<Date | undefined>(new Date());

    // PR Number Construction State
    const [prDivisionId, setPrDivisionId] = useState(''); // Separate from End User Division
    const [prMonth, setPrMonth] = useState(format(new Date(), 'MMM').toUpperCase());
    const [prYear, setPrYear] = useState(format(new Date(), 'yy'));
    const [prSequence, setPrSequence] = useState('001');



    // Division Selection (End User)
    const [selectedDivisionId, setSelectedDivisionId] = useState('');

    // Storage Location State
    const [storageMode, setStorageMode] = useState<'shelf' | 'box'>('shelf');
    const [cabinetId, setCabinetId] = useState(''); // Drawer ID
    const [shelfId, setShelfId] = useState('');     // Cabinet ID
    const [folderId, setFolderId] = useState('');   // Folder ID
    const [boxId, setBoxId] = useState('');         // Box ID

    // Folder Creation in Box
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderCode, setNewFolderCode] = useState('');

    // Monitoring Dates - Common
    const [receivedPrDate, setReceivedPrDate] = useState<Date>();
    const [prDeliberatedDate, setPrDeliberatedDate] = useState<Date>();
    const [publishedDate, setPublishedDate] = useState<Date>(); // Procurement Date
    const [rfqCanvassDate, setRfqCanvassDate] = useState<Date>();
    const [rfqOpeningDate, setRfqOpeningDate] = useState<Date>();
    const [bacResolutionDate, setBacResolutionDate] = useState<Date>();
    const [forwardedGsdDate, setForwardedGsdDate] = useState<Date>();

    // Monitoring Dates - Regular Bidding specific
    const [preBidDate, setPreBidDate] = useState<Date>();
    const [bidOpeningDate, setBidOpeningDate] = useState<Date>();
    const [bidEvaluationDate, setBidEvaluationDate] = useState<Date>();
    const [postQualDate, setPostQualDate] = useState<Date>();
    const [postQualReportDate, setPostQualReportDate] = useState<Date>();
    const [forwardedOapiDate, setForwardedOapiDate] = useState<Date>();
    const [noaDate, setNoaDate] = useState<Date>();
    const [contractDate, setContractDate] = useState<Date>();
    const [ntpDate, setNtpDate] = useState<Date>();
    const [awardedToDate, setAwardedToDate] = useState<Date>();

    // Checklist State (for Regular Bidding mostly, but keeping structure)
    // We'll treat checklist items more as date tracking per user request
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});

    // Monitoring Process Checkboxes for progression
    // logic to disable steps based on previous steps



    // Auto-generate Sequence based on PR Division and Year
    useEffect(() => {
        if (prDivisionId && prYear) {
            const div = divisions.find(d => d.id === prDivisionId);
            if (!div) return;

            const yearStr = `-${prYear}-`;
            const divStr = `${div.abbreviation}-`;

            const matching = procurements.filter(p =>
                p.prNumber.startsWith(divStr) &&
                p.prNumber.includes(yearStr)
            );

            let maxSeq = 0;
            matching.forEach(p => {
                const parts = p.prNumber.split('-');
                if (parts.length >= 4) {
                    const seq = parseInt(parts[3]);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            });

            setPrSequence((maxSeq + 1).toString().padStart(3, '0'));
        }
    }, [prDivisionId, prYear, divisions, procurements, prMonth]);


    // Fetch Divisions
    useEffect(() => {
        const unsub = onDivisionsChange(setDivisions);
        return () => unsub();
    }, []);

    // Update available shelves (Cabinets) when cabinet (Drawer) changes
    useEffect(() => {
        if (cabinetId) {
            setAvailableShelves(shelves.filter(s => s.cabinetId === cabinetId));
            setShelfId('');
            setBoxId('');
            setFolderId('');
        } else {
            setAvailableShelves([]);
        }
    }, [cabinetId, shelves]);

    // Update available boxes and folders when shelf (Cabinet) changes
    useEffect(() => {
        if (shelfId) {
            setAvailableBoxes(boxes.filter(b => b.shelfId === shelfId));

            if (storageMode === 'shelf') {
                setAvailableFolders(folders.filter(f => f.shelfId === shelfId && !f.boxId)); // Only direct folders
            }
            setBoxId('');
            setFolderId('');
        } else {
            setAvailableBoxes([]);
            if (storageMode === 'shelf') setAvailableFolders([]);
        }
    }, [shelfId, boxes, folders, storageMode]);

    // Update available folders when Box changes (Box Mode)
    useEffect(() => {
        if (storageMode === 'box') {
            if (boxId) {
                setAvailableFolders(folders.filter(f => f.boxId === boxId));
            } else {
                setAvailableFolders([]);
            }
            setFolderId('');
        }
    }, [boxId, folders, storageMode]);

    // Re-trigger folder update when storageMode changes (to switch between Shelf folders and Box folders)
    useEffect(() => {
        if (storageMode === 'shelf' && shelfId) {
            setAvailableFolders(folders.filter(f => f.shelfId === shelfId && !f.boxId));
            setBoxId(''); // Clear box if switching to shelf mode
        } else if (storageMode === 'box') {
            setFolderId(''); // Clear folder when creating/switching to box mode until box is selected
            setAvailableFolders([]);
        }
    }, [storageMode, shelfId, folders]);

    const handleCreateFolder = async () => {
        if (!newFolderName || !newFolderCode) {
            toast.error("Name and Code required");
            return;
        }

        try {
            if (storageMode === 'box' && boxId) {
                await addFolder(boxId, newFolderName, newFolderCode, '', undefined, 'box');
                toast.success("Folder created in Box");
            } else if (storageMode === 'shelf' && shelfId) {
                await addFolder(shelfId, newFolderName, newFolderCode, '', undefined, 'shelf');
                toast.success("Folder created in Cabinet");
            }
            setIsCreatingFolder(false);
            setNewFolderName('');
            setNewFolderCode('');
        } catch (e) {
            toast.error("Failed to create folder");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!projectName) {
            toast.error('Project Title (Particulars) is required');
            return;
        }
        // Validate PR Number construction
        const prDivisionAbbr = divisions.find(d => d.id === prDivisionId)?.abbreviation || 'XXX';
        const constructedPrNumber = prDivisionId && prMonth && prYear && prSequence
            ? `${prDivisionAbbr}-${prMonth}-${prYear}-${prSequence}`
            : '';
        if (!constructedPrNumber || !prDivisionId) {
            toast.error('Please complete all PR Number fields (Division, Month, Year, Sequence)');
            return;
        }

        // ABC and Bid Amount Validation
        const cleanAbc = abc ? parseFloat(removeCommas(abc)) : 0;
        const cleanBid = bidAmount ? parseFloat(removeCommas(bidAmount)) : 0;

        if (formMode === 'SVP') {
            if (cleanAbc >= 1000000) {
                toast.error('SVP ABC must be less than 1,000,000');
                return;
            }
            if (cleanBid >= 1000000) {
                toast.error('SVP Bid Amount must be less than 1,000,000');
                return;
            }
        } else if (formMode === 'Regular') {
            if (cleanAbc < 1000000) {
                toast.error('Regular Bidding ABC must be at least 1,000,000');
                return;
            }
        }

        if (storageMode === 'shelf' && (!cabinetId || !shelfId || !folderId)) {
            toast.error('Please select full shelf storage location (Drawer -> Cabinet -> Folder)');
            return;
        }

        if (storageMode === 'box' && (!boxId || !folderId)) {
            toast.error('Please select a box and a folder inside it');
            return;
        }

        // For box mode, we need to get the shelf info from the box
        let finalCabinetId = cabinetId;
        let finalShelfId = shelfId;
        if (storageMode === 'box' && boxId) {
            const selectedBox = boxes.find(b => b.id === boxId);
            if (selectedBox) {
                finalShelfId = selectedBox.shelfId;
                const selectedShelf = shelves.find(s => s.id === selectedBox.shelfId);
                if (selectedShelf) {
                    finalCabinetId = selectedShelf.cabinetId;
                }
            }
        }

        setIsLoading(true);

        try {
            // Calculate disposal date (5 years from now)
            const disposalDate = dateAdded ? addYears(dateAdded, 5).toISOString() : addYears(new Date(), 5).toISOString();
            const selectedDivision = divisions.find(d => d.id === selectedDivisionId);

            const procurementData: any = {
                prNumber: constructedPrNumber,
                description, // Remarks
                projectName, // Particulars
                procurementType: formMode === 'SVP' ? 'SVP' : 'Regular Bidding',
                division: selectedDivision?.name, // End User

                // Location
                cabinetId: storageMode === 'shelf' ? cabinetId : finalCabinetId,
                shelfId: storageMode === 'shelf' ? shelfId : finalShelfId,
                folderId, // Common for both
                boxId: storageMode === 'box' ? boxId : undefined,

                status,
                procurementStatus: procurementProcessStatus,
                dateStatusUpdated: dateStatusUpdated?.toISOString(),

                urgencyLevel: 'medium',
                dateAdded: dateAdded ? dateAdded.toISOString() : new Date().toISOString(),
                disposalDate,

                // Financials
                abc: abc ? parseFloat(removeCommas(abc)) : undefined,
                bidAmount: bidAmount ? parseFloat(removeCommas(bidAmount)) : undefined,
                supplier: supplier || undefined,
                notes,
                remarks: description, // Mapping description to remarks explicitly too

                // Dates - Common
                receivedPrDate: receivedPrDate ? receivedPrDate.toISOString() : undefined,
                publishedDate: publishedDate?.toISOString(),
                rfqCanvassDate: rfqCanvassDate?.toISOString(),
                rfqOpeningDate: rfqOpeningDate?.toISOString(),
                bacResolutionDate: bacResolutionDate?.toISOString(),
                forwardedGsdDate: forwardedGsdDate?.toISOString(),

                // Dates - Regular
                preBidDate: preBidDate?.toISOString(),
                bidOpeningDate: bidOpeningDate?.toISOString(),
                bidEvaluationDate: bidEvaluationDate?.toISOString(),
                postQualDate: postQualDate?.toISOString(),
                postQualReportDate: postQualReportDate?.toISOString(),
                forwardedOapiDate: forwardedOapiDate?.toISOString(),
                noaDate: noaDate?.toISOString(),
                contractDate: contractDate?.toISOString(),
                ntpDate: ntpDate?.toISOString(),
                awardedToDate: awardedToDate?.toISOString(),

                checklist: checklist, // If specialized checks needed
                tags: [],
            };

            await addProcurement(
                procurementData,
                user?.email || 'unknown@example.com', // staffIncharge email (hidden)
                staffIncharge // staffIncharge name
            );

            toast.success('File record added successfully');
            // Navigate to appropriate list
            if (formMode === 'SVP') {
                navigate('/procurement/list?type=SVP'); // Pending implementation of dedicated route
            } else {
                navigate('/procurement/list?type=Regular');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to add file record');
        } finally {
            setIsLoading(false);
        }
    };



    // Tab validation: basic tab requires projectName, PR details, selected division, and ABC, Staff, Status, Date
    const canGoToMonitoring = !!projectName.trim() &&
        !!prDivisionId &&
        !!prMonth &&
        !!prYear &&
        !!prSequence &&
        !!selectedDivisionId &&
        !!abc.trim() &&
        !!staffIncharge.trim() &&
        !!procurementProcessStatus &&
        !!dateStatusUpdated;
    // Storage can be navigated to if Monitoring is reachable (since Monitoring dates are optional)
    const canGoToDocuments = canGoToMonitoring;
    const canGoToStorage = canGoToDocuments;

    const TAB_LABELS = { basic: '1. Basic Info', monitoring: '2. Monitoring', documents: '3. Documents', storage: '4. Storage' };

    return (
        <div className="space-y-6 pb-20 fade-in animate-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Add Procurement</h1>
                    <p className="text-slate-400 mt-1">Create a new record</p>
                </div>
                <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setFormMode('SVP')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formMode === 'SVP' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Small Value Procurement
                    </button>
                    <button
                        onClick={() => setFormMode('Regular')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formMode === 'Regular' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Regular Bidding
                    </button>
                </div>
            </div>

            {/* Step Tab Navigation */}
            <div className="flex bg-[#0f172a] rounded-xl border border-slate-800 p-1 gap-1 overflow-x-auto">
                {(['basic', 'monitoring', 'documents', 'storage'] as const).map(tab => {
                    const isDisabled = (tab === 'monitoring' && !canGoToMonitoring) ||
                        (tab === 'documents' && !canGoToDocuments) ||
                        (tab === 'storage' && !canGoToStorage);
                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => { if (!isDisabled) setActiveTab(tab); }}
                            disabled={isDisabled}
                            className={`flex-1 flex items-center justify-center min-w-[130px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isDisabled
                                ? 'opacity-50 cursor-not-allowed text-slate-500 bg-transparent'
                                : activeTab === tab
                                    ? (tab === 'basic' ? 'bg-blue-600 text-white shadow-md'
                                        : tab === 'monitoring' ? 'bg-purple-600 text-white shadow-md'
                                            : tab === 'documents' ? 'bg-amber-600 text-white shadow-md'
                                                : 'bg-emerald-600 text-white shadow-md')
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {isDisabled && <span className="mr-2 text-[10px]">🔒</span>}
                            {TAB_LABELS[tab]}
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* TAB 1: Basic Information */}
                <div className={activeTab !== 'basic' ? 'hidden' : ''}>
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
                                {formMode === 'SVP' ? 'SVP Details' : 'Regular Bidding Details'}
                                <span className="ml-2 text-xs font-normal text-slate-500">Fields marked with <span className="text-red-400">*</span> are required</span>
                            </h3>

                            {/* Project Title */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Project Title (Particulars) <span className="text-red-400">*</span></Label>
                                <Input
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="Enter project title..."
                                    className="bg-[#1e293b] border-slate-700 text-white"
                                />
                            </div>

                            {/* PR Number Construction */}
                            <div className="p-4 rounded-lg bg-[#1e293b]/50 border border-slate-700/50 space-y-4">
                                <Label className="text-slate-300">PR Number Construction</Label>
                                <div className="grid gap-4 md:grid-cols-4 items-end">
                                    {/* Division Acronym */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Division (for PR Number)</Label>
                                        <Select value={prDivisionId} onValueChange={setPrDivisionId}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select Division" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                {[...divisions].sort((a, b) => a.name.localeCompare(b.name)).map(div => (
                                                    <SelectItem key={div.id} value={div.id}>
                                                        {div.abbreviation} - {div.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Month */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Month</Label>
                                        <Select value={prMonth} onValueChange={setPrMonth}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                                                {MONTHS.map(m => (
                                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Year (YY) */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Year (YY)</Label>
                                        <Input
                                            type="text"
                                            maxLength={2}
                                            value={prYear}
                                            onChange={(e) => setPrYear(e.target.value)}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>

                                    {/* Sequence */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Sequence</Label>
                                        <Input
                                            value={prSequence}
                                            onChange={(e) => setPrSequence(e.target.value)}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-slate-400">
                                    Preview: <span className="font-mono text-emerald-400 font-bold ml-2">{prDivisionId && divisions.find(d => d.id === prDivisionId) ? `${divisions.find(d => d.id === prDivisionId)?.abbreviation}-${prMonth}-${prYear}-${prSequence}` : 'XXX-XXX-XX-XXX'}</span>
                                </div>
                            </div>

                            {/* End User (Division) */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">End User (Division) <span className="text-red-400">*</span></Label>
                                <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectValue placeholder="Select Division" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        {[...divisions].sort((a, b) => a.name.localeCompare(b.name)).map(div => (
                                            <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ABC and Bid Amount */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">ABC (Approved Budget for Contract) <span className="text-red-400">*</span></Label>
                                    <Input
                                        type="text"
                                        value={getDisplayValue(abc)}
                                        onChange={(e) => handleNumberInput(e.target.value, setAbc)}
                                        onBlur={() => {
                                            const val = abc ? parseFloat(removeCommas(abc)) : 0;
                                            if (val > 0) {
                                                if (formMode === 'SVP' && val >= 1000000) {
                                                    toast.error("SVP ABC cannot exceed 1 Million");
                                                } else if (formMode === 'Regular' && val < 1000000) {
                                                    toast.error("Regular Bidding ABC must be at least 1 Million");
                                                }
                                            }
                                        }}
                                        placeholder={formMode === 'SVP' ? "50,000.00" : "5,000,000.00"}
                                        className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                    />
                                    <p className="text-xs text-slate-500">Amount in Philippine Pesos (commas added automatically)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Bid Amount (Contract Price) <span className="text-slate-500 text-xs">(Optional)</span></Label>
                                    <Input
                                        type="text"
                                        value={getDisplayValue(bidAmount)}
                                        onChange={(e) => handleNumberInput(e.target.value, setBidAmount)}
                                        onBlur={() => {
                                            const val = bidAmount ? parseFloat(removeCommas(bidAmount)) : 0;
                                            if (val > 0) {
                                                if (formMode === 'SVP' && val >= 1000000) {
                                                    toast.error("SVP Bid Amount cannot exceed 1 Million");
                                                }
                                            }
                                        }}
                                        placeholder={formMode === 'SVP' ? "50,000.00" : "5,000,000.00"}
                                        className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                    />
                                    <p className="text-xs text-slate-500">Actual awarded/contract amount</p>
                                </div>
                            </div>

                            {/* Additional Information Section */}
                            <div className="pt-4 border-t border-slate-800 space-y-4">
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    Additional Information
                                </h4>

                                <div className="grid gap-6 md:grid-cols-2 mt-2">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Supplier / Awarded To</Label>
                                        <Input
                                            value={supplier}
                                            onChange={(e) => setSupplier(e.target.value)}
                                            placeholder="Enter supplier or company name..."
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Staff In Charge <span className="text-red-400">*</span></Label>
                                        <Input
                                            value={staffIncharge}
                                            onChange={(e) => setStaffIncharge(e.target.value)}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <Label className="text-slate-300">Notes <span className="text-slate-500 text-xs">(Optional)</span></Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Enter any additional notes or important information..."
                                        className="bg-[#1e293b] border-slate-700 text-white min-h-[80px] resize-y"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                <Label className="text-slate-300">Remarks <span className="text-slate-500 text-xs">(Optional)</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter any additional remarks or notes..."
                                    className="bg-[#1e293b] border-slate-700 text-white min-h-[80px] resize-y"
                                    rows={3}
                                />
                            </div>

                            {/* Process Status and Date */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Process Status <span className="text-red-400">*</span></Label>
                                    <Select value={procurementProcessStatus} onValueChange={(val: any) => setProcurementProcessStatus(val)}>
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            {PROCUREMENT_PROCESS_STATUSES.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Date Status Updated <span className="text-red-400">*</span></Label>
                                    <Input
                                        type="date"
                                        defaultValue={dateStatusUpdated ? format(dateStatusUpdated, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val && val.length === 10) {
                                                const d = new Date(val);
                                                if (!isNaN(d.getTime())) setDateStatusUpdated(d);
                                            } else if (!val) {
                                                setDateStatusUpdated(undefined);
                                            }
                                        }}
                                        className="bg-[#1e293b] border-slate-700 text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Info Next Button */}
                    <div className="flex justify-end mt-4">
                        <Button type="button" onClick={() => setActiveTab('monitoring')} disabled={!canGoToMonitoring} className={`px-8 text-white ${!canGoToMonitoring ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}>
                            Next: Monitoring &rarr;
                        </Button>
                    </div>
                </div>

                {/* TAB 3: Documents — Checklist */}
                <div className={activeTab !== 'documents' ? 'hidden' : ''}>
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <h3 className="text-lg font-semibold text-white">
                                    Attached Documents Checklist <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                                </h3>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                        onClick={() => {
                                            const allChecked: any = {};
                                            checklistItems.forEach(item => allChecked[item.key] = true);
                                            setChecklist(allChecked);
                                        }}
                                    >
                                        Check All
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                        onClick={() => setChecklist({})}
                                    >
                                        Uncheck All
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {/* Left Column */}
                                <div className="space-y-3">
                                    {checklistItems.slice(0, 11).map((item) => (
                                        <div key={item.key} className="flex items-start space-x-3 p-2 rounded hover:bg-slate-800/50 transition-colors">
                                            <Checkbox
                                                id={item.key}
                                                checked={!!checklist[item.key]}
                                                onCheckedChange={(checked) =>
                                                    setChecklist(prev => ({ ...prev, [item.key]: !!checked }))
                                                }
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mt-0.5"
                                            />
                                            <label
                                                htmlFor={item.key}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 cursor-pointer"
                                            >
                                                {item.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-3">
                                    {checklistItems.slice(11).map((item) => (
                                        <div key={item.key} className="flex items-start space-x-3 p-2 rounded hover:bg-slate-800/50 transition-colors">
                                            <Checkbox
                                                id={item.key}
                                                checked={!!checklist[item.key]}
                                                onCheckedChange={(checked) =>
                                                    setChecklist(prev => ({ ...prev, [item.key]: !!checked }))
                                                }
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mt-0.5"
                                            />
                                            <label
                                                htmlFor={item.key}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 cursor-pointer"
                                            >
                                                {item.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card >

                    {/* Prev / Next Navigation for Documents tab */}
                    <div className="flex justify-between mt-4">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('monitoring')} className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
                            &larr; Previous: Monitoring
                        </Button>
                        <Button type="button" onClick={() => setActiveTab('storage')} disabled={!canGoToStorage} className={`px-8 text-white ${!canGoToStorage ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            Next: Storage &rarr;
                        </Button>
                    </div>
                </div>

                {/* TAB 2: Monitoring Process â€” correctly placed outside Documents */}
                <div className={activeTab !== 'monitoring' ? 'hidden' : ''} id="tab-monitoring">
                    {/* TAB 2: Monitoring Process */}
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <div className="border-b border-slate-800 pb-2">
                                <h3 className="text-lg font-semibold text-white">
                                    {formMode === 'Regular' ? 'Regular Bidding Monitoring Progress' : 'SVP Monitoring Process'}
                                    <span className="ml-2 text-slate-500 text-xs font-normal">(Optional — check dates as they are completed)</span>
                                </h3>
                            </div>

                            <div className="space-y-6 pt-4 pb-6">
                                {formMode === 'Regular' ? (
                                    <>
                                        {/* Pre-Procurement */}
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="Received PR to Action" date={receivedPrDate} setDate={(d: Date | undefined) => { setReceivedPrDate(d); if (!d) { setPrDeliberatedDate(undefined); setPublishedDate(undefined); setPreBidDate(undefined); setBidOpeningDate(undefined); setBidEvaluationDate(undefined); setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} activeColor="blue" />
                                                <MonitoringDateField label="PR Deliberated" date={prDeliberatedDate} setDate={(d: Date | undefined) => { setPrDeliberatedDate(d); if (!d) { setPublishedDate(undefined); setPreBidDate(undefined); setBidOpeningDate(undefined); setBidEvaluationDate(undefined); setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!receivedPrDate} activeColor="blue" />
                                                <MonitoringDateField label="Published" date={publishedDate} setDate={(d: Date | undefined) => { setPublishedDate(d); if (!d) { setPreBidDate(undefined); setBidOpeningDate(undefined); setBidEvaluationDate(undefined); setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!prDeliberatedDate} activeColor="blue" />
                                            </div>
                                        </div>

                                        {/* Bidding Proper */}
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="Pre-Bid" date={preBidDate} setDate={(d: Date | undefined) => { setPreBidDate(d); if (!d) { setBidOpeningDate(undefined); setBidEvaluationDate(undefined); setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!publishedDate} activeColor="purple" />
                                                <MonitoringDateField label="Bid Opening" date={bidOpeningDate} setDate={(d: Date | undefined) => { setBidOpeningDate(d); if (!d) { setBidEvaluationDate(undefined); setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!preBidDate} activeColor="purple" />
                                                <MonitoringDateField label="Bid Evaluation Report" date={bidEvaluationDate} setDate={(d: Date | undefined) => { setBidEvaluationDate(d); if (!d) { setBacResolutionDate(undefined); setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!bidOpeningDate} activeColor="purple" />
                                            </div>
                                        </div>

                                        {/* Award */}
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="BAC Resolution" date={bacResolutionDate} setDate={(d: Date | undefined) => { setBacResolutionDate(d); if (!d) { setPostQualDate(undefined); setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!bidEvaluationDate} activeColor="emerald" />
                                                <MonitoringDateField label="Post Qualification" date={postQualDate} setDate={(d: Date | undefined) => { setPostQualDate(d); if (!d) { setPostQualReportDate(undefined); setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!bacResolutionDate} activeColor="emerald" />
                                                <MonitoringDateField label="Post Qualification Report" date={postQualReportDate} setDate={(d: Date | undefined) => { setPostQualReportDate(d); if (!d) { setForwardedOapiDate(undefined); setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!postQualDate} activeColor="emerald" />
                                                <MonitoringDateField label="Forwarded to OAPIA" date={forwardedOapiDate} setDate={(d: Date | undefined) => { setForwardedOapiDate(d); if (!d) { setNoaDate(undefined); setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!postQualReportDate} activeColor="emerald" />
                                                <MonitoringDateField label="Notice of Award" date={noaDate} setDate={(d: Date | undefined) => { setNoaDate(d); if (!d) { setContractDate(undefined); setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!forwardedOapiDate} activeColor="emerald" />
                                                <MonitoringDateField label="Contract Date" date={contractDate} setDate={(d: Date | undefined) => { setContractDate(d); if (!d) { setNtpDate(undefined); setAwardedToDate(undefined); } }} isDisabled={!noaDate} activeColor="emerald" />
                                                <MonitoringDateField label="Notice to Proceed" date={ntpDate} setDate={(d: Date | undefined) => { setNtpDate(d); if (!d) { setAwardedToDate(undefined); } }} isDisabled={!contractDate} activeColor="emerald" />

                                                {/* Final Step: Awarded to Supplier Date */}
                                                <MonitoringDateField label="Awarded to Supplier" date={awardedToDate} setDate={(d: Date | undefined) => setAwardedToDate(d)} isDisabled={!ntpDate} activeColor="emerald" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Pre-Procurement */}
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="Received PR to Action" date={receivedPrDate} setDate={(d: Date | undefined) => { setReceivedPrDate(d); if (!d) { setPrDeliberatedDate(undefined); setPublishedDate(undefined); setRfqCanvassDate(undefined); setRfqOpeningDate(undefined); setBacResolutionDate(undefined); setForwardedGsdDate(undefined); } }} activeColor="blue" />
                                                <MonitoringDateField label="PR Deliberated" date={prDeliberatedDate} setDate={(d: Date | undefined) => { setPrDeliberatedDate(d); if (!d) { setPublishedDate(undefined); setRfqCanvassDate(undefined); setRfqOpeningDate(undefined); setBacResolutionDate(undefined); setForwardedGsdDate(undefined); } }} isDisabled={!receivedPrDate} activeColor="blue" />
                                                <MonitoringDateField label="Published" date={publishedDate} setDate={(d: Date | undefined) => { setPublishedDate(d); if (!d) { setRfqCanvassDate(undefined); setRfqOpeningDate(undefined); setBacResolutionDate(undefined); setForwardedGsdDate(undefined); } }} isDisabled={!prDeliberatedDate} activeColor="blue" />
                                            </div>
                                        </div>

                                        {/* Canvassing */}
                                        <div className="space-y-2">
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <MonitoringDateField label="RFQ to Canvass" date={rfqCanvassDate} setDate={(d: Date | undefined) => { setRfqCanvassDate(d); if (!d) { setRfqOpeningDate(undefined); setBacResolutionDate(undefined); setForwardedGsdDate(undefined); } }} isDisabled={!publishedDate} activeColor="purple" />
                                                <MonitoringDateField label="RFQ Opening" date={rfqOpeningDate} setDate={(d: Date | undefined) => { setRfqOpeningDate(d); if (!d) { setBacResolutionDate(undefined); setForwardedGsdDate(undefined); } }} isDisabled={!rfqCanvassDate} activeColor="purple" />
                                                <MonitoringDateField label="BAC Resolution" date={bacResolutionDate} setDate={(d: Date | undefined) => { setBacResolutionDate(d); if (!d) { setForwardedGsdDate(undefined); } }} isDisabled={!rfqOpeningDate} activeColor="purple" />
                                                <MonitoringDateField label="Forwarded to GSD for P.O" date={forwardedGsdDate} setDate={(d: Date | undefined) => { setForwardedGsdDate(d); }} isDisabled={!bacResolutionDate} activeColor="purple" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monitoring Tab Nav Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('basic')} className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
                            &larr; Previous: Basic Info
                        </Button>
                        <Button type="button" onClick={() => setActiveTab('documents')} disabled={!canGoToDocuments} className={`px-8 text-white ${!canGoToDocuments ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            Next: Documents &rarr;
                        </Button>
                    </div>
                </div>

                {/* TAB 3 (cont): Documents â€” Additional Info + continuation */}
                <div className={activeTab !== 'documents' ? 'hidden' : ''} id="tab-documents-extra">

                    {/* TAB 3 (cont): Documents — Additional Info */}
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
                                Additional Information
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Supplier / Awarded To <span className="text-slate-500 text-xs">(Optional)</span></Label>
                                    <Input
                                        value={supplier}
                                        onChange={(e) => setSupplier(e.target.value)}
                                        placeholder="Enter supplier or company name..."
                                        className="bg-[#1e293b] border-slate-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Staff In Charge <span className="text-red-400">*</span></Label>
                                    <Input
                                        value={staffIncharge}
                                        onChange={(e) => setStaffIncharge(e.target.value)}
                                        placeholder="Person responsible for this record..."
                                        className="bg-[#1e293b] border-slate-700 text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Notes <span className="text-slate-500 text-xs">(Optional)</span></Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter any additional notes or important information..."
                                    className="bg-[#1e293b] border-slate-700 text-white min-h-[80px] resize-y"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents Extra Nav Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('monitoring')} className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
                            &larr; Previous: Monitoring
                        </Button>
                        <Button type="button" onClick={() => setActiveTab('storage')} disabled={!canGoToStorage} className={`px-8 text-white ${!canGoToStorage ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            Next: Storage &rarr;
                        </Button>
                    </div>
                </div>


                {/* TAB 4: Storage Location */}
                <div className={activeTab !== 'storage' ? 'hidden' : ''}>
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-1">Storage Location <span className="text-red-400">*</span></h3>
                                    <p className="text-sm text-slate-400">Where is the physical file stored?</p>
                                </div>
                                <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setStorageMode('shelf')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${storageMode === 'shelf' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <FolderTree className="h-4 w-4" />
                                        Drawer Storage
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStorageMode('box')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${storageMode === 'box' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Archive className="h-4 w-4" />
                                        Box Storage
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {storageMode === 'shelf' && (
                                    <div className="grid gap-4 md:grid-cols-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Drawer</Label>
                                            <Select value={cabinetId} onValueChange={setCabinetId}>
                                                <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                    <SelectValue placeholder="Select Drawer" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                    {cabinets.map((c) => (
                                                        <SelectItem key={c.id} value={c.id} className="text-white">{c.code} - {c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Cabinet</Label>
                                            <Select value={shelfId} onValueChange={setShelfId} disabled={!cabinetId}>
                                                <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                    <SelectValue placeholder="Select Cabinet" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                    {availableShelves.map((s) => (
                                                        <SelectItem key={s.id} value={s.id} className="text-white">{s.code} - {s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {storageMode === 'box' && (
                                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                        <Label className="text-slate-300">Box</Label>
                                        <Select value={boxId} onValueChange={setBoxId}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select a box..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                {boxes.map((b) => (
                                                    <SelectItem key={b.id} value={b.id} className="text-white">{b.code} - {b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500">Select the box where the file will be stored</p>
                                    </div>
                                )}

                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Label className="text-slate-300">
                                        {storageMode === 'box' ? 'Folder in Box *' : 'Folder *'}
                                    </Label>
                                    <Select value={folderId} onValueChange={setFolderId} disabled={storageMode === 'box' ? !boxId : !shelfId}>
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white flex-1">
                                            <SelectValue placeholder="Select Folder" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            {availableFolders.map((f) => (
                                                <SelectItem key={f.id} value={f.id} className="text-white">{f.code} - {f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(storageMode === 'box' ? boxId : shelfId) && availableFolders.length === 0 && (
                                    <p className="text-xs text-amber-500">No folders found. Create one.</p>
                                )}

                                {isCreatingFolder && (
                                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-semibold text-white">Create New Folder</h4>
                                            <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreatingFolder(false)} className="h-6 w-6 p-0 hover:bg-slate-700"><X className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-slate-400">Name</Label>
                                                <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="h-8 bg-[#1e293b] border-slate-600" placeholder="Folder Name" />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-400">Code</Label>
                                                <Input value={newFolderCode} onChange={(e) => setNewFolderCode(e.target.value)} className="h-8 bg-[#1e293b] border-slate-600" placeholder="e.g. F1" />
                                            </div>
                                        </div>
                                        <Button type="button" onClick={handleCreateFolder} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">Create Folder</Button>
                                    </div>
                                )}

                                <div className="border-t border-slate-700 pt-4 mt-2">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Physical File Status</Label>
                                        <Select value={status} onValueChange={(val) => { setStatus(val as ProcurementStatus); if (val === 'active' && !borrowedDate) { setBorrowedDate(new Date()); } }}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectItem value="archived" className="text-white">Archived (In Storage)</SelectItem>
                                                <SelectItem value="active" className="text-white">Borrowed (Out)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {status === 'active' && (
                                        <div className="mt-6 p-4 rounded-lg bg-amber-900/20 border border-amber-700/50 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                                                <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Borrowing Information</h4>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Who Borrows</Label>
                                                    <Input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="Enter borrower's name..." className="bg-[#1e293b] border-slate-700 text-white" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Division Who Borrows</Label>
                                                    <Select value={borrowingDivisionId} onValueChange={setBorrowingDivisionId}>
                                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                            <SelectValue placeholder="Select Division" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                                            {[...divisions].sort((a, b) => a.name.localeCompare(b.name)).map(div => (
                                                                <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">When Was Borrowed</Label>
                                                <DatePickerField label="" date={borrowedDate} setDate={setBorrowedDate} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Tab Nav Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button type="button" variant="outline" onClick={() => setActiveTab('documents')} className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8">
                            &larr; Previous: Documents
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || (storageMode === 'shelf' ? (!cabinetId || !shelfId || !folderId) : (!cabinetId || !shelfId || !boxId || !folderId))}
                            className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 text-white px-10 py-4 text-base font-semibold shadow-xl"
                        >
                            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving Record...</> : <><Save className="mr-2 h-5 w-5" />Save Procurement Record</>}
                        </Button>
                    </div>
                </div>

            </form >
        </div >
    );
};
export default AddProcurement;


// Extracted Components to prevent focus loss

const MonitoringDateField = ({ label, date, setDate, isDisabled = false, activeColor = 'blue' }: any) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dateStr = date ? format(date, 'yyyy-MM-dd') : '';

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
        <div className={`space-y-2 p-3 rounded-lg border transition-all ${isDisabled ? 'border-slate-800 bg-slate-900/30 opacity-50' : date ? `${activeClasses.border} ${activeClasses.bg}` : 'border-slate-700 bg-slate-800/30'}`}>
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={!!date}
                    onCheckedChange={(c) => setDate(c ? new Date() : undefined)}
                    disabled={isDisabled}
                    className={`h-4 w-4 border-slate-500 ${activeClasses.checkBg} ${activeClasses.checkBorder} disabled:opacity-50`}
                />
                <span className={`text-sm font-medium ${date ? activeClasses.text : isDisabled ? 'text-slate-600' : 'text-slate-300'}`}>{label}</span>
            </div>
            <div className="pl-6">
                <input
                    ref={inputRef}
                    type="date"
                    max="9999-12-31"
                    defaultValue={dateStr}
                    onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== dateStr) setDate(val ? new Date(val) : undefined);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (val !== dateStr) setDate(val ? new Date(val) : undefined);
                        }
                    }}
                    disabled={isDisabled}
                    className={`h-8 px-2 rounded-md bg-[#0f172a] border border-slate-700 text-slate-300 text-xs w-full outline-none ${activeClasses.ring} ${isDisabled ? 'cursor-not-allowed opacity-50' : ''} [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert`}
                />
            </div>
        </div>
    );
};

const DatePickerField = ({ label, date, setDate }: { label: string, date: Date | undefined, setDate: (d: Date | undefined) => void }) => (
    <div className="flex flex-col space-y-1">
        <Label className="text-xs text-slate-400">{label}</Label>
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`h-9 w-full justify-between text-left font-normal bg-[#1e293b] border-slate-700 text-white hover:bg-[#253045] ${!date && "text-muted-foreground"}`}
                >
                    <span>{date ? format(date, "PPP") : "Pick date"}</span>
                    <CalendarIcon className="ml-2 h-4 w-4 text-white opacity-100" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-slate-700">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="bg-[#1e293b] text-white"
                />
            </PopoverContent>
        </Popover>
    </div>
);




