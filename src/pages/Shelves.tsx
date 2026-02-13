import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { addCabinet, updateCabinet, deleteCabinet } from '@/lib/storage'; // Maps to Shelves Node
import { Cabinet, Shelf, Folder, Procurement } from '@/types/procurement';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Eye, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const Shelves: React.FC = () => {
    const navigate = useNavigate();
    const { shelves, cabinets, folders, procurements } = useData(); // shelves = Tier 1 (S1), cabinets = Tier 2 (C1)

    // UI State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentShelf, setCurrentShelf] = useState<Cabinet | null>(null); // Type Cabinet because it comes from 'cabinets' node

    // Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'name' | 'code' | 'contents'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');

    const resetForm = () => {
        setName('');
        setCode('');
        setDescription('');
        setCurrentShelf(null);
    };

    const handleAdd = async () => {
        if (!name || !code) {
            toast.error('Name and Code are required');
            return;
        }

        try {
            await addCabinet(name, code, description);
            setIsAddDialogOpen(false);
            resetForm();
            toast.success('Shelf added successfully');
        } catch (error) {
            toast.error('Failed to add shelf');
        }
    };

    const handleEditClick = (shelf: Cabinet) => {
        setCurrentShelf(shelf);
        setName(shelf.name);
        setCode(shelf.code);
        setDescription(shelf.description || '');
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentShelf || !name || !code) return;

        try {
            await updateCabinet(currentShelf.id, { name, code, description });
            setIsEditDialogOpen(false);
            resetForm();
            toast.success('Shelf updated successfully');
        } catch (error) {
            toast.error('Failed to update shelf');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCabinet(id);
            toast.success('Shelf deleted successfully');
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            }
        } catch (error) {
            toast.error('Failed to delete shelf');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        // Validation: Check if any selected shelf has contents
        const shelvesWithContents = selectedIds.filter(id => {
            const stats = getShelfStats(id);
            return stats.cabinets > 0 || stats.folders > 0 || stats.files > 0;
        });

        if (shelvesWithContents.length > 0) {
            toast.error(`Cannot delete ${shelvesWithContents.length} shelves because they contain items. Please empty them first.`);
            return;
        }

        try {
            await Promise.all(selectedIds.map(id => deleteCabinet(id)));
            toast.success(`${selectedIds.length} shelves deleted successfully`);
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete some shelves');
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = filteredShelves.map(c => c.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = filteredShelves.map(c => c.id);
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

    const handleViewCabinets = (shelfId: string) => {
        navigate(`/cabinets?shelfId=${shelfId}`);
    };

    // Deep Counts Logic
    const getShelfStats = (shelfId: string) => {
        // UI Shelf (Tier 1) -> DB Cabinet (id = shelfId)
        // Children are UI Cabinets (Tier 2) -> DB Shelves (cabinetId = shelfId)
        const myCabinets = shelves.filter(s => s.cabinetId === shelfId); // Count DB Shelves
        const myCabinetIds = myCabinets.map(c => c.id);

        // Find Folders in these Cabinets
        // DB Folders point to DB Shelves (shelfId -> DB Shelf ID)
        const myFolders = folders.filter(f => myCabinetIds.includes(f.shelfId));
        const myFolderIds = myFolders.map(f => f.id);

        // Find Files in these Folders
        const myFiles = procurements.filter(p => myFolderIds.includes(p.folderId));

        return {
            cabinets: myCabinets.length,
            folders: myFolders.length,
            files: myFiles.length
        };
    };

    // Filtering and Sorting
    // UI "Shelves" are DB "Cabinets"
    const filteredShelves = cabinets
        .filter(shelf => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    shelf.name.toLowerCase().includes(query) ||
                    shelf.code.toLowerCase().includes(query) ||
                    (shelf.description && shelf.description.toLowerCase().includes(query))
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
                comparison = getShelfStats(a.id).cabinets - getShelfStats(b.id).cabinets;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Shelves</h1>
                    <p className="text-slate-400 mt-1">Manage physical storage shelves (Tier 1)</p>
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
                                    <AlertDialogTitle>Delete {selectedIds.length} Shelves?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        This will permanently delete the selected shelves and ALL content inside them.
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
                                <Plus className="mr-2 h-4 w-4" /> Add Shelf
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Add New Shelf</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Create a new top-level storage shelf.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right text-slate-300">Name</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" placeholder="Shelf 1" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right text-slate-300">Code</Label>
                                    <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" placeholder="S1" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="desc" className="text-right text-slate-300">Description</Label>
                                    <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 bg-[#1e293b] border-slate-700 text-white" placeholder="Main storage shelf..." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">Cancel</Button>
                                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Save Shelf</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none bg-[#0f172a] shadow-lg">
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <Input
                            placeholder="Search shelves..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[250px] bg-[#1e293b] border-slate-700 text-white"
                        />
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
                                        checked={filteredShelves.length > 0 && filteredShelves.every(c => selectedIds.includes(c.id))}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                </TableHead>
                                <TableHead className="text-slate-300">Name</TableHead>
                                <TableHead className="text-slate-300">Code</TableHead>
                                <TableHead className="text-slate-300">Contents</TableHead>
                                <TableHead className="text-right text-slate-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredShelves.length === 0 ? (
                                <TableRow className="border-slate-800">
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                        No shelves found. Add your first shelf.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredShelves.map((shelf) => (
                                    <TableRow key={shelf.id} className="border-slate-800 hover:bg-[#1e293b]">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(shelf.id)}
                                                onCheckedChange={(checked) => handleSelectOne(shelf.id, checked as boolean)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <Layers className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{shelf.name}</p>
                                                    <p className="text-xs text-slate-400">{shelf.description || 'No description'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                {shelf.code}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {getShelfStats(shelf.id).cabinets} cabinets
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewCabinets(shelf.id)}
                                                    className="h-8 bg-emerald-600/10 border-emerald-600/20 text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View Cabinets
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(shelf)}
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
                                                            <AlertDialogTitle>Delete Shelf?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">
                                                                {(() => {
                                                                    const stats = getShelfStats(shelf.id);
                                                                    const hasContents = stats.cabinets > 0 || stats.folders > 0 || stats.files > 0;

                                                                    if (hasContents) {
                                                                        return (
                                                                            <div className="text-red-400 font-medium border border-red-400/20 bg-red-400/10 p-3 rounded-md">
                                                                                Cannot delete this shelf.<br />
                                                                                It contains:<br />
                                                                                <ul className="list-disc list-inside mt-1 ml-2 text-sm">
                                                                                    {stats.cabinets > 0 && <li><strong>{stats.cabinets}</strong> Cabinet{stats.cabinets !== 1 ? 's' : ''}</li>}
                                                                                    {stats.folders > 0 && <li><strong>{stats.folders}</strong> Folder{stats.folders !== 1 ? 's' : ''}</li>}
                                                                                    {stats.files > 0 && <li><strong>{stats.files}</strong> File{stats.files !== 1 ? 's' : ''}</li>}
                                                                                </ul>
                                                                                <br />
                                                                                Please delete all contents first.
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <span>This will permanently delete <strong>{shelf.name}</strong>.</span>;
                                                                })()}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(shelf.id)}
                                                                disabled={(() => {
                                                                    const stats = getShelfStats(shelf.id);
                                                                    return stats.cabinets > 0 || stats.folders > 0 || stats.files > 0;
                                                                })()}
                                                                className={(() => {
                                                                    const stats = getShelfStats(shelf.id);
                                                                    return (stats.cabinets > 0 || stats.folders > 0 || stats.files > 0)
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
                        <DialogTitle>Edit Shelf</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update shelf details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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

export default Shelves;
