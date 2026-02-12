import React, { useState, useEffect } from 'react';
import { Division } from '@/types/procurement';
import { onDivisionsChange, addDivision, updateDivision, deleteDivision } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

const Divisions: React.FC = () => {
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        abbreviation: ''
    });

    useEffect(() => {
        const unsub = onDivisionsChange((data) => {
            setDivisions(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredDivisions = divisions
        .filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const resetForm = () => {
        setFormData({ name: '', abbreviation: '' });
        setSelectedDivision(null);
    };

    const handleAdd = async () => {
        if (!formData.name || !formData.abbreviation) {
            toast.error('Name and Abbreviation are required');
            return;
        }

        try {
            await addDivision(formData.name, formData.abbreviation);
            toast.success('Division added successfully');
            setIsAddOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to add division');
        }
    };

    const handleEdit = async () => {
        if (!selectedDivision || !formData.name || !formData.abbreviation) return;

        try {
            await updateDivision(selectedDivision.id, {
                name: formData.name,
                abbreviation: formData.abbreviation.toUpperCase()
            });
            toast.success('Division updated successfully');
            setIsEditOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update division');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this division?")) {
            try {
                await deleteDivision(id);
                toast.success('Division deleted');
            } catch (error) {
                toast.error('Failed to delete division');
            }
        }
    };

    const openEdit = (division: Division) => {
        setSelectedDivision(division);
        setFormData({
            name: division.name,
            abbreviation: division.abbreviation
        });
        setIsEditOpen(true);
    };

    return (
        <div className="space-y-6 fade-in animate-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Divisions</h1>
                    <p className="text-slate-400">Manage organizational divisions and abbreviations</p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Division
                </Button>
            </div>

            <Card className="bg-[#0f172a] border-slate-800">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search divisions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-300">Name</TableHead>
                                <TableHead className="text-slate-300">Abbreviation</TableHead>
                                <TableHead className="text-slate-300">Created At</TableHead>
                                <TableHead className="text-right text-slate-300">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDivisions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-slate-500 h-24">No divisions found</TableCell>
                                </TableRow>
                            ) : (
                                filteredDivisions.map((division) => (
                                    <TableRow key={division.id} className="border-slate-800 hover:bg-[#1e293b]">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-blue-400" />
                                                {division.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {division.abbreviation}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-400 text-xs">
                                            {format(new Date(division.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(division)} className="h-8 w-8 text-slate-400 hover:text-white">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(division.id)} className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-[#1e293b] border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Add Division</DialogTitle>
                        <DialogDescription>Create a new division for PR number generation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Division Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Information Technology"
                                className="bg-[#0f172a] border-slate-700"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="abbr">Abbreviation</Label>
                            <Input
                                id="abbr"
                                value={formData.abbreviation}
                                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                placeholder="e.g. IT"
                                className="bg-[#0f172a] border-slate-700"
                            />
                            <p className="text-xs text-slate-400">Used in PR Numbers (e.g. IT-0226-001)</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Create Division</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-[#1e293b] border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Division</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update division details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Division Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-[#0f172a] border-slate-700"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-abbr">Abbreviation</Label>
                            <Input
                                id="edit-abbr"
                                value={formData.abbreviation}
                                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                className="bg-[#0f172a] border-slate-700"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Divisions;
