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

    const DatePickerField = ({ label, date, setDate }: { label: string, date: Date | undefined, setDate: (d: Date | undefined) => void }) => (
        <div className="flex flex-col space-y-1">
            <Label className="text-xs text-slate-400">{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={`h-9 w-full justify-start text-left font-normal bg-[#1e293b] border-slate-700 text-white hover:bg-[#253045] ${!date && "text-muted-foreground"}`}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick date</span>}
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

    // Progression-style date field with checkbox
    const ProgressionDateField = React.useCallback(({
        label,
        date,
        setDate,
        isDisabled = false
    }: {
        label: string,
        date: Date | undefined,
        setDate: (d: Date | undefined) => void,
        isDisabled?: boolean
    }) => {
        const checked = !!date;

        const handleCheckboxChange = (newChecked: boolean) => {
            if (newChecked) {
                if (!date) setDate(new Date());
            } else {
                setDate(undefined);
            }
        };

        const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setDate(e.target.value ? new Date(e.target.value) : undefined);
        };

        return (
            <div className={`relative p-4 rounded-lg border transition-all ${isDisabled
                ? 'bg-slate-900/30 border-slate-800/50 opacity-50'
                : checked
                    ? 'bg-emerald-900/20 border-emerald-700/50'
                    : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                }`}>
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={checked}
                        onCheckedChange={handleCheckboxChange}
                        disabled={isDisabled}
                        className="mt-1 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1 space-y-2">
                        <Label className={`text-sm font-medium ${checked ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {label}
                        </Label>
                        <Input
                            type="date"
                            value={date ? format(date, 'yyyy-MM-dd') : ''}
                            onChange={handleDateChange}
                            disabled={!checked || isDisabled}
                            className={`h-9 ${!checked || isDisabled
                                ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-[#0f172a] border-slate-600 text-white'
                                }`}
                        />
                    </div>
                    {checked && date && (
                        <div className="absolute -right-2 -top-2 bg-emerald-600 text-white rounded-full p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        );
    }, []);

    return (
        <div className="space-y-6 pb-20 fade-in animate-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Add Procurement</h1>
                    <p className="text-slate-400 mt-1">Create a new record</p>
                </div>
                <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setFormMode('SVP')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formMode === 'SVP' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Small Value Procurement
                    </button>
                    <button
                        onClick={() => setFormMode('Regular')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formMode === 'Regular' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Regular Bidding
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Basic Information */}
                <Card className="border-none bg-[#0f172a] shadow-lg">
                    <CardContent className="p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
                            {formMode === 'SVP' ? 'SVP Details' : 'Regular Bidding Details'}
                        </h3>

                        {/* Project Title */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Project Title (Particulars)</Label>
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
                            <Label className="text-slate-300">End User (Division)</Label>
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
                                <Label className="text-slate-300">ABC (Approved Budget for Contract)</Label>
                                <Input
                                    type="text"
                                    value={getDisplayValue(abc)}
                                    onChange={(e) => handleNumberInput(e.target.value, setAbc)}
                                    placeholder="5,000,000.00"
                                    className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                />
                                <p className="text-xs text-slate-500">Amount in Philippine Pesos (commas added automatically)</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Bid Amount (Contract Price)</Label>
                                <Input
                                    type="text"
                                    value={getDisplayValue(bidAmount)}
                                    onChange={(e) => handleNumberInput(e.target.value, setBidAmount)}
                                    placeholder="5,000,000.00"
                                    className="bg-[#1e293b] border-slate-700 text-white font-mono"
                                />
                                <p className="text-xs text-slate-500">Actual awarded/contract amount</p>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Remarks</Label>
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
                                <Label className="text-slate-300">Process Status</Label>
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
                                <Label className="text-slate-300">Date Status Updated</Label>
                                <DatePickerField label="" date={dateStatusUpdated} setDate={setDateStatusUpdated} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Checklist Section */}
                <Card className="border-none bg-[#0f172a] shadow-lg">
                    <CardContent className="p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <h3 className="text-lg font-semibold text-white">
                                Attached Documents Checklist
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

                {/* 2. Monitoring Process (Standard Grid) */}
                <Card className="border-none bg-[#0f172a] shadow-lg">
                    <CardContent className="p-6 space-y-6">
                        <div className="border-b border-slate-800 pb-2">
                            <h3 className="text-lg font-semibold text-white">
                                {formMode === 'Regular' ? 'Regular Bidding Monitoring Progress' : 'SVP Monitoring Process'}
                            </h3>
                            <p className="text-sm text-slate-400">
                                Track the key dates of the procurement process.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {formMode === 'Regular' ? (
                                // Regular Bidding - Grouped Sections
                                <div className="space-y-6">
                                    {/* PRE-PROCUREMENT */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Pre-Procurement</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="Received PR for Action"
                                                date={receivedPrDate}
                                                setDate={setReceivedPrDate}
                                            />
                                            <ProgressionDateField
                                                label="PR Deliberated"
                                                date={prDeliberatedDate}
                                                setDate={setPrDeliberatedDate}
                                                isDisabled={!receivedPrDate}
                                            />
                                            <ProgressionDateField
                                                label="Published (Procurement Date)"
                                                date={publishedDate}
                                                setDate={setPublishedDate}
                                                isDisabled={!prDeliberatedDate}
                                            />
                                        </div>
                                    </div>

                                    {/* BIDDING PROPER */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Bidding Proper</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="Pre-bid"
                                                date={preBidDate}
                                                setDate={setPreBidDate}
                                                isDisabled={!publishedDate}
                                            />
                                            <ProgressionDateField
                                                label="Bid Opening"
                                                date={bidOpeningDate}
                                                setDate={setBidOpeningDate}
                                                isDisabled={!preBidDate}
                                            />
                                            <ProgressionDateField
                                                label="Bid Evaluation Report"
                                                date={bidEvaluationDate}
                                                setDate={setBidEvaluationDate}
                                                isDisabled={!bidOpeningDate}
                                            />
                                        </div>
                                    </div>

                                    {/* QUALIFICATION & AWARD */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Qualification & Award</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="Post-Qualification"
                                                date={postQualDate}
                                                setDate={setPostQualDate}
                                                isDisabled={!bidEvaluationDate}
                                            />
                                            <ProgressionDateField
                                                label="Post-Qualification Report"
                                                date={postQualReportDate}
                                                setDate={setPostQualReportDate}
                                                isDisabled={!postQualDate}
                                            />
                                            <ProgressionDateField
                                                label="BAC Resolution"
                                                date={bacResolutionDate}
                                                setDate={setBacResolutionDate}
                                                isDisabled={!postQualReportDate}
                                            />
                                            <ProgressionDateField
                                                label="NOA (Notice of Award)"
                                                date={noaDate}
                                                setDate={setNoaDate}
                                                isDisabled={!bacResolutionDate}
                                            />
                                            <ProgressionDateField
                                                label="Contract Date"
                                                date={contractDate}
                                                setDate={setContractDate}
                                                isDisabled={!noaDate}
                                            />
                                            <ProgressionDateField
                                                label="NTP (Notice to Proceed)"
                                                date={ntpDate}
                                                setDate={setNtpDate}
                                                isDisabled={!contractDate}
                                            />
                                            <ProgressionDateField
                                                label="Forwarded to OAPIA"
                                                date={forwardedOapiDate}
                                                setDate={setForwardedOapiDate}
                                                isDisabled={!ntpDate}
                                            />

                                            {/* Awarded to Supplier (Date + Supplier Name) */}
                                            <div className={`relative p-4 rounded-lg border transition-all col-span-full ${!forwardedOapiDate
                                                ? 'bg-slate-900/30 border-slate-800/50 opacity-50'
                                                : awardedToDate
                                                    ? 'bg-emerald-900/20 border-emerald-700/50'
                                                    : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                                                }`}>
                                                <div className="flex items-start gap-3 mb-3">
                                                    <Checkbox
                                                        checked={!!awardedToDate}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                if (!awardedToDate) setAwardedToDate(new Date());
                                                            } else {
                                                                setAwardedToDate(undefined);
                                                            }
                                                        }}
                                                        disabled={!forwardedOapiDate}
                                                        className="mt-1 border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                    <div className="flex-1">
                                                        <Label className={`text-sm font-medium ${awardedToDate ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                            Awarded to Supplier
                                                        </Label>
                                                        <p className="text-xs text-slate-500 mt-0.5">Final step — enter the award date and supplier name</p>
                                                    </div>
                                                    {awardedToDate && (
                                                        <div className="absolute -right-2 -top-2 bg-emerald-600 text-white rounded-full p-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2 pl-7">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Award Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={awardedToDate ? format(awardedToDate, 'yyyy-MM-dd') : ''}
                                                            onChange={(e) => setAwardedToDate(e.target.value ? new Date(e.target.value) : undefined)}
                                                            disabled={!awardedToDate || !forwardedOapiDate}
                                                            className={`h-9 ${!awardedToDate || !forwardedOapiDate
                                                                ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                                                : 'bg-[#0f172a] border-slate-600 text-white'
                                                                }`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-slate-400">Supplier / Awardee Name</Label>
                                                        <Input
                                                            type="text"
                                                            value={supplier}
                                                            onChange={(e) => setSupplier(e.target.value)}
                                                            placeholder="Enter supplier name..."
                                                            disabled={!awardedToDate || !forwardedOapiDate}
                                                            className={`h-9 ${!awardedToDate || !forwardedOapiDate
                                                                ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                                                                : 'bg-[#0f172a] border-slate-600 text-white'
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // SVP Monitoring - Simplified Process
                                <>
                                    {/* Pre-Procurement */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Pre-Procurement</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="Received PR for Action"
                                                date={receivedPrDate}
                                                setDate={setReceivedPrDate}
                                            />
                                            <ProgressionDateField
                                                label="PR Deliberated"
                                                date={prDeliberatedDate}
                                                setDate={setPrDeliberatedDate}
                                                isDisabled={!receivedPrDate}
                                            />
                                            <ProgressionDateField
                                                label="Published (Procurement Date)"
                                                date={publishedDate}
                                                setDate={setPublishedDate}
                                                isDisabled={!prDeliberatedDate}
                                            />
                                        </div>
                                    </div>

                                    {/* Canvassing */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-purple-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Canvassing</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="RFQ for Canvass"
                                                date={rfqCanvassDate}
                                                setDate={setRfqCanvassDate}
                                                isDisabled={!publishedDate}
                                            />
                                            <ProgressionDateField
                                                label="RFQ Opening"
                                                date={rfqOpeningDate}
                                                setDate={setRfqOpeningDate}
                                                isDisabled={!rfqCanvassDate}
                                            />
                                        </div>
                                    </div>

                                    {/* Award */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Award</h4>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <ProgressionDateField
                                                label="BAC Resolution"
                                                date={bacResolutionDate}
                                                setDate={setBacResolutionDate}
                                                isDisabled={!rfqOpeningDate}
                                            />
                                            <ProgressionDateField
                                                label="Forwarded GSD for P.O."
                                                date={forwardedGsdDate}
                                                setDate={setForwardedGsdDate}
                                                isDisabled={!bacResolutionDate}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>



                {/* 3. Additional Info */}
                < Card className="border-none bg-[#0f172a] shadow-lg" >
                    <CardContent className="p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">
                            Additional Information
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
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
                                <Label className="text-slate-300">Staff In Charge</Label>
                                <Input
                                    value={staffIncharge}
                                    onChange={(e) => setStaffIncharge(e.target.value)}
                                    placeholder="Person responsible for this record..."
                                    className="bg-[#1e293b] border-slate-700 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Notes</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Enter any additional notes or important information..."
                                className="bg-[#1e293b] border-slate-700 text-white min-h-[80px] resize-y"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card >

                {/* 4. Location */}
                < Card className="border-none bg-[#0f172a] shadow-lg" >
                    <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Storage Location</h3>
                                <p className="text-sm text-slate-400">Where is the physical file stored?</p>
                            </div>
                            <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setStorageMode('shelf')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${storageMode === 'shelf'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <FolderTree className="h-4 w-4" />
                                    Drawer Storage
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStorageMode('box')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${storageMode === 'box'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <Archive className="h-4 w-4" />
                                    Box Storage
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {/* Drawer & Cabinet - Only for Shelf Mode */}
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
                                                    <SelectItem key={c.id} value={c.id} className="text-white">
                                                        {c.code} - {c.name}
                                                    </SelectItem>
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
                                                    <SelectItem key={s.id} value={s.id} className="text-white">
                                                        {s.code} - {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Box - Only for Box Mode */}
                            {storageMode === 'box' && (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <Label className="text-slate-300">Box</Label>
                                    <Select value={boxId} onValueChange={setBoxId}>
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue placeholder="Select a box..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            {boxes.map((b) => (
                                                <SelectItem key={b.id} value={b.id} className="text-white">
                                                    {b.code} - {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">Select the box where the file will be stored</p>
                                </div>
                            )}

                            {/* 3. Folder (Details depend on mode) */}
                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                <Label className="text-slate-300">
                                    {storageMode === 'box' ? 'Folder in Box *' : 'Folder *'}
                                </Label>
                                <Select
                                    value={folderId}
                                    onValueChange={setFolderId}
                                    disabled={storageMode === 'box' ? !boxId : !shelfId}
                                >
                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white flex-1">
                                        <SelectValue placeholder="Select Folder" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        {availableFolders.map((f) => (
                                            <SelectItem key={f.id} value={f.id} className="text-white">
                                                {f.code} - {f.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {(storageMode === 'box' ? boxId : shelfId) && availableFolders.length === 0 && (
                                <p className="text-xs text-amber-500">No folders found. Create one.</p>
                            )}

                            {/* Create Folder Modal Overlay */}
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
                                    <Select value={status} onValueChange={(val) => {
                                        setStatus(val as ProcurementStatus);
                                        // Auto-populate date if switching to Borrowed and date is empty
                                        if (val === 'active' && !borrowedDate) {
                                            setBorrowedDate(new Date());
                                        }
                                    }}>
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectItem value="archived" className="text-white">Archived (In Storage)</SelectItem>
                                            <SelectItem value="active" className="text-white">Borrowed (Out)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Conditional Borrowed Form */}
                                {status === 'active' && (
                                    <div className="mt-6 p-4 rounded-lg bg-amber-900/20 border border-amber-700/50 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                                            <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Borrowing Information</h4>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            {/* Borrower Name */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Who Borrows</Label>
                                                <Input
                                                    value={borrowerName}
                                                    onChange={(e) => setBorrowerName(e.target.value)}
                                                    placeholder="Enter borrower's name..."
                                                    className="bg-[#1e293b] border-slate-700 text-white"
                                                />
                                            </div>

                                            {/* Borrowing Division */}
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

                                        {/* Borrowed Date */}
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">When Was Borrowed</Label>
                                            <DatePickerField label="" date={borrowedDate} setDate={setBorrowedDate} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card >

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold shadow-xl"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Saving Record...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            Save Procurement Record
                        </>
                    )}
                </Button>
            </form >
        </div >
    );
};

export default AddProcurement;


