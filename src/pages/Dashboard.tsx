import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { onProcurementsChange, onCabinetsChange, onShelvesChange, onFoldersChange, onBoxesChange } from '@/lib/storage';
import { initializeDummyData } from '@/lib/initDummyData';
import { Procurement, Cabinet, Shelf, Folder, Box } from '@/types/procurement';
import { FileText, Archive, Layers, Package, FolderOpen, Clock, TrendingUp, Database, Download, Search, Plus, Eye, Map as MapIcon, Activity, Box as BoxIcon, Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, LabelList } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [cabinets, setCabinets] = useState<Cabinet[]>([]); // Shelves (Tier 1)
    const [shelves, setShelves] = useState<Shelf[]>([]); // Cabinets (Tier 2)
    const [folders, setFolders] = useState<Folder[]>([]); // Folders (Tier 3)
    const [boxes, setBoxes] = useState<Box[]>([]); // Boxes
    const [isInitializing, setIsInitializing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Year Filter State
    const [selectedYear, setSelectedYear] = useState<string>('all');

    useEffect(() => {
        const unsubProcurements = onProcurementsChange(setProcurements);
        const unsubCabinets = onCabinetsChange(setCabinets);
        const unsubShelves = onShelvesChange(setShelves);
        const unsubFolders = onFoldersChange(setFolders);
        const unsubBoxes = onBoxesChange(setBoxes);

        return () => {
            unsubProcurements();
            unsubCabinets();
            unsubShelves();
            unsubFolders();
            unsubBoxes();
        };
    }, []);

    // Compute Available Years
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        procurements.forEach(p => {
            // Match YYYY- at start of PR number
            const match = p.prNumber.match(/^(\d{4})-/);
            if (match) {
                years.add(match[1]);
            } else if (p.createdAt) {
                try {
                    years.add(new Date(p.createdAt).getFullYear().toString());
                } catch (e) { }
            }
        });
        return Array.from(years).sort().reverse();
    }, [procurements]);

    // Handle default year selection if 'all' but data exists (optional, keeping 'all' as default)

    // Filter Procurements
    const filteredProcurements = useMemo(() => {
        if (selectedYear === 'all') return procurements;
        return procurements.filter(p => {
            const match = p.prNumber.match(/^(\d{4})-/);
            if (match) return match[1] === selectedYear;
            if (p.createdAt) {
                return new Date(p.createdAt).getFullYear().toString() === selectedYear;
            }
            return false;
        });
    }, [selectedYear, procurements]);

    const metrics = useMemo(() => {
        return {
            totalRecords: filteredProcurements.length,
            active: filteredProcurements.filter(p => p.status === 'active').length,
            archived: filteredProcurements.filter(p => p.status === 'archived').length,
            svp: filteredProcurements.filter(p => p.procurementType === 'SVP').length,
            regular: filteredProcurements.filter(p => p.procurementType === 'Regular Bidding').length,
            totalDrawers: cabinets.length, // Structural counts remain total
            totalCabinets: shelves.length,
            totalFolders: folders.length,
            totalBoxes: boxes.length,
        }
    }, [filteredProcurements, cabinets, shelves, folders, boxes]);

    // Storage Stats (Mixed Drawers and Boxes)
    const storageStats = useMemo(() => {
        // 1. Drawers (Tier 1)
        const drawerData = cabinets.map(c => ({
            id: c.id,
            name: c.code,
            type: 'Drawer',
            count: filteredProcurements.filter(p => p.cabinetId === c.id).length
        }));

        // 2. Boxes
        const boxData = boxes.map(b => ({
            id: b.id,
            name: b.name, // Use name for Boxes as it might be clearer than just code
            type: 'Box',
            count: filteredProcurements.filter(p => p.boxId === b.id).length
        }));

        // Combine and Sort
        return [...drawerData, ...boxData]
            .filter(s => s.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 7); // Top 7 for better fit
    }, [cabinets, boxes, filteredProcurements]);

    // Calculate detailed hierarchy data (Drawers AND Boxes)
    const hierarchyData = useMemo(() => {
        // Drawer Hierarchy
        const drawerH = cabinets.map(drawer => {
            // Tier 2: Cabinets in this Tier 1 Drawer
            const validCabinets = shelves.filter(c => c.cabinetId === drawer.id);
            // Tier 3: Boxes in these Tier 2 Cabinets
            const validBoxes = boxes.filter(b => validCabinets.some(c => c.id === b.shelfId));

            // Tier 4: Folders
            const directFolders = folders.filter(f => validCabinets.some(c => c.id === f.shelfId) && !f.boxId);
            const boxFolders = folders.filter(f => validBoxes.some(b => b.id === f.boxId));
            const totalFolders = directFolders.length + boxFolders.length;

            // Tier 5: Files (Filtered by Year)
            const validFiles = filteredProcurements.filter(p => p.cabinetId === drawer.id);

            return {
                name: drawer.code,
                Drawers: 1,
                Cabinets: validCabinets.length,
                Folders: totalFolders,
                Files: validFiles.length,
                Boxes: validBoxes.length,
                type: 'drawer',
                rawFiles: validFiles.length // for sorting
            };
        });

        // Box Hierarchy (Standalone view for Box hotspots)
        const boxH = boxes.map(box => {
            const boxFolders = folders.filter(f => f.boxId === box.id);
            const boxFiles = filteredProcurements.filter(p => p.boxId === box.id);

            return {
                name: box.name,
                Drawers: 0,
                Cabinets: undefined, // Hide from chart
                Boxes: 1, // It is a box
                Folders: boxFolders.length,
                Files: boxFiles.length,
                type: 'box',
                rawFiles: boxFiles.length
            };
        });

        // Combine and take top 10 by Files
        return [...drawerH, ...boxH]
            .filter(item => item.rawFiles > 0) // Only showing active storages for this year
            .sort((a, b) => b.rawFiles - a.rawFiles)
            .slice(0, 10);
    }, [cabinets, shelves, folders, filteredProcurements, boxes]);

    const typeData = [
        { name: 'SVP', value: metrics.svp, fill: '#3b82f6' }, // Blue
        { name: 'Regular', value: metrics.regular, fill: '#a855f7' }, // Purple
    ].filter(d => d.value > 0);

    const statusData = [
        { name: 'Borrowed', value: metrics.active, fill: '#f59e0b' },
        { name: 'Archived', value: metrics.archived, fill: '#10b981' },
    ].filter(d => d.value > 0);

    // Recent 5 activities (Filtered)
    const recentProcurements = [...(filteredProcurements || [])]
        .sort((a, b) => new Date(b.createdAt || b.dateAdded || new Date()).getTime() - new Date(a.createdAt || a.dateAdded || new Date()).getTime())
        .slice(0, 5);

    const progressData = [
        { name: 'Completed', value: filteredProcurements.filter(p => p.procurementStatus === 'Completed').length, fill: '#10b981' },
        { name: 'In Progress', value: filteredProcurements.filter(p => p.procurementStatus === 'In Progress').length, fill: '#f59e0b' },
        { name: 'Returned PR', value: filteredProcurements.filter(p => p.procurementStatus === 'Returned PR to EU').length, fill: '#a855f7' },
        { name: 'Not yet Acted', value: filteredProcurements.filter(p => !p.procurementStatus || p.procurementStatus === 'Not yet Acted').length, fill: '#64748b' },
        { name: 'Failure', value: filteredProcurements.filter(p => p.procurementStatus === 'Failure').length, fill: '#ef4444' },
        { name: 'Cancelled', value: filteredProcurements.filter(p => p.procurementStatus === 'Cancelled').length, fill: '#ea580c' },
    ].filter(d => d.value > 0);

    // Filtered suggestions logic (uses base procurements for global search, or filtered?)
    // Search usually implies global search. I'll keep it global to find any record.
    const filteredSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return procurements
            .filter(p =>
                p.prNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.projectName && p.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 5);
    }, [searchQuery, procurements]);

    const getLocationString = (p: Procurement) => {
        const cabinet = cabinets.find(c => c.id === p.cabinetId);
        const shelf = shelves.find(s => s.id === p.shelfId);
        const box = p.boxId ? boxes.find(b => b.id === p.boxId) : null;
        const folder = folders.find(f => f.id === p.folderId);

        if (box && folder) {
            return `${box.code} → ${folder.code}`;
        } else if (cabinet && shelf && folder) {
            return `${cabinet.code} → ${shelf.code} → ${folder.code}`;
        }
        return 'Unknown Location';
    };

    const handleExportDashboard = async () => {
        // Export logic... (kept same as before, omitted for brevity if needed, but I'll write it out)
        const dashboardElement = document.getElementById('dashboard-content');
        if (!dashboardElement) return;

        try {
            const canvas = await html2canvas(dashboardElement as HTMLElement, {
                scale: 1,
                useCORS: true,
                logging: false,
                backgroundColor: '#020617'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save('dashboard-summary.pdf');
            toast.success('Dashboard summary exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export dashboard');
        }
    };

    const summaryCards = [
        { title: 'Total Drawers', value: metrics.totalDrawers, icon: Layers, bg: 'bg-slate-600', text: 'text-white', description: 'Tier 1 Storage' },
        { title: 'Total Cabinets', value: metrics.totalCabinets, icon: Package, bg: 'bg-blue-600', text: 'text-white', description: 'Tier 2 Storage' },
        { title: 'Total Boxes', value: metrics.totalBoxes, icon: Archive, bg: 'bg-indigo-600', text: 'text-white', description: 'Tier 3 Storage' },
        { title: 'Total Folders', value: metrics.totalFolders, icon: FolderOpen, bg: 'bg-amber-600', text: 'text-white', description: 'File Containers' },
    ];

    const statusCards = [
        { title: 'All Records', value: metrics.totalRecords, icon: Database, bg: 'bg-emerald-600', text: 'text-white' },
        { title: 'SVP Records', value: metrics.svp, icon: FileText, bg: 'bg-blue-500', text: 'text-white' },
        { title: 'Regular Bidding', value: metrics.regular, icon: FileText, bg: 'bg-purple-500', text: 'text-white' },
        { title: 'Borrowed Files', value: metrics.active, icon: Clock, bg: 'bg-amber-500', text: 'text-white' },
    ];

    return (
        <div className="space-y-6 h-full overflow-auto pb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 mt-1">
                        Overview of your file tracking system {selectedYear !== 'all' && `(${selectedYear})`}
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Year Filter */}
                    <div className="w-[150px]">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="bg-[#1e293b] border-slate-700 text-white h-10">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="All Years" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                <SelectItem value="all">All Years</SelectItem>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>


                </div>
            </div>

            {/* Quick Actions */}
            <Card className="border-none bg-[#0f172a] text-white shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                            <Input
                                placeholder="Search PR Number or Project Name..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        navigate(`/procurement/list?search=${encodeURIComponent(searchQuery.trim())}`);
                                        setShowSuggestions(false);
                                    } else if (e.key === 'Escape') setShowSuggestions(false);
                                }}
                                className="pl-10 bg-[#1e293b] border-slate-700 text-white placeholder:text-slate-500"
                            />
                            {showSuggestions && filteredSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                    {filteredSuggestions.map((proc) => (
                                        <button
                                            key={proc.id}
                                            onClick={() => {
                                                const isSpecial = ['Attendance Sheets', 'Receipt', 'Others'].includes(proc.procurementType || '');
                                                const searchValue = isSpecial ? proc.projectName : proc.prNumber;
                                                setSearchQuery(searchValue || proc.prNumber);
                                                setShowSuggestions(false);
                                                navigate(`/procurement/list?search=${encodeURIComponent(searchValue || proc.prNumber)}`);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 flex items-start gap-3"
                                        >
                                            <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{proc.prNumber}</div>
                                                <div className="text-xs text-slate-400 truncate mt-0.5">{proc.projectName}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {user?.role !== 'viewer' && user?.role !== 'archiver' && (
                                <Button onClick={() => navigate('/procurement/add')} className="bg-blue-600 hover:bg-blue-700 justify-start h-auto py-3">
                                    <Plus className="mr-2 h-5 w-5 text-white" />
                                    <div className="text-left">
                                        <div className="font-semibold text-white">Add Procurement</div>
                                        <div className="text-xs opacity-80 text-white">Create new record</div>
                                    </div>
                                </Button>
                            )}
                            <Button onClick={() => navigate('/procurement/list')} className="bg-emerald-600 hover:bg-emerald-700 justify-start h-auto py-3">
                                <Eye className="mr-2 h-5 w-5 text-white" />
                                <div className="text-left">
                                    <div className="font-semibold text-white">View Records</div>
                                    <div className="text-xs opacity-80 text-white">Browse all files</div>
                                </div>
                            </Button>
                            <Button onClick={() => navigate('/visual-allocation')} className="bg-purple-600 hover:bg-purple-700 justify-start h-auto py-3">
                                <MapIcon className="mr-2 h-5 w-5 text-white" />
                                <div className="text-left text-white">
                                    <div className="font-semibold text-white">Visual Allocation</div>
                                    <div className="text-xs opacity-80 text-white">Map view</div>
                                </div>
                            </Button>
                            {user?.role !== 'archiver' && (
                                <Button onClick={() => navigate('/procurement/progress')} className="bg-amber-600 hover:bg-amber-700 justify-start h-auto py-3">
                                    <Activity className="mr-2 h-5 w-5 text-white" />
                                    <div className="text-left text-white">
                                        <div className="font-semibold text-white">Track Progress</div>
                                        <div className="text-xs opacity-80 text-white">Monitor status</div>
                                    </div>
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div id="dashboard-content" className="space-y-6">
                {/* Storage Hierarchy Summary */}
                <div>
                    <h2 className="text-lg font-semibold text-white mb-3">Storage Structure Summary</h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {summaryCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Card key={card.title} className="relative overflow-hidden border-none bg-[#0f172a] text-white shadow-lg hover:shadow-xl transition-shadow">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-400">{card.title}</p>
                                            <div className="text-3xl font-bold">{card.value}</div>
                                            <p className="text-xs text-slate-500">{card.description}</p>
                                        </div>
                                        <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center shadow-lg`}>
                                            <Icon className={`h-6 w-6 ${card.text}`} />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* File Status Summary */}
                <div>
                    <h2 className="text-lg font-semibold text-white mb-3">File Analytics ({selectedYear === 'all' ? 'All Years' : selectedYear})</h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {statusCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Card key={card.title} className="relative overflow-hidden border-none bg-[#0f172a] text-white shadow-lg hover:shadow-xl transition-shadow">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-400">{card.title}</p>
                                            <div className="text-3xl font-bold">{card.value}</div>
                                        </div>
                                        <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center shadow-lg`}>
                                            <Icon className={`h-6 w-6 ${card.text}`} />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {/* File Status Distribution Chart */}
                    <Card className="border-none bg-[#0f172a] text-white shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                File Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="48%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="inside" fill="#fff" stroke="none" fontSize={14} fontWeight="bold" />
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                                        <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Procurement Type Chart */}
                    <Card className="border-none bg-[#0f172a] text-white shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4 text-blue-400" />
                                Procurement Type
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={typeData} cx="50%" cy="48%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {typeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="inside" fill="#fff" stroke="none" fontSize={14} fontWeight="bold" />
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                                        <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Status Chart */}
                    <Card className="border-none bg-[#0f172a] text-white shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-4 w-4 text-amber-400" />
                                Progress Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={progressData} cx="50%" cy="48%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {progressData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="value" position="inside" fill="#fff" stroke="none" fontSize={14} fontWeight="bold" />
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                                        <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-5">
                    {/* Top Storages Chart (Mixed Drawers & Boxes) */}
                    <Card className="md:col-span-2 sm:col-span-3 border-none bg-[#0f172a] text-white shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Layers className="h-4 w-4 text-purple-400" />
                                Top Storages (Files)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px]">
                                {storageStats.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        No data available
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={storageStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="barGradientDrawer" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
                                                </linearGradient>
                                                <linearGradient id="barGradientBox" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#db2777" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#be185d" stopOpacity={1} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip
                                                cursor={{ fill: '#1e293b' }}
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-[#1e293b] border border-slate-700 p-2 rounded shadow text-xs">
                                                                <p className="font-semibold">{label}</p>
                                                                <p className="text-slate-300">Type: {data.type}</p>
                                                                <p className="text-slate-300">Files: {data.count}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar
                                                dataKey="count"
                                                radius={[4, 4, 0, 0]}
                                                barSize={30}
                                            >
                                                {storageStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.type === 'Box' ? 'url(#barGradientBox)' : 'url(#barGradientDrawer)'} />
                                                ))}
                                                <LabelList dataKey="count" position="insideTop" fill="#fff" fontSize={12} fontWeight="bold" />
                                            </Bar>
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                content={() => (
                                                    <div className="flex justify-center gap-4 text-xs font-medium text-slate-300 pb-2">
                                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div>Drawer</div>
                                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-pink-600"></div>Box</div>
                                                    </div>
                                                )}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Consolidated Storage Hierarchy Chart */}
                    <Card className="col-span-3 border-none bg-[#0f172a] text-white shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-blue-400" />
                                Storage Hierarchy Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hierarchyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} domain={[0, (dataMax: number) => dataMax + 2]} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-[#1e293b] border border-slate-700 p-3 rounded-lg shadow-xl">
                                                            <p className="font-semibold text-white mb-2">{label} {data.type === 'box' ? '(Box)' : '(Drawer)'}</p>
                                                            <div className="space-y-1">
                                                                {/* Conditionally show Cabinets if relevant */}
                                                                {data.type === 'drawer' && (
                                                                    <p className="text-sm text-slate-300 flex items-center">
                                                                        <span className="w-2 h-2 rounded-full bg-[#9333ea] mr-2"></span>
                                                                        Cabinets: <span className="text-white font-bold ml-1">{data.Cabinets}</span>
                                                                    </p>
                                                                )}
                                                                <p className="text-sm text-slate-300 flex items-center">
                                                                    <span className="w-2 h-2 rounded-full bg-[#d97706] mr-2"></span>
                                                                    Folders: <span className="text-white font-bold ml-1">{data.Folders}</span>
                                                                </p>
                                                                <p className="text-sm text-slate-300 flex items-center">
                                                                    <span className="w-2 h-2 rounded-full bg-[#10b981] mr-2"></span>
                                                                    Files: <span className="text-white font-bold ml-1">{data.Files}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                            position={{ y: 280 }} // Force tooltip to bottom
                                        />
                                        <Legend />
                                        <Bar dataKey="Cabinets" name="Cabinets" fill="#9333ea" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Cabinets" position="insideTop" fill="#fff" fontSize={10} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
                                        </Bar>
                                        <Bar dataKey="Files" name="Files" fill="#10b981" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Files" position="insideTop" fill="#fff" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                        <Bar dataKey="Folders" name="Folders" fill="#d97706" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Folders" position="insideTop" fill="#fff" fontSize={10} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card className="border-none bg-[#0f172a] text-white shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Activity {selectedYear !== 'all' && `(${selectedYear})`}</CardTitle>
                        <Clock className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentProcurements.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">No recent activities for {selectedYear !== 'all' ? selectedYear : 'this period'}</p>
                            ) : (
                                recentProcurements.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-[#1e293b] hover:bg-[#253045] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${p.status === 'active' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                {p.status === 'active' ? <FileText className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{p.prNumber}</p>
                                                <p className="text-xs text-slate-400 line-clamp-1">{p.description}</p>
                                                <p className="text-xs text-blue-400 mt-1">Location: {getLocationString(p)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-medium ${p.status === 'active' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {p.status === 'active' ? 'Borrowed' : 'Archived'}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
