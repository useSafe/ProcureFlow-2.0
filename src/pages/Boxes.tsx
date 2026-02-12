import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@/types/procurement';
import { addBox, updateBox, deleteBox } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Package, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '@/contexts/DataContext';

const Boxes: React.FC = () => {
    const navigate = useNavigate();
    const { boxes, procurements } = useData();

    // UI State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Sorting
    const [sortField, setSortField] = useState<'name' | 'code' | 'contents' | 'date'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });
    const [selectedBox, setSelectedBox] = useState<Box | null>(null);

    // Stats
    const getBoxStats = (boxId: string) => {
        const myFiles = procurements.filter(p => p.boxId === boxId);
        return { files: myFiles.length };
    };

    // Filter & Sort
    const filteredBoxes = boxes
        .filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'code') {
                // Try numeric sort for codes like "BOX-01"
                const getCodeNum = (str: string) => {
                    const match = str.match(/\d+/);
                    return match ? parseInt(match[0]) : 0;
                };
                const aNum = getCodeNum(a.code);
                const bNum = getCodeNum(b.code);
                comparison = aNum === bNum ? a.code.localeCompare(b.code) : aNum - bNum;
            } else if (sortField === 'contents') {
                comparison = getBoxStats(a.id).files - getBoxStats(b.id).files;
            } else if (sortField === 'date') {
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const resetForm = () => {
        setFormData({ name: '', code: '', description: '' });
        setSelectedBox(null);
    };

    const handleAdd = async () => {
        if (!formData.name || !formData.code) {
            toast.error('Name and Code are required');
            return;
        }
        try {
            await addBox(formData.name, formData.code, formData.description);
            toast.success('Box added successfully');
            setIsAddOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to add box');
        }
    };

    const handleEdit = async () => {
        if (!selectedBox || !formData.name || !formData.code) return;
        try {
            await updateBox(selectedBox.id, {
                name: formData.name,
                code: formData.code.toUpperCase(),
                description: formData.description
            });
            toast.success('Box updated successfully');
            setIsEditOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update box');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteBox(id);
            toast.success('Box deleted');
            if (selectedIds.includes(id)) {
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete box');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            await Promise.all(selectedIds.map(id => deleteBox(id)));
            toast.success(`${selectedIds.length} boxes deleted`);
            setSelectedIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete some boxes');
        }
    };

    const openEdit = (box: Box) => {
        setSelectedBox(box);
        setFormData({
            name: box.name,
            code: box.code,
            description: box.description || ''
        });
        setIsEditOpen(true);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentIds = filteredBoxes.map(b => b.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
        } else {
            const currentIds = filteredBoxes.map(b => b.id);
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

    const handleViewFiles = (boxId: string) => {
        navigate(`/procurement/list?boxId=${boxId}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Boxes</h1>
                    <p className="text-slate-400 mt-1">Manage storage boxes</p>
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
                                    <AlertDialogTitle>Delete {selectedIds.length} Boxes?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        This action cannot be undone. This will permanently delete the selected boxes.
                                        Check if they have any files before deleting.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
                        if (!open) { setIsAddOpen(false); setIsEditOpen(false); }
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" /> Add Box
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
                            <DialogHeader>
                                <DialogTitle>{isEditOpen ? 'Edit Box' : 'Add New Box'}</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    {isEditOpen ? 'Update box details.' : 'Create a new storage box.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right text-slate-300">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Year 2024 Box"
                                        className="col-span-3 bg-[#1e293b] border-slate-700 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="code" className="text-right text-slate-300">Code</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="BOX-01"
                                        className="col-span-3 bg-[#1e293b] border-slate-700 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="desc" className="text-right text-slate-300">Description</Label>
                                    <Textarea
                                        id="desc"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="col-span-3 bg-[#1e293b] border-slate-700 text-white"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="border-slate-700 text-white hover:bg-slate-800">Cancel</Button>
                                <Button onClick={isEditOpen ? handleEdit : handleAdd} className="bg-blue-600 hover:bg-blue-700">
                                    {isEditOpen ? 'Save Changes' : 'Create Box'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none bg-[#0f172a] shadow-lg">
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search boxes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-[250px] pl-9 bg-[#1e293b] border-slate-700 text-white"
                            />
                        </div>
                        <Label className="text-slate-300 whitespace-nowrap">Sort:</Label>
                        <Select value={sortField} onValueChange={(value) => setSortField(value as any)}>
                            <SelectTrigger className="w-[120px] bg-[#1e293b] border-slate-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="code">Code</SelectItem>
                                <SelectItem value="contents">Contents</SelectItem>
                                <SelectItem value="date">Date Created</SelectItem>
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
                                        checked={filteredBoxes.length > 0 && filteredBoxes.every(b => selectedIds.includes(b.id))}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                </TableHead>
                                <TableHead className="text-slate-300">Name</TableHead>
                                <TableHead className="text-slate-300">Code</TableHead>
                                <TableHead className="text-slate-300">Description</TableHead>
                                <TableHead className="text-slate-300">Created At</TableHead>
                                <TableHead className="text-slate-300">Contents</TableHead>
                                <TableHead className="text-right text-slate-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBoxes.length === 0 ? (
                                <TableRow className="border-slate-800">
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        No boxes found. Create a new box to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBoxes.map((box) => (
                                    <TableRow key={box.id} className="border-slate-800 hover:bg-[#1e293b]">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(box.id)}
                                                onCheckedChange={(checked) => handleSelectOne(box.id, checked as boolean)}
                                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-orange-400" />
                                                {box.name}
                                            </div>
                                        </TableCell>
                                        <TableCell><span className="font-mono text-slate-300 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{box.code}</span></TableCell>
                                        <TableCell className="text-slate-400">{box.description || '-'}</TableCell>
                                        <TableCell className="text-slate-400 text-xs">
                                            {format(new Date(box.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {getBoxStats(box.id).files} files
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    title="View Files"
                                                    onClick={() => handleViewFiles(box.id)}
                                                    className="h-8 bg-emerald-600/10 border-emerald-600/20 text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View Files
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(box)} className="h-8 w-8 text-slate-400 hover:text-white">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-[#1e293b] border-slate-800 text-white">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Box?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">
                                                                {getBoxStats(box.id).files > 0
                                                                    ? <span className="text-red-400">Cannot delete box. It contains {getBoxStats(box.id).files} files. Empty it first.</span>
                                                                    : <span>This will permanently delete <strong>{box.name}</strong>.</span>
                                                                }
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-transparent border-slate-700 text-white hover:bg-slate-800">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(box.id)}
                                                                disabled={getBoxStats(box.id).files > 0}
                                                                className={getBoxStats(box.id).files > 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"}
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
        </div>
    );
};

export default Boxes;
