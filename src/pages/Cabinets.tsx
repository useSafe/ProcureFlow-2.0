import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { addShelf, updateShelf, deleteShelf } from '@/lib/storage'; // Maps to Cabinets Node
import { Shelf, Cabinet, Folder, Procurement } from '@/types/procurement';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderPlus, Eye, Package } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const Cabinets: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const shelfIdFromUrl = searchParams.get('shelfId'); // Actually Shelf ID (Parent)

    // DataContext
    // shelves = Tier 1 (S1)
    // cabinets = Tier 2 (C1)
    const { shelves, cabinets, folders, procurements } = useData();

    // UI State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentCabinet, setCurrentCabinet] = useState<Shelf | null>(null); // Type Shelf because it comes from 'shelves' node (Swapped)

    // Filter
    const [filterShelfId, setFilterShelfId] = useState<string>(shelfIdFromUrl || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'name' | 'code' | 'contents'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [parentShelfId, setParentShelfId] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (shelfIdFromUrl) {
            setFilterShelfId(shelfIdFromUrl);
        }
    }, [shelfIdFromUrl]);

    const resetForm = () => {
        setName('');
        setCode('');
        setParentShelfId('');
        setDescription('');
        setCurrentCabinet(null);
    };

    const handleAdd = async () => {
        if (!name || !code || !parentShelfId) {
            toast.error('Name, Code, and Parent Shelf are required');
            return;
        }

        try {
            // Function name is 'addShelf', but it writes to 'shelves' node which holds Cabinets (C1)
            await addShelf(parentShelfId, name, code, description);
            setIsAddDialogOpen(false);
            resetForm();
            toast.success('Cabinet added successfully');
        } catch (error) {
            toast.error('Failed to add cabinet');
        }
    };

    const handleEditClick = (cabinet: Shelf) => {
        setCurrentCabinet(cabinet);
        setName(cabinet.name);
        setCode(cabinet.code);
        setParentShelfId(cabinet.cabinetId); // shelf.cabinetId points to Parent Shelf ID
        setDescription(cabinet.description || '');
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentCabinet || !name || !code || !parentShelfId) return;

        try {
            await updateShelf(currentCabinet.id, { cabinetId: parentShelfId, name, code, description });
            setIsEditDialogOpen(false);
            resetForm();
            toast.success('Cabinet updated successfully');
        } catch (error) {
            toast.error('Failed to update cabinet');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteShelf(id);
            toast.success('Cabinet deleted successfully');
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            }
        } catch (error) {
            toast.error('Failed to delete cabinet');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        // Validation: Check if any selected cabinet has contents
        const cabinetsWithContents = selectedIds.filter(id => {
            const stats = getCabinetStats(id);
            return stats.folders > 0 || stats.files > 0;
        });

        if (cabinetsWithContents.length > 0) {
            toast.error(`Cannot delete ${cabinetsWithContents.length} cabinets because they contain items. Please empty them first.`);
            return;
        }

        try {
            await Promise.all(selectedIds.map(id => deleteShelf(id)));
            toast.success(`${selectedIds.length} cabinets deleted successfully`);
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete some cabinets');
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = filteredCabinets.map(c => c.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = filteredCabinets.map(c => c.id);
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

    const handleViewFolders = (cabinetId: string) => {
        navigate(`/folders?cabinetId=${cabinetId}`);
    };

    const getParentShelfName = (cabinetId: string): string => {
        // cabinetId here is actually the ID of the Parent Shelf (Tier 1)
        // Tier 1 is DB Cabinets
        const parentShelf = cabinets.find(s => s.id === cabinetId);
        return parentShelf ? `${parentShelf.name} (${parentShelf.code})` : 'Unknown';
    };

    // Deep Counts (Cabinet Stats)
    const getCabinetStats = (cabinetId: string) => {
        // Cabinet (C1) ID = cabinetId

        // Find Folders in this Cabinet
        // Folder.shelfId -> Cabinet ID
        const myFolders = folders.filter(f => f.shelfId === cabinetId);
        const myFolderIds = myFolders.map(f => f.id);

        // Find Files in these Folders
        const myFiles = procurements.filter(p => myFolderIds.includes(p.folderId));

        return {
            folders: myFolders.length,
            files: myFiles.length
        };
    };

    // Filtering and Sorting
    // UI "Cabinets" are DB "Shelves"
    const filteredCabinets = shelves
        .filter(cabinet => {
            // Filter by parent shelf (dropdown)
            // cabinet.cabinetId -> Parent Shelf ID
            if (filterShelfId && filterShelfId !== 'all' && cabinet.cabinetId !== filterShelfId) {
                return false;
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    cabinet.name.toLowerCase().includes(query) ||
                    cabinet.code.toLowerCase().includes(query) ||
                    (cabinet.description && cabinet.description.toLowerCase().includes(query))
                );
            }
            return true;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'code') {
                const getCodeNum = (str: string) => {
                    const match = str.match(/\d+/);
                    return match ? parseInt(match[0]) : 0;
                };
                const aNum = getCodeNum(a.code);
                const bNum = getCodeNum(b.code);
                comparison = aNum === bNum ? a.code.localeCompare(b.code) : aNum - bNum;
            } else if (sortField === 'contents') {
                comparison = getCabinetStats(a.id).folders - getCabinetStats(b.id).folders;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Cabinets</h1>
                    <p className="text-slate-400 mt-1">Manage cabinets within drawers (Tier 2)</p>
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
                                    <AlertDialogTitle>Delete {selectedIds.length} Cabinets?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        This action cannot be undone. This will permanently delete the selected cabinets.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" /> Add Cabinet
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Add New Cabinet</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Create a new cabinet inside a drawer.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right text-slate-300">Parent Drawer</Label>
                                    <select
                                        value={parentShelfId}
                                        onChange={(e) => setParentShelfId(e.target.value)}
                                        className="col-span-3 bg-[#1e293b] border-slate-700 text-white rounded-md p-2"
                                    >
                                        <option value="">Select Drawer</option>
                                        {cabinets.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right text-slate-300">Name</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right text-slate-300">Code</Label>
                                    <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="desc" className="text-right text-slate-300">Description</Label>
                                    <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">Cancel</Button>
                                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Save Cabinet</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none bg-[#0f172a] shadow-lg">
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <Input
                            placeholder="Search cabinets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[250px] bg-[#1e293b] border-slate-700 text-white"
                        />
                        <Label className="text-slate-300 whitespace-nowrap">Filter:</Label>
                        <Select value={filterShelfId} onValueChange={setFilterShelfId}>
                            <SelectTrigger className="w-[200px] bg-[#1e293b] border-slate-700 text-white">
                                <SelectValue placeholder="All Drawers" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                <SelectItem value="all">All Drawers</SelectItem>
                                {cabinets.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Label className="text-slate-300 whitespace-nowrap">Sort:</Label>
                        <Select value={sortField} onValueChange={(value) => setSortField(value as any)}>
                            <SelectTrigger className="w-[120px] bg-[#1e293b] border-slate-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="code">Code</SelectItem>
                                <SelectItem value="contents">Contents</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="bg-[#1e293b] border-slate-700 text-white hover:bg-slate-700"
                        >
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none bg-[#0f172a] shadow-lg">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredCabinets.length > 0 && filteredCabinets.every(c => selectedIds.includes(c.id))}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                </TableHead>
                                <TableHead className="text-slate-300">Name</TableHead>
                                <TableHead className="text-slate-300">Parent Drawer</TableHead>
                                <TableHead className="text-slate-300">Code</TableHead>
                                <TableHead className="text-slate-300">Contents</TableHead>
                                <TableHead className="text-right text-slate-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCabinets.length === 0 ? (
                                <TableRow className="border-slate-800">
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        No cabinets found. Add your first cabinet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCabinets.map((cabinet) => (
                                    <TableRow key={cabinet.id} className="border-slate-800 hover:bg-[#1e293b]">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(cabinet.id)}
                                                onCheckedChange={(checked) => handleSelectOne(cabinet.id, checked as boolean)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{cabinet.name}</p>
                                                    <p className="text-xs text-slate-400">{cabinet.description || 'No description'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {getParentShelfName(cabinet.cabinetId)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                {cabinet.code}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {getCabinetStats(cabinet.id).folders} folders
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewFolders(cabinet.id)}
                                                    className="h-8 bg-emerald-600/10 border-emerald-600/20 text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View Folders
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(cabinet)}
                                                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-[#1e293b] border-slate-800 text-white">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Cabinet?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">
                                                                {(() => {
                                                                    const stats = getCabinetStats(cabinet.id);
                                                                    const hasContents = stats.folders > 0 || stats.files > 0;

                                                                    if (hasContents) {
                                                                        return (
                                                                            <div className="text-red-400 font-medium border border-red-400/20 bg-red-400/10 p-3 rounded-md">
                                                                                Cannot delete this cabinet.<br />
                                                                                It contains:<br />
                                                                                <ul className="list-disc list-inside mt-1 ml-2 text-sm">
                                                                                    {stats.folders > 0 && <li><strong>{stats.folders}</strong> Folder{stats.folders !== 1 ? 's' : ''}</li>}
                                                                                    {stats.files > 0 && <li><strong>{stats.files}</strong> File{stats.files !== 1 ? 's' : ''}</li>}
                                                                                </ul>
                                                                                <br />
                                                                                Please delete all contents first.
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <span>This will permanently delete <strong>{cabinet.name}</strong>.</span>;
                                                                })()}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(cabinet.id)}
                                                                disabled={(() => {
                                                                    const stats = getCabinetStats(cabinet.id);
                                                                    return stats.folders > 0 || stats.files > 0;
                                                                })()}
                                                                className={(() => {
                                                                    const stats = getCabinetStats(cabinet.id);
                                                                    return (stats.folders > 0 || stats.files > 0)
                                                                        ? "bg-slate-700 text-slate-400 cursor-not-allowed hover:bg-slate-700"
                                                                        : "bg-red-600 hover:bg-red-700 text-white";
                                                                })()}
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
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
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Cabinet</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update cabinet details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-slate-300">Parent Drawer</Label>
                            <select
                                value={parentShelfId}
                                onChange={(e) => setParentShelfId(e.target.value)}
                                className="col-span-3 bg-[#1e293b] border-slate-700 text-white rounded-md p-2"
                            >
                                <option value="">Select Drawer</option>
                                {cabinets.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right text-slate-300">Name</Label>
                            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-code" className="text-right text-slate-300">Code</Label>
                            <Input id="edit-code" value={code} onChange={(e) => setCode(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-desc" className="text-right text-slate-300">Description</Label>
                            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">Cancel</Button>
                        <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Cabinets;
