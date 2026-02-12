import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Package, Folder as FolderIcon, FileText, ChevronRight, ArrowLeft, Archive, Grid } from 'lucide-react';
import { Cabinet, Shelf, Folder, Procurement, Box } from '@/types/procurement';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

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
    const [viewMode, setViewMode] = useState<'shelves' | 'cabinets' | 'folders' | 'files' | 'boxes' | 'box_files'>('shelves');
    const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
    const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<Procurement | null>(null);

    // Filter Logic
    // Shelf (S1) -> Cabinet (C1): Cabinet.cabinetId === Shelf.id
    // Cabinet (C1) -> Folder (F1): Folder.shelfId === Cabinet.id
    const getCabinetsForShelf = (shelfId: string) => cabinets.filter(c => c.cabinetId === shelfId); // FIXED: field is cabinetId
    const getFoldersForCabinet = (cabinetId: string) => sortedFolders.filter(f => f.shelfId === cabinetId);
    const getFilesForFolder = (folderId: string) => procurements.filter(p => p.folderId === folderId).sort((a, b) => (a.prNumber || '').localeCompare(b.prNumber || '', undefined, { numeric: true }));
    const getFilesForBox = (boxId: string) => procurements.filter(p => p.boxId === boxId).sort((a, b) => (a.prNumber || '').localeCompare(b.prNumber || '', undefined, { numeric: true }));

    // Helpers for Breadcrumbs
    const currentShelf = shelves.find(s => s.id === selectedShelfId);
    const currentCabinet = cabinets.find(c => c.id === selectedCabinetId);
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    const currentBox = boxes.find(b => b.id === selectedBoxId);

    // Box Helpers


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
        setViewMode('box_files');
    };

    const goBack = () => {
        if (viewMode === 'files') {
            setViewMode('folders');
            setSelectedFolderId(null);
        } else if (viewMode === 'folders') {
            setViewMode('cabinets');
            setSelectedCabinetId(null);
        } else if (viewMode === 'cabinets') {
            setViewMode('shelves');
            setSelectedShelfId(null);
        } else if (viewMode === 'box_files') {
            setViewMode('boxes');
            setSelectedBoxId(null);
        }
    };

    return (
        <div className="space-y-6 fade-in animate-in duration-500">
            {/* Header & Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 font-mono">
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('shelves'); setSelectedShelfId(null); setSelectedCabinetId(null); setSelectedFolderId(null); }}>
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
                {selectedFolderId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-white">{currentFolder?.code}</span>
                    </>
                )}
                {/* Box Breadcrumbs */}
                {(viewMode === 'boxes' || viewMode === 'box_files') && (
                    <Button variant="ghost" className="p-0 h-auto hover:bg-transparent hover:text-white" onClick={() => { setViewMode('boxes'); setSelectedBoxId(null); }}>
                        BOX STORAGE
                    </Button>
                )}
                {selectedBoxId && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-white">{currentBox?.code}</span>
                    </>
                )}
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
                        {viewMode === 'box_files' && `Viewing Files in Box ${currentBox?.name}`}
                    </p>
                </div>

                {/* Visual Toggle between Shelf and Box Storage */}
                {!selectedShelfId && !selectedBoxId && (
                    <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                        <Button
                            variant={viewMode === 'shelves' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('shelves')}
                            className={viewMode === 'shelves' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400 hover:text-white'}
                        >
                            <Grid className="h-4 w-4 mr-2" />
                            Shelf Storage
                        </Button>
                        <Button
                            variant={viewMode === 'boxes' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('boxes')}
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
                                            {getFilesForBox(box.id).length} Files
                                        </span>
                                    </div>

                                    <div className="mt-12 pt-2">
                                        <h3 className="text-white font-bold text-lg mb-1 truncate">{box.name}</h3>
                                        <p className="text-slate-400 text-sm line-clamp-2 min-h-[2.5em]">{box.description}</p>
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

                {/* BOX FILES VIEW */}
                {viewMode === 'box_files' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in zoom-in-50 duration-300">
                        {getFilesForBox(selectedBoxId!).map(file => (
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
                                        <span className="font-mono">{file.division || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {getFilesForBox(selectedBoxId!).length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                <p>No files in this box.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* File Details Modal */}
            <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white max-w-lg">
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
                                    <p className={`font-medium ${selectedFile.progressStatus === 'Success' ? 'text-emerald-400' :
                                        selectedFile.progressStatus === 'Failed' ? 'text-red-400' :
                                            'text-yellow-400'
                                        }`}>
                                        {selectedFile.progressStatus || 'Pending'}
                                    </p>
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
                                    <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
                                    <p className="text-white leading-relaxed">{selectedFile.description}</p>
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
                                        {[
                                            { key: 'noticeToProceed', label: 'A. Notice to Proceed' },
                                            { key: 'contractOfAgreement', label: 'B. Contract of Agreement' },
                                            { key: 'noticeOfAward', label: 'C. Notice of Award' },
                                            { key: 'bacResolutionAward', label: 'D. BAC Resolution to Award' },
                                            { key: 'postQualReport', label: 'E. Post-Qual Report' },
                                            { key: 'noticePostQual', label: 'F. Notice of Post-qualification' },
                                            { key: 'bacResolutionPostQual', label: 'G. BAC Resolution to Post-qualify' },
                                            { key: 'abstractBidsEvaluated', label: 'H. Abstract of Bids as Evaluated' },
                                            { key: 'twgBidEvalReport', label: 'I. TWG Bid Evaluation Report' },
                                            { key: 'minutesBidOpening', label: 'J. Minutes of Bid Opening' },
                                            { key: 'resultEligibilityCheck', label: 'K. Eligibility Check Results' },
                                            { key: 'biddersTechFinancialProposals', label: 'L. Bidders Technical and Financial Proposals' },
                                            { key: 'minutesPreBid', label: 'M. Minutes of Pre-Bid Conference' },
                                            { key: 'biddingDocuments', label: 'N. Bidding Documents' },
                                            { key: 'inviteObservers', label: 'O.1. Letter Invitation to Observers' },
                                            { key: 'officialReceipt', label: 'O.2. Official Receipt' },
                                            { key: 'boardResolution', label: 'O.3. Board Resolution' },
                                            { key: 'philgepsAwardNotice', label: 'O.4. PhilGEPS Award Notice Abstract' },
                                            { key: 'philgepsPosting', label: 'P.1. PhilGEPS Posting' },
                                            { key: 'websitePosting', label: 'P.2. Website Posting' },
                                            { key: 'postingCertificate', label: 'P.3. Posting Certificate' },
                                            { key: 'fundsAvailability', label: 'Q. CAF, PR, TOR & APP' },
                                        ].map((item) => {
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
