import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Procurement } from '@/types/procurement';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    Gavel,
    Send,
    FileCheck,
    Award,
    ScrollText,
    ShieldCheck,
    BookOpen,
    ListChecks,
    PackageCheck,
    Inbox,
    Building2,
    BadgeCheck,
    Check
} from 'lucide-react';
import { format } from 'date-fns';
import { CHECKLIST_ITEMS } from '@/lib/constants';

// ─── Checklist Items (from AddProcurement) ────────────────────────────────────

const checklistItems = CHECKLIST_ITEMS;

// ─── Phase Definitions ────────────────────────────────────────────────────────

interface Phase {
    key: string;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    dateField: keyof Procurement;
}

const REGULAR_PHASES: Phase[] = [
    { key: 'receivedPrDate', label: 'Received PR to Action', shortLabel: 'Recv PR', icon: Inbox, dateField: 'receivedPrDate' },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', shortLabel: 'PR Delib', icon: ClipboardList, dateField: 'prDeliberatedDate' },
    { key: 'publishedDate', label: 'Published', shortLabel: 'Published', icon: FileText, dateField: 'publishedDate' },
    { key: 'preBidDate', label: 'Pre-Bid', shortLabel: 'Pre-Bid', icon: BookOpen, dateField: 'preBidDate' },
    { key: 'bidOpeningDate', label: 'Bid Opening', shortLabel: 'Bid Open', icon: Gavel, dateField: 'bidOpeningDate' },
    { key: 'bidEvaluationDate', label: 'Bid Evaluation Report', shortLabel: 'Bid Eval', icon: ListChecks, dateField: 'bidEvaluationDate' },
    { key: 'bacResolutionDate', label: 'BAC Resolution', shortLabel: 'BAC Res', icon: FileCheck, dateField: 'bacResolutionDate' },
    { key: 'postQualDate', label: 'Post Qualification', shortLabel: 'Post-Qual', icon: ShieldCheck, dateField: 'postQualDate' },
    { key: 'postQualReportDate', label: 'Post Qualification Report', shortLabel: 'PQ Report', icon: ScrollText, dateField: 'postQualReportDate' },
    { key: 'forwardedOapiDate', label: 'Forwarded to OAPIA', shortLabel: 'To OAPIA', icon: Building2, dateField: 'forwardedOapiDate' },
    { key: 'noaDate', label: 'Notice of Award', shortLabel: 'NOA', icon: Award, dateField: 'noaDate' },
    { key: 'contractDate', label: 'Contract Date', shortLabel: 'Contract', icon: ScrollText, dateField: 'contractDate' },
    { key: 'ntpDate', label: 'Notice to Proceed', shortLabel: 'NTP', icon: Send, dateField: 'ntpDate' },
    { key: 'awardedToDate', label: 'Awarded to Supplier', shortLabel: 'Awarded', icon: BadgeCheck, dateField: 'awardedToDate' },
];

const SVP_PHASES: Phase[] = [
    { key: 'receivedPrDate', label: 'Received PR to Action', shortLabel: 'Recv PR', icon: Inbox, dateField: 'receivedPrDate' },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', shortLabel: 'PR Delib', icon: ClipboardList, dateField: 'prDeliberatedDate' },
    { key: 'publishedDate', label: 'Published', shortLabel: 'Published', icon: FileText, dateField: 'publishedDate' },
    { key: 'rfqCanvassDate', label: 'RFQ to Canvass', shortLabel: 'RFQ Canv', icon: BookOpen, dateField: 'rfqCanvassDate' },
    { key: 'rfqOpeningDate', label: 'RFQ Opening', shortLabel: 'RFQ Open', icon: Gavel, dateField: 'rfqOpeningDate' },
    { key: 'bacResolutionDate', label: 'BAC Resolution', shortLabel: 'BAC Res', icon: FileCheck, dateField: 'bacResolutionDate' },
    { key: 'forwardedGsdDate', label: 'Forwarded to GSD for P.O', shortLabel: 'To GSD', icon: PackageCheck, dateField: 'forwardedGsdDate' },
];

