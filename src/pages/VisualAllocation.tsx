import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Package, Folder as FolderIcon, FileText, ChevronRight, ArrowLeft, Archive, Grid, Inbox, ClipboardList, BookOpen, Gavel, ListChecks, ShieldCheck, ScrollText, FileCheck, Award, Send, Building2, BadgeCheck, PackageCheck } from 'lucide-react';
import { Cabinet, Shelf, Folder, Procurement, Box } from '@/types/procurement';
import { format } from 'date-fns';
import { CHECKLIST_ITEMS } from '@/lib/constants';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

// ─── Phase Definitions & Helpers (Copied from ProgressTracking) ────────────────

interface Phase {
    key: string;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    dateField: keyof Procurement;
}

const REGULAR_PHASES: Phase[] = [
    { key: 'receivedPrDate', label: 'Received PR', shortLabel: 'Recv PR', icon: Inbox, dateField: 'receivedPrDate' },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', shortLabel: 'PR Delib', icon: ClipboardList, dateField: 'prDeliberatedDate' },
    { key: 'publishedDate', label: 'Published', shortLabel: 'Published', icon: FileText, dateField: 'publishedDate' },
    { key: 'preBidDate', label: 'Pre-Bid', shortLabel: 'Pre-Bid', icon: BookOpen, dateField: 'preBidDate' },
    { key: 'bidOpeningDate', label: 'Bid Opening', shortLabel: 'Bid Open', icon: Gavel, dateField: 'bidOpeningDate' },
    { key: 'bidEvaluationDate', label: 'Bid Evaluation', shortLabel: 'Bid Eval', icon: ListChecks, dateField: 'bidEvaluationDate' },
    { key: 'postQualDate', label: 'Post-Qualification', shortLabel: 'Post-Qual', icon: ShieldCheck, dateField: 'postQualDate' },
    { key: 'postQualReportDate', label: 'Post-Qual Report', shortLabel: 'PQ Report', icon: ScrollText, dateField: 'postQualReportDate' },
    { key: 'bacResolutionDate', label: 'BAC Resolution', shortLabel: 'BAC Res', icon: FileCheck, dateField: 'bacResolutionDate' },
    { key: 'noaDate', label: 'NOA', shortLabel: 'NOA', icon: Award, dateField: 'noaDate' },
    { key: 'contractDate', label: 'Contract Date', shortLabel: 'Contract', icon: ScrollText, dateField: 'contractDate' },
    { key: 'ntpDate', label: 'NTP', shortLabel: 'NTP', icon: Send, dateField: 'ntpDate' },
    { key: 'forwardedOapiDate', label: 'Forwarded to OAPIA', shortLabel: 'To OAPIA', icon: Building2, dateField: 'forwardedOapiDate' },
    { key: 'awardedToDate', label: 'Awarded to Supplier', shortLabel: 'Awarded', icon: BadgeCheck, dateField: 'awardedToDate' },
];

const SVP_PHASES: Phase[] = [
    { key: 'receivedPrDate', label: 'Received PR', shortLabel: 'Recv PR', icon: Inbox, dateField: 'receivedPrDate' },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', shortLabel: 'PR Delib', icon: ClipboardList, dateField: 'prDeliberatedDate' },
    { key: 'publishedDate', label: 'Published', shortLabel: 'Published', icon: FileText, dateField: 'publishedDate' },
    { key: 'rfqCanvassDate', label: 'RFQ for Canvass', shortLabel: 'RFQ Canv', icon: BookOpen, dateField: 'rfqCanvassDate' },
    { key: 'rfqOpeningDate', label: 'RFQ Opening', shortLabel: 'RFQ Open', icon: Gavel, dateField: 'rfqOpeningDate' },
    { key: 'bacResolutionDate', label: 'BAC Resolution', shortLabel: 'BAC Res', icon: FileCheck, dateField: 'bacResolutionDate' },
    { key: 'forwardedGsdDate', label: 'Forwarded to GSD', shortLabel: 'To GSD', icon: PackageCheck, dateField: 'forwardedGsdDate' },
];

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

