import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Procurement } from '@/types/procurement';
import { format } from 'date-fns';
import { MapPin, Calendar, FileText, Activity, Layers, Tag, User } from 'lucide-react';

interface ProcurementDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    procurement: Procurement | null;
    getLocationString: (p: Procurement) => string;
}

const ProcurementDetailsDialog: React.FC<ProcurementDetailsDialogProps> = ({
    open,
    onOpenChange,
    procurement,
    getLocationString,
}) => {
    if (!procurement) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'PPP');
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-[#0f172a] border-slate-800 text-white max-h-[90vh] overflow-y-auto block p-0">
                <div className="p-6">
                    <DialogHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    {procurement.prNumber}
                                    <Badge variant="outline" className={`${procurement.status === 'active'
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                        {procurement.status === 'active' ? 'Borrowed' : 'Archived'}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 mt-1">
                                    {procurement.projectName || 'No Project Name'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1">
                        <div className="space-y-6 py-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-800">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Division</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Layers className="h-4 w-4 text-blue-400" />
                                        <span>{procurement.division || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-800">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Type</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag className="h-4 w-4 text-purple-400" />
                                        <span>{procurement.procurementType || 'Regular Bidding'}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-800">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Progress</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Activity className="h-4 w-4 text-slate-400" />
                                        <span className={`font-medium ${procurement.progressStatus === 'Success' ? 'text-emerald-400' :
                                            procurement.progressStatus === 'Failed' ? 'text-red-400' :
                                                procurement.progressStatus === 'Cancelled' ? 'text-slate-400' :
                                                    'text-yellow-400'
                                            }`}>
                                            {procurement.progressStatus || 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-800">
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Location</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <MapPin className="h-4 w-4 text-pink-400" />
                                        <span className="truncate" title={getLocationString(procurement)}>
                                            {getLocationString(procurement)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Main Details */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold border-b border-slate-800 pb-2 mb-3">Description</h3>
                                    <p className="text-slate-200 leading-relaxed bg-[#1e293b] p-4 rounded-md text-sm border border-slate-700/50">
                                        {procurement.description}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold border-b border-slate-800 pb-2 mb-3">Timeline</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm text-slate-500">Date Added</label>
                                            <p className="font-mono text-slate-200">{formatDate(procurement.dateAdded)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-slate-500">Procurement Date</label>
                                            <p className="font-mono text-slate-200">{formatDate(procurement.procurementDate)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-slate-500">Disposal Date</label>
                                            <p className="font-mono text-orange-400">{formatDate(procurement.disposalDate)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Access Log / Borrow Info */}
                                {procurement.status === 'active' && (
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 mt-2">
                                        <h4 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Current Borrower Info
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Borrowed By:</span>
                                                <p className="font-medium text-slate-200">{procurement.borrowedBy || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Division:</span>
                                                <p className="font-medium text-slate-200">{procurement.borrowerDivision || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Date Borrowed:</span>
                                                <p className="font-medium text-slate-200">{formatDate(procurement.borrowedDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Return Info - Show if Archived and has return data */}
                                {procurement.status === 'archived' && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 mt-2">
                                        <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Return Information
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Returned By:</span>
                                                <p className="font-medium text-slate-200">{procurement.returnedBy || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Division:</span>
                                                <p className="font-medium text-slate-200">{procurement.borrowerDivision || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Date Returned:</span>
                                                <p className="font-medium text-slate-200">{formatDate(procurement.returnDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Checklist Summary - Documents Handed Over */}
                                {procurement.checklist && Object.keys(procurement.checklist).length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold border-b border-slate-800 pb-2 mb-3">Documents Handed Over</h3>

                                        {/* Checklist Container - Full Height */}
                                        <div className="pr-2">
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                                                {/* LEFT COLUMN */}
                                                <div className="space-y-3">
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
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/30 transition-colors">
                                                            <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : 'border-slate-600'
                                                                }`}>
                                                                {procurement.checklist?.[item.key as keyof typeof procurement.checklist] && (
                                                                    <span className="text-white text-[10px]">✓</span>
                                                                )}
                                                            </div>
                                                            <span className={`leading-tight ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                ? 'text-slate-200'
                                                                : 'text-slate-500'
                                                                }`}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* RIGHT COLUMN */}
                                                <div className="space-y-3">
                                                    {[
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
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/30 transition-colors">
                                                            <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : 'border-slate-600'
                                                                }`}>
                                                                {procurement.checklist?.[item.key as keyof typeof procurement.checklist] && (
                                                                    <span className="text-white text-[10px]">✓</span>
                                                                )}
                                                            </div>
                                                            <span className={`leading-tight ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                ? 'text-slate-200'
                                                                : 'text-slate-500'
                                                                }`}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add this CSS to your global styles or component */}
                                        <style jsx>{`
                                        .custom-scrollbar::-webkit-scrollbar {
                                            width: 8px;
                                        }
                                        .custom-scrollbar::-webkit-scrollbar-track {
                                            background: rgb(15 23 42 / 0.5);
                                            border-radius: 4px;
                                        }
                                        .custom-scrollbar::-webkit-scrollbar-thumb {
                                            background: rgb(71 85 105);
                                            border-radius: 4px;
                                        }
                                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                            background: rgb(100 116 139);
                                        }
                                    `}</style>
                                    </div>
                                )}

                                {/* Metadata Footer */}
                                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-500">
                                    <div>
                                        <span className="block font-semibold mb-1">Created By</span>
                                        <span>{procurement.createdByName || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="block font-semibold mb-1">Stack Number</span>
                                        <span className="font-mono">{procurement.stackNumber ? `#${procurement.stackNumber}` : 'N/A'}</span>
                                    </div>
                                    {procurement.status === 'active' && procurement.division && (
                                        <div>
                                            <span className="block font-semibold mb-1">Borrowed By Division</span>
                                            <span className="capitalize">{procurement.division}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-[#1e293b] border-slate-700 hover:bg-slate-800 text-white">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ProcurementDetailsDialog;