// ─── Status Color Helpers ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    'Completed': { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'In Progress': { bg: 'bg-yellow-400/10', border: 'border-yellow-400/40', text: 'text-yellow-400', badge: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' },
    'Returned PR to EU': { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'Failure': { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
    'Cancelled': { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    'Not yet Acted': { bg: 'bg-slate-500/10', border: 'border-slate-500/40', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// Phase circle color based on completion
const getPhaseColor = (completed: boolean, isCurrent: boolean, status: string) => {
    if (!completed) return { circle: 'bg-slate-800 border-slate-700', icon: 'text-slate-600', connector: 'bg-slate-700' };

    // Use pure colors for active phases
    if (status === 'Completed') {
        return { circle: 'bg-green-500/20 border-green-500', icon: 'text-green-400', connector: 'bg-green-500/60' };
    }
    if (status === 'In Progress') {
        return {
            circle: isCurrent
                ? 'bg-yellow-400/30 border-yellow-400 ring-4 ring-yellow-400/20'
                : 'bg-yellow-400/15 border-yellow-400/60',
            icon: isCurrent ? 'text-yellow-300' : 'text-yellow-400',
            connector: 'bg-yellow-400/50'
        };
    }
    if (status === 'Returned PR to EU') {
        return { circle: 'bg-purple-500/20 border-purple-500', icon: 'text-purple-400', connector: 'bg-purple-500/50' };
    }
    if (status === 'Failure') {
        return { circle: 'bg-red-500/20 border-red-500', icon: 'text-red-400', connector: 'bg-red-500/50' };
    }
    if (status === 'Cancelled') {
        return { circle: 'bg-orange-500/20 border-orange-500', icon: 'text-orange-400', connector: 'bg-orange-500/50' };
    }
    return { circle: 'bg-blue-500/20 border-blue-500', icon: 'text-blue-400', connector: 'bg-blue-500/50' };
};

const getCurrentPhaseIndex = (p: Procurement, phases: Phase[]): number => {
    let lastCompleted = -1;
    phases.forEach((phase, i) => {
        if (p[phase.dateField]) lastCompleted = i;
    });
    return lastCompleted;
};

// ─── Checklist Dialog (Attached Documents) ────────────────────────────────────

const ChecklistDialog = ({ procurement, open, onClose }: { procurement: Procurement | null; open: boolean; onClose: () => void }) => {
    if (!procurement) return null;

    // Use default checklist items
    const allItems = checklistItems;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#0f172a] border-slate-800 text-white max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-blue-400" />
                        Attached Documents — {procurement.prNumber}
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allItems.map((item) => {
                        const isAttached = procurement.checklist && procurement.checklist[item.key] === true;
                        return (
                            <div
                                key={item.key}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isAttached
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : 'bg-slate-800/30 border-slate-800 opacity-60'
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isAttached ? 'bg-green-500/20' : 'bg-slate-700'
                                    }`}>
                                    {isAttached ? (
                                        <Check className="h-3.5 w-3.5 text-green-400" />
                                    ) : (
                                        <div className="h-2 w-2 rounded-full bg-slate-500" />
                                    )}
                                </div>
                                <span className={`text-sm font-medium ${isAttached ? 'text-white' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ─── Phase Pipeline Component (Bigger & Readable) ─────────────────────────────

const PhasePipeline = ({ procurement }: { procurement: Procurement }) => {
    const phases = procurement.procurementType === 'SVP' ? SVP_PHASES : REGULAR_PHASES;
    const currentIdx = getCurrentPhaseIndex(procurement, phases);
    const effectiveStatus = procurement.procurementStatus || 'Not yet Acted';

    return (
        <div className="flex items-center gap-0 w-full overflow-x-auto min-w-0 py-4 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {phases.map((phase, i) => {
                const completed = !!procurement[phase.dateField];
                const isCurrent = i === currentIdx;
                const colors = getPhaseColor(completed, isCurrent, effectiveStatus);
                const Icon = phase.icon;
                const dateVal = procurement[phase.dateField] as string | undefined;

                return (
                    <React.Fragment key={phase.key}>
                        {/* Phase Circle */}
                        <div className="flex flex-col items-center flex-shrink-0 group relative px-1">
                            <div
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-lg ${colors.circle} ${isCurrent ? 'scale-110' : 'scale-100'}`}
                            >
                                <Icon className={`h-6 w-6 ${colors.icon}`} strokeWidth={2} />
                            </div>

                            {/* Label always visible if current or completed, otherwise on hover */}
                            <div className={`mt-3 text-center transition-opacity flex flex-col items-center
                                ${completed || isCurrent ? 'opacity-100' : 'opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0'}
                            `}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${completed ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {phase.shortLabel}
                                </span>
                                {dateVal && (
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/50 px-1 rounded">
                                        {format(new Date(dateVal), 'MMM d')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Connector Arrow */}
                        {i < phases.length - 1 && (
                            <div className="flex items-center flex-1 min-w-[30px] -mt-8 mx-1">
                                <div className={`h-1 w-full rounded-full transition-all duration-500 ${completed && !!procurement[phases[i + 1].dateField] ? colors.connector : 'bg-slate-700/50'}`} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ─── Procurement Card ─────────────────────────────────────────────────────────

const ProcurementCard = ({ procurement, onViewChecklist, onViewRecord }: { procurement: Procurement; onViewChecklist: (p: Procurement) => void; onViewRecord: (prNumber: string) => void }) => {
    const phases = procurement.procurementType === 'SVP' ? SVP_PHASES : REGULAR_PHASES;
    const currentIdx = getCurrentPhaseIndex(procurement, phases);
    const currentPhaseName = currentIdx >= 0 ? phases[currentIdx].label : 'Not yet Acted';
    const effectiveStatus = procurement.procurementStatus || 'Not yet Acted';
    const colors = STATUS_COLORS[effectiveStatus] || STATUS_COLORS['Not yet Acted'];

    const completedCount = phases.filter(ph => !!procurement[ph.dateField]).length;
    const progressPct = Math.round((completedCount / phases.length) * 100);

    return (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all hover:shadow-xl hover:shadow-black/30 group`}>
            {/* Header Info */}
            <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white font-mono tracking-tight">{procurement.prNumber}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors.badge}`}>
                            {effectiveStatus}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {procurement.division || 'No End User'}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {procurement.procurementType}
                        </span>
                        <span className="flex items-center gap-1.5 max-w-[300px] truncate" title={procurement.projectName}>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {procurement.projectName || 'No Project Title'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Current Phase</p>
                        <p className={`text-sm font-bold ${colors.text}`}>{currentPhaseName}</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewChecklist(procurement)}
                        className="h-9 border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Attached Documents
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRecord(procurement.prNumber)}
                        className="h-9 border-slate-700 bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 hover:text-white transition-colors"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        View Record
                    </Button>
                </div>
            </div>

            {/* Pipeline Visualization */}
            <div className="bg-[#0f172a]/50 rounded-xl p-4 border border-white/5 relative overflow-hidden">
                <PhasePipeline procurement={procurement} />

                {/* Progress Stats Overlay */}
                <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-500">
                    Progress: {Math.round(progressPct)}%
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

const ProgressTracking: React.FC = () => {
    const { procurements } = useData();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [divisionFilter, setDivisionFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [goToPage, setGoToPage] = useState('');
    const [checklistProcurement, setChecklistProcurement] = useState<Procurement | null>(null);

    // Initialize search from URL params
    useEffect(() => {
        const query = searchParams.get('search');
        if (query) {
            setSearch(query);
        }
    }, [searchParams]);

    // Get unique divisions
    const divisions = useMemo(() => {
        const divSet = new Set<string>();
        procurements.forEach(p => { if (p.division) divSet.add(p.division); });
        return Array.from(divSet).sort();
    }, [procurements]);

    // Filter
    const filtered = useMemo(() => {
        return procurements.filter(p => {
            if (typeFilter !== 'all' && p.procurementType !== typeFilter) return false;
            if (divisionFilter !== 'all' && p.division !== divisionFilter) return false;
            if (statusFilter !== 'all' && (p.procurementStatus || 'Not yet Acted') !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (
                    !p.prNumber?.toLowerCase().includes(q) &&
                    !p.projectName?.toLowerCase().includes(q) &&
                    !p.division?.toLowerCase().includes(q)
                ) return false;
            }
            return true;
        });
    }, [procurements, search, typeFilter, divisionFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const handleGoTo = () => {
        const n = parseInt(goToPage);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            setPage(n);
            setGoToPage('');
        }
    };

    return (
        <div className="space-y-6 fade-in animate-in duration-500 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Progress Tracking</h1>
                <p className="text-slate-400 mt-1">Visual pipeline of procurement phases for each record</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 bg-[#0f172a] rounded-xl border border-slate-800 sticky top-0 z-30 shadow-xl shadow-black/20 backdrop-blur-sm bg-opacity-90">
                {/* Search */}
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search PR Number, Title, Division..."
                        className="pl-9 bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            <span className="sr-only">Clear</span>
                            ×
                        </button>
                    )}
                </div>

                {/* Procurement Type */}
                <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px] bg-[#1e293b] border-slate-700 text-white">
                        <SelectValue placeholder="Procurement Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="SVP">Small Value Procurement</SelectItem>
                        <SelectItem value="Regular Bidding">Regular Bidding</SelectItem>
                    </SelectContent>
                </Select>

                {/* End User */}
                <Select value={divisionFilter} onValueChange={v => { setDivisionFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-[#1e293b] border-slate-700 text-white">
                        <SelectValue placeholder="End User" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white max-h-[200px]">
                        <SelectItem value="all">All Divisions</SelectItem>
                        {divisions.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Progress Status */}
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-[#1e293b] border-slate-700 text-white">
                        <SelectValue placeholder="Progress Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Returned PR to EU">Returned PR to EU</SelectItem>
                        <SelectItem value="Not yet Acted">Not yet Acted</SelectItem>
                        <SelectItem value="Failure">Failure</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Cards */}
            <div className="space-y-4">
                {paginated.length === 0 ? (
                    <div className="text-center py-24 text-slate-500 bg-[#0f172a]/50 rounded-xl border border-slate-800 border-dashed">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-medium text-slate-400">No records found</p>
                        <p className="text-sm mt-2 text-slate-600">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    paginated.map(p => (
                        <ProcurementCard
                            key={p.id}
                            procurement={p}
                            onViewChecklist={setChecklistProcurement}
                            onViewRecord={(prNum) => navigate(`/procurement/list?search=${encodeURIComponent(prNum)}`)}
                        />
                    ))
                )}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <p className="text-sm text-slate-500">
                        Showing <span className="text-white font-medium">{Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="text-white font-medium">{filtered.length}</span> Records
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Go to</span>
                        <Input
                            value={goToPage}
                            onChange={e => setGoToPage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGoTo()}
                            placeholder="#"
                            className="w-14 h-9 text-center bg-[#1e293b] border-slate-700 text-white text-sm"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="h-9 border-slate-700 bg-[#1e293b] text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <span className="text-sm text-slate-400 px-2 font-mono">{safePage} / {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="h-9 border-slate-700 bg-[#1e293b] text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Checklist Dialog */}
            <ChecklistDialog
                procurement={checklistProcurement}
                open={!!checklistProcurement}
                onClose={() => setChecklistProcurement(null)}
            />
        </div>
    );
};

export default ProgressTracking;