// Phase Pipeline Component
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
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-lg ${colors.circle} ${isCurrent ? 'scale-110' : 'scale-100'}`}
                            >
                                <Icon className={`h-4 w-4 ${colors.icon}`} strokeWidth={2} />
                            </div>

                            {/* Label */}
                            <div className={`mt-2 text-center transition-opacity flex flex-col items-center
                                ${completed || isCurrent ? 'opacity-100' : 'opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0'}
                            `}>
                                <span className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${completed ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {phase.shortLabel}
                                </span>
                                {dateVal && (
                                    <span className="text-[8px] font-mono text-slate-400 bg-slate-800/50 px-1 rounded">
                                        {format(new Date(dateVal), 'MMM d')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Connector Arrow */}
                        {i < phases.length - 1 && (
                            <div className="flex items-center flex-1 min-w-[20px] -mt-6 mx-0.5">
                                <div className={`h-0.5 w-full rounded-full transition-all duration-500 ${completed && !!procurement[phases[i + 1].dateField] ? colors.connector : 'bg-slate-700/50'}`} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const VisualAllocation: React.FC = () => {
    // Data Context
    // Shelves Array = Tier 1 (Real Shelves, Type Cabinet)
    // Cabinets Array = Tier 2 (Real Cabinets, Type Shelf) - Has cabinetId (Parent Shelf)
    // Folders Array = Tier 3 (Real Folders, Type Folder) - Has shelfId (Parent Cabinet)
    const { shelves: shelvesData, cabinets: cabinetsData, folders, procurements, boxes } = useData();

    // Cast data to correct Types based on "Swap" logic
    // Cast data to correct Types based on "Swap" logic and Sort Alphabetically
    // FIXED: shelvesData comes from 'shelves' node (Tier 2/Cabinets), cabinetsData comes from 'cabinets' node (Tier 1/Shelves)
    // We want 'shelves' var to be Tier 1 (Physical Shelves), so we use 'cabinetsData'
    // We want 'cabinets' var to be Tier 2 (Physical Cabinets), so we use 'shelvesData'
    const shelves = (cabinetsData as unknown as Cabinet[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const cabinets = (shelvesData as unknown as Shelf[]).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sortedBoxes = [...boxes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // View State
    const [viewMode, setViewMode] = useState<'shelves' | 'cabinets' | 'folders' | 'files' | 'boxes' | 'box_folders'>('shelves');
    const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
    const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<Procurement | null>(null);

    // Filter Logic
    // Shelf (S1) -> Cabinet (C1): Cabinet.cabinetId === Shelf.id
    // Cabinet (C1) -> Folder (F1): Folder.shelfId === Cabinet.id
    const getCabinetsForShelf = (shelfId: string) => cabinets.filter(c => c.cabinetId === shelfId);
    const getFoldersForCabinet = (cabinetId: string) => sortedFolders.filter(f => f.shelfId === cabinetId);
    // Box (B1) -> Folder (F1): Folder.boxId === Box.id
    const getFoldersForBox = (boxId: string) => sortedFolders.filter(f => f.boxId === boxId);

    const getFilesForFolder = (folderId: string) => procurements
        .filter(p => p.folderId === folderId)
        .sort((a, b) => {
            // Sort by Stack Number Descending (Highest on top/first)
            if (a.stackNumber && b.stackNumber) return b.stackNumber - a.stackNumber;
            // Files with stack numbers come before files without
            if (a.stackNumber) return -1;
            if (b.stackNumber) return 1;
            // Fallback to PR Number
            return (a.prNumber || '').localeCompare(b.prNumber || '', undefined, { numeric: true });
        });
    // Legacy support or direct files in box (optional, but hierarchy is Box->Folder->File now)
    const getFilesForBox = (boxId: string) => procurements.filter(p => p.boxId === boxId && !p.folderId).sort((a, b) => (a.prNumber || '').localeCompare(b.prNumber || '', undefined, { numeric: true }));

    // Helpers for Breadcrumbs
    const currentShelf = shelves.find(s => s.id === selectedShelfId);
    const currentCabinet = cabinets.find(c => c.id === selectedCabinetId);
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    const currentBox = boxes.find(b => b.id === selectedBoxId);

    // Handlers
    const handleSelectShelf = (shelfId: string) => {
        setSelectedShelfId(shelfId);
        setViewMode('cabinets');
    };

    const handleSelectCabinet = (cabinetId: string) => {
        setSelectedCabinetId(cabinetId);
        setViewMode('folders');
    };

    const handleSelectFolder = (folderId: string) => {
        setSelectedFolderId(folderId);
        setViewMode('files');
    };

    const handleSelectFile = (file: Procurement) => {
        setSelectedFile(file);
    };

    const handleSelectBox = (boxId: string) => {
        setSelectedBoxId(boxId);
        setViewMode('box_folders');
    };

    const goBack = () => {
        if (viewMode === 'files') {
            if (selectedBoxId) {
                setViewMode('box_folders');
                setSelectedFolderId(null);
            } else {
                setViewMode('folders');
                setSelectedFolderId(null);
            }
        } else if (viewMode === 'folders') {
            setViewMode('cabinets');
            setSelectedCabinetId(null);
        } else if (viewMode === 'cabinets') {
            setViewMode('shelves');
            setSelectedShelfId(null);
        } else if (viewMode === 'box_folders') {
            setViewMode('boxes');
            setSelectedBoxId(null);
        }
    };

    return (
        <div className="space-y-6 fade-in animate-in duration-500">
            {/* Header & Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 font-mono">
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('shelves'); setSelectedShelfId(null); setSelectedCabinetId(null); setSelectedFolderId(null); setSelectedBoxId(null); }}>
                    STORAGE
                </Button>
                {selectedShelfId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('cabinets'); setSelectedCabinetId(null); setSelectedFolderId(null); }}>
                            {currentShelf?.code}
                        </Button>
                    </>
                )}
                {selectedCabinetId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('folders'); setSelectedFolderId(null); }}>
                            {currentCabinet?.code}
                        </Button>
                    </>
                )}
                {selectedFolderId && !selectedBoxId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-white">{currentFolder?.code}</span>
                    </>
                )}
                {/* Box Breadcrumbs */}
                {(viewMode === 'boxes' || viewMode === 'box_folders' || (viewMode === 'files' && selectedBoxId)) && (
                    <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('boxes'); setSelectedBoxId(null); setSelectedShelfId(null); setSelectedCabinetId(null); setSelectedFolderId(null); }}>
                        BOX STORAGE
                    </Button>
                )}
                {selectedBoxId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('box_folders'); setSelectedFolderId(null); }}>
                            {currentBox?.code}
                        </Button>
                        {selectedFolderId && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-white">{currentFolder?.code}</span>
                            </>
                        )}
                    </>
                )}
                {/* Note: Files breadcrumb for Box mode handled by generic 'selectedFolderId' check above if we want, or we can explicit it here */}
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visual Allocation</h1>
                    <p className="text-slate-400">
                        {viewMode === 'shelves' && 'Select a Shelf to view its contents.'}
                        {viewMode === 'cabinets' && `Viewing Cabinets in Shelf ${currentShelf?.name}`}
                        {viewMode === 'folders' && `Viewing Folders in Cabinet ${currentCabinet?.name}`}
                        {viewMode === 'files' && `Viewing Files in Folder ${currentFolder?.name}`}
                        {viewMode === 'boxes' && 'Select a Box to view its contents.'}
                        {viewMode === 'box_folders' && `Viewing Folders in Box ${currentBox?.name}`}
                    </p>
                </div>

                {/* Visual Toggle between Shelf and Box Storage */}
                {!selectedShelfId && !selectedBoxId && (
                    <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                        <Button
                            variant={viewMode === 'shelves' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setViewMode('shelves'); setSelectedBoxId(null); }}
                            className={viewMode === 'shelves' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
                        >
                            <Grid className="h-4 w-4 mr-2" />
                            Shelf Storage
                        </Button>
                        <Button
                            variant={viewMode === 'boxes' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setViewMode('boxes'); setSelectedShelfId(null); setSelectedCabinetId(null); setSelectedFolderId(null); }}
                            className={viewMode === 'boxes' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
                        >
                            <Archive className="h-4 w-4 mr-2" />
                            Box Storage
                        </Button>
                    </div>
                )}

                {(viewMode !== 'shelves' && viewMode !== 'boxes') && (
                    <Button variant="outline" onClick={goBack} className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                        <ArrowLeft className="h-4 w-4" /> Up One Level
                    </Button>
                )}
            </div>

            <div className="bg-[#0f172a] p-8 rounded-xl border border-slate-800 min-h-[60vh] shadow-inner">

                {/* SHELVES VIEW (Racks) */}
                {viewMode === 'shelves' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in zoom-in-50 duration-300">
                        {shelves.map(shelf => (
                            <div
                                key={shelf.id}
                                onClick={() => handleSelectShelf(shelf.id)}
                                className="relative bg-[#1e293b] border-2 border-slate-700 rounded-lg p-0 cursor-pointer group hover:border-blue-500 transition-all hover:shadow-xl hover:shadow-blue-900/20"
                            >
                                {/* Rack Top */}
                                <div className="absolute top-0 left-0 right-0 h-3 bg-slate-600 rounded-t-md" />

                                {/* Rack Posts */}
                                <div className="absolute top-3 bottom-0 left-2 w-1 bg-slate-700" />
                                <div className="absolute top-3 bottom-0 right-2 w-1 bg-slate-700" />

                                <div className="h-48 flex flex-col p-6 pt-8 relative z-10">
                                    <div className="flex-1 flex flex-col justify-evenly opacity-30 group-hover:opacity-50 transition-opacity">
                                        <div className="h-1 bg-slate-500 w-full rounded-full" />
                                        <div className="h-1 bg-slate-500 w-full rounded-full" />
                                        <div className="h-1 bg-slate-500 w-full rounded-full" />
                                    </div>

                                    <div className="mt-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded border border-slate-600">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-white text-lg">{shelf.name}</span>
                                            <span className="text-xs font-mono bg-blue-600 px-1.5 py-0.5 rounded text-white">{shelf.code}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            {getCabinetsForShelf(shelf.id).length} Cabinets
                                        </div>
                                    </div>
                                </div>

                                {/* Rack Bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-600 rounded-b-md" />
                            </div>
                        ))}
                        {shelves.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <Layers className="h-16 w-16 mb-4 opacity-20" />
                                <p>No shelves found.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* CABINETS VIEW (Drawers) */}
                {viewMode === 'cabinets' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-50 duration-300">
                        {getCabinetsForShelf(selectedShelfId!).map(cabinet => (
                            <div
                                key={cabinet.id}
                                onClick={() => handleSelectCabinet(cabinet.id)}
                                className="bg-[#334155] border-t border-b-[6px] border-x border-slate-700 border-b-slate-900 rounded-md p-6 relative shadow-lg hover:bg-[#475569] transition-all cursor-pointer group"
                            >
                                {/* Metal Handle */}
                                <div className="w-1/3 h-3 bg-gradient-to-b from-slate-400 to-slate-600 mx-auto rounded-full mb-6 shadow-sm group-hover:scale-105 transition-transform" />

                                {/* Tag Slot */}
                                <div className="bg-white/10 border border-white/20 px-4 py-2 rounded text-center mb-4 mx-auto w-3/4 backdrop-blur-sm">
                                    <span className="text-white font-mono font-bold tracking-widest">{cabinet.code}</span>
                                </div>

                                <div className="text-center">
                                    <p className="text-slate-200 font-medium truncate">{cabinet.name}</p>
                                    <p className="text-xs text-slate-400 mt-1">{getFoldersForCabinet(cabinet.id).length} Folders</p>
                                </div>
                            </div>
                        ))}
                        {getCabinetsForShelf(selectedShelfId!).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <Package className="h-16 w-16 mb-4 opacity-20" />
                                <p>No cabinets in this shelf.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* FOLDERS VIEW (Tabs) */}
                {viewMode === 'folders' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in zoom-in-50 duration-300">
                        {getFoldersForCabinet(selectedCabinetId!).map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => handleSelectFolder(folder.id)}
                                className="group cursor-pointer relative mt-4"
                            >
                                {/* Folder Tab */}
                                <div
                                    className="absolute -top-3 left-0 w-24 h-5 rounded-t-lg shadow-sm group-hover:-mt-1 transition-all"
                                    style={{ backgroundColor: folder.color || '#fbbf24' }}
                                />
                                {/* Folder Body */}
                                <div
                                    className="bg-slate-800 border-t-4 p-4 rounded-b-lg rounded-tr-lg shadow-md h-32 flex flex-col justify-between hover:shadow-lg transition-all border-slate-700"
                                    style={{ borderTopColor: folder.color || '#fbbf24' }}
                                >
                                    <div>
                                        <h3 className="font-bold text-white truncate text-sm" title={folder.name}>{folder.name}</h3>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 rounded">{folder.code}</span>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <FolderIcon className="h-8 w-8 text-slate-700" />
                                        <span className="text-xs font-medium text-slate-300">{getFilesForFolder(folder.id).length} Files</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getFoldersForCabinet(selectedCabinetId!).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <FolderIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p>No folders in this cabinet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* FILES VIEW (Papers) */}
                {viewMode === 'files' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-50 duration-300">
                        {getFilesForFolder(selectedFolderId!).map(file => (
                            <div
                                key={file.id}
                                onClick={() => handleSelectFile(file)}
                                className="bg-[#1e293b] border border-slate-700 p-0 rounded-sm cursor-pointer hover:border-blue-400 hover:-translate-y-1 transition-all group shadow-sm"
                            >
                                <div className="h-2 bg-blue-500/20 w-full" />
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <FileText className="h-6 w-6 text-slate-500 group-hover:text-blue-400" />
                                        <div className={`w-2 h-2 rounded-full ${file.status === 'active' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    </div>
                                    <h4 className="text-blue-400 font-mono text-xs font-bold mb-1">{file.prNumber}</h4>
                                    <p className="text-slate-300 text-sm line-clamp-2 leading-tight h-10">{file.description}</p>

                                    <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                                        <span>{format(new Date(file.dateAdded), 'MMM d')}</span>
                                        {file.stackNumber && <span className="font-mono">↕{file.stackNumber}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getFilesForFolder(selectedFolderId!).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p>No files in this folder.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* BOXES VIEW (Grid) */}
                {viewMode === 'boxes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-50 duration-300">
                        {sortedBoxes.map(box => (
                            <div
                                key={box.id}
                                onClick={() => handleSelectBox(box.id)}
                                className="relative bg-[#0f172a] rounded-lg cursor-pointer group hover:-translate-y-1 transition-all duration-300"
                            >
                                {/* Box Lid (Top) */}
                                <div className="h-4 bg-[#1e293b] rounded-t-lg border-x border-t border-slate-600 relative overflow-hidden group-hover:bg-[#2e3b52] transition-colors">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1 bg-slate-700 rounded-full" />
                                </div>

                                {/* Box Body (Front) */}
                                <div className="bg-[#1e293b] p-6 rounded-b-lg border-x border-b border-slate-700 shadow-lg relative group-hover:border-blue-500/50 transition-colors">
                                    {/* Label Area */}
                                    <div className="absolute top-4 left-4 right-4 h-12 bg-slate-800/50 rounded border border-slate-700/50 flex items-center justify-between px-3">
                                        <div className="bg-blue-600 px-2 py-0.5 rounded textxs font-mono text-white font-bold shadow-sm">
                                            {box.code}
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {getFoldersForBox(box.id).length} Folders
                                        </span>
                                    </div>

                                    <div className="mt-12 pt-2">
                                        <h3 className="text-white font-bold text-lg mb-1 truncate">{box.name}</h3>
                                        <p className="text-slate-400 text-sm line-clamp-2 min-h-[2.5em] mb-2">{box.description}</p>

                                        {/* Folders List inside Box */}
                                        <div className="space-y-1 border-t border-slate-700/50 pt-2">
                                            {getFoldersForBox(box.id).slice(0, 3).map(f => (
                                                <div key={f.id} className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                                                    <span className="font-mono text-blue-400/70">{f.code}</span>
                                                    <span className="truncate">{f.name}</span>
                                                </div>
                                            ))}
                                            {getFoldersForBox(box.id).length > 3 && (
                                                <div className="text-[10px] text-slate-600 pl-3 italic">
                                                    + {getFoldersForBox(box.id).length - 3} more folders
                                                </div>
                                            )}
                                            {getFoldersForBox(box.id).length === 0 && (
                                                <div className="text-[10px] text-slate-600 italic">No folders</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="absolute bottom-3 right-3 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <Package className="h-8 w-8 text-blue-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {boxes.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <Archive className="h-16 w-16 mb-4 opacity-20" />
                                <p>No boxes found.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* BOX FOLDERS VIEW (Tabs) */}
                {viewMode === 'box_folders' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in zoom-in-50 duration-300">
                        {getFoldersForBox(selectedBoxId!).map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => handleSelectFolder(folder.id)}
                                className="group cursor-pointer relative mt-4"
                            >
                                {/* Folder Tab */}
                                <div
                                    className="absolute -top-3 left-0 w-24 h-5 rounded-t-lg shadow-sm group-hover:-mt-1 transition-all"
                                    style={{ backgroundColor: folder.color || '#fbbf24' }}
                                />
                                {/* Folder Body */}
                                <div
                                    className="bg-slate-800 border-t-4 p-4 rounded-b-lg rounded-tr-lg shadow-md h-32 flex flex-col justify-between hover:shadow-lg transition-all border-slate-700"
                                    style={{ borderTopColor: folder.color || '#fbbf24' }}
                                >
                                    <div>
                                        <h3 className="font-bold text-white truncate text-sm" title={folder.name}>{folder.name}</h3>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 rounded">{folder.code}</span>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <FolderIcon className="h-8 w-8 text-slate-700" />
                                        <span className="text-xs font-medium text-slate-300">{getFilesForFolder(folder.id).length} Files</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getFoldersForBox(selectedBoxId!).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <FolderIcon className="h-16 w-16 mb-4 opacity-20" />
                                <p>No folders in this box.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* File Details Modal */}
            <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="h-6 w-6 text-blue-500" />
                            {selectedFile?.prNumber}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            File Details
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFile && (
                        <div className="space-y-6 py-4 animate-in slide-in-from-bottom-5 fade-in duration-300 max-h-[70vh] overflow-y-auto pr-2">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-xs font-medium text-slate-500 mb-1 uppercase">Status</h3>
                                    <p className={`font-medium ${selectedFile.status === 'active' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {selectedFile.status === 'active' ? 'Borrowed' : 'Available'}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-xs font-medium text-slate-500 mb-1 uppercase">Progress</h3>
                                    <p className={`font-medium ${selectedFile.procurementStatus === 'Completed' ? 'text-emerald-400' :
                                        (selectedFile.procurementStatus === 'Failure' || selectedFile.procurementStatus === 'Cancelled') ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                        {selectedFile.procurementStatus || 'Not yet Acted'}
                                    </p>
                                </div>
                                <div className="col-span-2 p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-xs font-medium text-slate-500 mb-2 uppercase">Procurement Progress</h3>
                                    <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
                                        <PhasePipeline procurement={selectedFile} />
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-xs font-medium text-slate-500 mb-1 uppercase">Division</h3>
                                    <p className="text-white">{selectedFile.division || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-xs font-medium text-slate-500 mb-1 uppercase">Stack Number</h3>
                                    <p className="text-white font-mono text-lg font-bold">
                                        {selectedFile.status === 'archived' && selectedFile.stackNumber
                                            ? `#${selectedFile.stackNumber}`
                                            : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                        <Grid className="h-4 w-4 text-blue-500" />
                                        Project Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="col-span-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Project Title</span>
                                            <span className="text-sm text-white font-medium">{selectedFile.projectName || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Procurement Type</span>
                                            <span className="text-sm text-white font-medium bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{selectedFile.procurementType || 'N/A'}</span>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Supplier Name</span>
                                            <span className="text-sm text-white font-medium">{selectedFile.supplier || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">ABC</span>
                                            <span className="text-sm text-emerald-400 font-mono font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">
                                                {selectedFile.abc ? `₱${selectedFile.abc.toLocaleString()}` : 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Bid Amount</span>
                                            <span className="text-sm text-amber-400 font-mono font-bold bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">
                                                {selectedFile.bidAmount ? `₱${selectedFile.bidAmount.toLocaleString()}` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-[10px] uppercase font-bold text-slate-500 mt-4 mb-2 border-t border-slate-800 pt-3">Description</h3>
                                    <p className="text-white text-sm leading-relaxed">{selectedFile.description}</p>
                                </div>

                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                                    <h3 className="text-sm font-medium text-slate-500 mb-2">Location Path</h3>
                                    {selectedFile.boxId ? (
                                        <div className="flex items-center gap-2 text-sm text-white">
                                            <Package className="h-4 w-4 text-blue-400" />
                                            <span>Box: {boxes.find(b => b.id === selectedFile.boxId)?.name || 'Unknown Box'}</span>
                                            <span className="text-slate-500 font-mono text-xs">({boxes.find(b => b.id === selectedFile.boxId)?.code})</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <span>{currentShelf?.name}</span>
                                            <ChevronRight className="h-3 w-3" />
                                            <span>{currentCabinet?.name}</span>
                                            <ChevronRight className="h-3 w-3" />
                                            <span>{currentFolder?.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Borrow Info */}
                            {selectedFile.status === 'active' && (
                                <div className="p-4 bg-orange-950/20 rounded-lg border border-orange-500/20">
                                    <h3 className="text-sm font-medium text-orange-400 mb-2">Borrower Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-xs text-white">
                                        <div>
                                            <span className="text-slate-500 block">Borrower:</span>
                                            {selectedFile.borrowedBy || 'N/A'}
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Date Borrowed:</span>
                                            {selectedFile.borrowedDate ? format(new Date(selectedFile.borrowedDate), 'MMM d, yyyy') : 'N/A'}
                                        </div>
                                        {selectedFile.returnDate && (
                                            <div>
                                                <span className="text-slate-500 block">Return Date:</span>
                                                {format(new Date(selectedFile.returnDate), 'MMM d, yyyy')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Checklist Summary */}
                            {selectedFile.checklist && Object.keys(selectedFile.checklist).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Documents</h3>
                                    <div className="grid grid-cols-1 gap-1 text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 max-h-[150px] overflow-y-auto">
                                        {CHECKLIST_ITEMS.map((item) => {
                                            if (selectedFile.checklist?.[item.key as keyof typeof selectedFile.checklist]) {
                                                return (
                                                    <div key={item.key} className="flex items-center gap-2">
                                                        <span className="text-blue-500">✓</span>
                                                        <span>{item.label}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Footer */}
                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
                                <div>
                                    <span className="block font-semibold mb-1">Created By</span>
                                    <span>{selectedFile.createdByName || 'Unknown'}</span>
                                </div>
                                <div>
                                    <span className="block font-semibold mb-1">Stack Number</span>
                                    <span className="font-mono">{selectedFile.stackNumber ? `#${selectedFile.stackNumber}` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default VisualAllocation;
