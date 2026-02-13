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
import { addProcurement, onDivisionsChange } from '@/lib/storage';
import { useData } from '@/contexts/DataContext';
import { Shelf, Folder, ProcurementStatus, Division, ProgressStatus } from '@/types/procurement';
import { toast } from 'sonner';
import { Loader2, Save, CalendarIcon, Archive, FolderTree } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

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

const PROCUREMENT_TYPES = [
    'Regular Bidding',
    'Small Value Procurement(SVP)',
    'Attendance Sheets',
    'Receipt',
    'Others'
] as const;

const AddProcurement: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { cabinets, shelves, folders, boxes, procurements } = useData();

    // Divisions State
    const [divisions, setDivisions] = useState<Division[]>([]);

    // Filtered location options based on selection
    const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);
    const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);

    // Form State
    const [procurementType, setProcurementType] = useState<typeof PROCUREMENT_TYPES[number]>('Regular Bidding');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<ProcurementStatus>('archived'); // Default to Archived
    const [progressStatus, setProgressStatus] = useState<ProgressStatus>('Pending');
    const [dateAdded, setDateAdded] = useState<Date | undefined>(new Date());
    // Split Procurement Date State
    const [procDateMonth, setProcDateMonth] = useState<string>('');
    const [procDateDay, setProcDateDay] = useState<string>('');
    const [procDateYear, setProcDateYear] = useState<string>('');

    // PR Number State
    const [selectedDivisionId, setSelectedDivisionId] = useState('');
    const [prMonth, setPrMonth] = useState(format(new Date(), 'MMM').toUpperCase());
    const [prYear, setPrYear] = useState(format(new Date(), 'yy')); // Last 2 digits
    const [prSequence, setPrSequence] = useState('001');

    // Storage Location State
    const [storageMode, setStorageMode] = useState<'shelf' | 'box'>('shelf');
    const [cabinetId, setCabinetId] = useState('');
    const [shelfId, setShelfId] = useState('');
    const [folderId, setFolderId] = useState('');
    const [boxId, setBoxId] = useState('');

    // Checklist State (Expanded)
    const [checklist, setChecklist] = useState({
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
        otherDocsPeculiar: false,
        // O.1 - O.4
        inviteObservers: false,
        officialReceipt: false,
        boardResolution: false,
        philgepsAwardNotice: false,
        // P
        inviteApplyEligibility: false,
        philgepsPosting: false,
        websitePosting: false,
        postingCertificate: false,
        // Q
        fundsAvailability: false,
    });

    // Fetch Divisions
    useEffect(() => {
        const unsub = onDivisionsChange(setDivisions);
        return () => unsub();
    }, []);

    // Update available shelves when cabinet changes
    useEffect(() => {
        if (cabinetId) {
            setAvailableShelves(shelves.filter(s => s.cabinetId === cabinetId));
            setShelfId('');
            setFolderId('');
        } else {
            setAvailableShelves([]);
        }
    }, [cabinetId, shelves]);

    // Update available folders when shelf changes
    useEffect(() => {
        if (shelfId) {
            setAvailableFolders(folders.filter(f => f.shelfId === shelfId));
            setFolderId('');
        } else {
            setAvailableFolders([]);
        }
    }, [shelfId, folders]);

    // Auto-generate Sequence based on Division and Year
    useEffect(() => {
        if (selectedDivisionId && prYear) {
            // Find division abbr
            const div = divisions.find(d => d.id === selectedDivisionId);
            if (!div) return;

            // Filter procurements matching this division and year pattern
            // Pattern: ABBR-MMM-YY-XXX
            const yearStr = `-${prYear}-`;
            const divStr = `${div.abbreviation}-`;

            const matching = procurements.filter(p =>
                p.prNumber.startsWith(divStr) &&
                p.prNumber.includes(yearStr)
            );

            // Find max sequence
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
    }, [selectedDivisionId, prYear, divisions, procurements, prMonth]);

    // Derived PR Number
    const selectedDivision = divisions.find(d => d.id === selectedDivisionId);

    // Helper to check if type is special (hides extra fields)
    const isSpecialType = ['Attendance Sheets', 'Receipt', 'Others'].includes(procurementType);

    // Format: DIV-MMM-YY-SEQ (e.g., IT-FEB-26-001) OR 'N/A' for special types
    const generatedPRNumber = isSpecialType
        ? 'N/A'
        : `${selectedDivision ? selectedDivision.abbreviation : 'XXX'}-${prMonth}-${prYear}-${prSequence}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!description) {
            toast.error('Description is required');
            return;
        }

        // Only validate Division/Sequence for regular types
        if (!isSpecialType) {
            if (!selectedDivisionId || !prSequence) {
                toast.error('Please fill in all required fields (Division, Sequence)');
                return;
            }
        }

        if (storageMode === 'shelf' && (!cabinetId || !shelfId || !folderId)) {
            toast.error('Please select full shelf storage location');
            return;
        }

        if (storageMode === 'box' && !boxId) {
            toast.error('Please select a box');
            return;
        }

        setIsLoading(true);

        try {
            // Calculate disposal date (5 years from now)
            const disposalDate = dateAdded ? addYears(dateAdded, 5).toISOString() : addYears(new Date(), 5).toISOString();

            const procurementData: any = {
                prNumber: generatedPRNumber,
                description,
                projectName,
                procurementType,
                division: selectedDivision?.name || 'N/A', // Store Name or N/A

                // Location
                cabinetId: storageMode === 'shelf' ? cabinetId : undefined,
                shelfId: storageMode === 'shelf' ? shelfId : undefined,
                folderId: storageMode === 'shelf' ? folderId : undefined,
                boxId: storageMode === 'box' ? boxId : undefined,

                status, // User can now select status for all types
                progressStatus: isSpecialType ? 'Pending' : progressStatus, // Default to Pending if hidden
                urgencyLevel: 'medium',
                dateAdded: dateAdded ? dateAdded.toISOString() : new Date().toISOString(),
                procurementDate: (procDateMonth && procDateDay && procDateYear)
                    ? new Date(`${procDateMonth} ${procDateDay}, ${procDateYear}`).toISOString()
                    : undefined,
                disposalDate,
                checklist: (!isSpecialType && procurementType === 'Regular Bidding') ? checklist : undefined,
                tags: [],
            };

            await addProcurement(
                procurementData,
                user?.email || 'unknown@example.com',
                user?.name || 'Unknown User'
            );

            toast.success('File record added successfully');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Failed to add file record');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChecklistChange = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6 pb-10 fade-in animate-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-white">Add New Procurement</h1>
                <p className="text-slate-400 mt-1">Create a new procurement record and track its location</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 lg:grid-cols-1">
                    {/* Basic Information */}
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">Basic Information</h3>
                                <p className="text-sm text-slate-400">Essential details about the procurement</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Procurement Type</Label>
                                    <Select
                                        value={procurementType}
                                        onValueChange={(val: any) => setProcurementType(val)}
                                    >
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            {PROCUREMENT_TYPES.map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Project Name</Label>
                                    <Input
                                        placeholder="Project Title..."
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Division</Label>
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
                            </div>

                            {/* PR Number Construction - Conditional */}
                            {!isSpecialType && (
                                <div className="p-4 rounded-lg bg-[#1e293b]/50 border border-slate-700/50 space-y-4">
                                    <Label className="text-slate-300">PR Number Construction</Label>
                                    <div className="grid gap-4 md:grid-cols-3 items-end">
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
                                        Preview: <span className="font-mono text-emerald-400 font-bold ml-2">{generatedPRNumber}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Procurement Date (Date Received)</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Select value={procDateMonth} onValueChange={setProcDateMonth}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white h-[200px]">
                                                {MONTHS.map(m => (
                                                    <SelectItem key={m.value} value={m.label}>{m.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            placeholder="Day"
                                            value={procDateDay}
                                            onChange={(e) => setProcDateDay(e.target.value)}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                            min={1}
                                            max={31}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Year"
                                            value={procDateYear}
                                            onChange={(e) => setProcDateYear(e.target.value)}
                                            className="bg-[#1e293b] border-slate-700 text-white"
                                            min={2000}
                                            max={2100}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Date Added (Created)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal bg-[#1e293b] border-slate-700 text-white hover:bg-[#253045]"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateAdded ? format(dateAdded, 'PPP') : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#1e293b] border-slate-700">
                                            <Calendar
                                                mode="single"
                                                selected={dateAdded}
                                                onSelect={setDateAdded}
                                                initialFocus
                                                className="bg-[#1e293b] text-white"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Description *</Label>
                                <Textarea
                                    placeholder="Describe the items or services..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checklist (Conditional) */}
                    {!isSpecialType && (
                        <Card className="border-none bg-[#0f172a] shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                            <CardContent className="p-6 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="text-lg font-semibold text-white">Attached Documents</h3>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                                                onClick={() => {
                                                    const allChecked = Object.keys(checklist).reduce((acc, key) => ({ ...acc, [key]: true }), {});
                                                    setChecklist(allChecked as any);
                                                }}
                                            >
                                                Check All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
                                                onClick={() => {
                                                    const allUnchecked = Object.keys(checklist).reduce((acc, key) => ({ ...acc, [key]: false }), {});
                                                    setChecklist(allUnchecked as any);
                                                }}
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400">Required documents for Regular Bidding</p>
                                </div>
                                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {[
                                        { key: 'noticeToProceed', label: 'A. Notice to Proceed' },
                                        { key: 'biddersTechFinancialProposals', label: 'L. Bidders Technical and Financial Proposals' },
                                        { key: 'contractOfAgreement', label: 'B. Contract of Agreement' },
                                        { key: 'minutesPreBid', label: 'M. Minutes of Pre-Bid Conference' },
                                        { key: 'noticeOfAward', label: 'C. Notice of Award' },
                                        { key: 'biddingDocuments', label: 'N. Bidding Documents' },
                                        { key: 'bacResolutionAward', label: 'D. BAC Resolution to Award with Endorsement for the Administrator' },
                                        { key: 'inviteObservers', label: 'O.1. Letter Invitation to Observers' },
                                        { key: 'postQualReport', label: 'E. Post-Qualilification Evaluation Report on Technical Working Group' },
                                        { key: 'officialReceipt', label: 'O.2. Official Receipt' },
                                        { key: 'noticePostQual', label: 'F. Notice of Post-qualification' },
                                        { key: 'boardResolution', label: 'O.3. Board Resolution - Authority to Bid, to Act and approved by the Administrator II' },
                                        { key: 'bacResolutionPostQual', label: 'G. BAC Resolution to Post-qualify' },
                                        { key: 'philgepsAwardNotice', label: 'O.4. PhilGEPS Award Notice Abstract' },
                                        { key: 'abstractBidsEvaluated', label: 'H. Abstract of Bids as Evaluated' },
                                        { key: 'philgepsPosting', label: 'P.1. PhilGEPS Posting - Invitation to Bid' },
                                        { key: 'twgBidEvalReport', label: 'I. TWG Bid Evaluation Report' },
                                        { key: 'websitePosting', label: 'P.2. PHIVIDEC-IA Website Posting - Invitation to Bid' },
                                        { key: 'minutesBidOpening', label: 'J. Minutes of Bid Opening' },
                                        { key: 'postingCertificate', label: 'P.3. Posting Certificate' },
                                        { key: 'resultEligibilityCheck', label: 'K. Results of Eligibility Check/Screening' },
                                        { key: 'fundsAvailability', label: 'Q. Certificate of Funds Availability, Purchase Request, Project/Activity Brief, TOR & APP' },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-800/50">
                                            <Checkbox
                                                id={item.key}
                                                checked={checklist[item.key as keyof typeof checklist]}
                                                onCheckedChange={() => handleChecklistChange(item.key as keyof typeof checklist)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label
                                                htmlFor={item.key}
                                                className="text-sm font-medium leading-none text-slate-200 cursor-pointer"
                                            >
                                                {item.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Storage Location */}
                    <Card className="border-none bg-[#0f172a] shadow-lg">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                                        Shelf Storage
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

                            {storageMode === 'shelf' ? (
                                <div className="grid gap-4 md:grid-cols-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Shelf *</Label>
                                        <Select value={cabinetId} onValueChange={setCabinetId}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select shelf" />
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
                                        <Label className="text-slate-300">Cabinet *</Label>
                                        <Select value={shelfId} onValueChange={setShelfId} disabled={!cabinetId}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select cabinet" />
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

                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Folder *</Label>
                                        <Select value={folderId} onValueChange={setFolderId} disabled={!shelfId}>
                                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                                <SelectValue placeholder="Select folder" />
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
                                </div>
                            ) : (
                                <div className="animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Select Box *</Label>
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
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2 border-t border-slate-700 pt-4 mt-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Current Status</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val as ProcurementStatus)}>
                                        <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                            <SelectItem value="archived" className="text-white">Archived</SelectItem>
                                            <SelectItem value="active" className="text-white">Borrowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {!isSpecialType && (
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Progress Status</Label>
                                        <Select value={progressStatus} onValueChange={(val) => setProgressStatus(val as ProgressStatus)}>
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
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Record
                            </>
                        )}
                    </Button>
                </div>
            </form >
        </div >
    );
};

export default AddProcurement;
