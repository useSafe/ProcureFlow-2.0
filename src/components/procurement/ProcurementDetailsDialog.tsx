import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Procurement } from '@/types/procurement';
import { format } from 'date-fns';
import { MapPin, Calendar, FileText, Activity, Layers, Tag, User, Loader2 } from 'lucide-react';

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

    const getCurrentStage = (p: Procurement) => {
        if (p.procurementType === 'SVP') {
            if (p.forwardedGsdDate) return 'Forwarded GSD for P.O.';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.rfqOpeningDate) return 'RFQ Opening';
            if (p.rfqCanvassDate) return 'RFQ for Canvass';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        } else {
            // Regular Bidding - Check in reverse chronological order (latest step first)
            if (p.awardedToDate) return 'Awarded to Supplier';
            if (p.forwardedOapiDate) return 'Forwarded to OAPIA';
            if (p.ntpDate) return 'NTP';
            if (p.contractDate) return 'Contract Date';
            if (p.noaDate) return 'NOA';
            if (p.postQualReportDate) return 'Post-Qualification Report';
            if (p.postQualDate) return 'Post-Qualification';
            if (p.bacResolutionDate) return 'BAC Resolution';
            if (p.bidEvaluationDate) return 'Bid Evaluation Report';
            if (p.bidOpeningDate) return 'Bid Opening';
            if (p.preBidDate) return 'Pre-bid';
            if (p.publishedDate) return 'Published';
            if (p.prDeliberatedDate) return 'PR Deliberated';
            if (p.receivedPrDate) return 'Received PR for Action';
            return 'Not yet Acted';
        }
    };

    // Determine Effective Status & Color (Sync with ProcurementList)
    const pStatus = procurement.procurementStatus || 'Not yet Acted';
    const currentStage = getCurrentStage(procurement);
    let effectiveStatus = pStatus;

    // Auto-In Progress Logic
    if ((effectiveStatus === 'Not yet Acted' || !effectiveStatus) && currentStage !== 'Not yet Acted' && currentStage !== 'Received PR for Action') {
        effectiveStatus = 'In Progress';
    }

    let statusColorClass = '';
    switch (effectiveStatus) {
        case 'Completed': statusColorClass = 'text-emerald-400'; break;
        case 'In Progress': statusColorClass = 'text-blue-400'; break;
        case 'Returned PR to EU': statusColorClass = 'text-purple-400'; break;
        case 'Failure': statusColorClass = 'text-red-400'; break;
        case 'Cancelled': statusColorClass = 'text-orange-400'; break;
        case 'Not yet Acted': default: statusColorClass = 'text-gray-400'; break;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl bg-[#0f172a] border-slate-800 text-white max-h-[90vh] overflow-y-auto block p-0">
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
                                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Process Status</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Activity className="h-4 w-4 text-slate-400" />
                                        <span className={`font-medium ${statusColorClass}`}>
                                            {effectiveStatus}
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

                            {/* Financial Information */}
                            {(procurement.abc || procurement.bidAmount || procurement.supplier) && (
                                <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Financial Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {procurement.abc && (
                                            <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-700">
                                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">ABC (Approved Budget)</label>
                                                <p className="text-lg font-bold text-emerald-400 font-mono">₱{parseFloat(procurement.abc).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        )}
                                        {procurement.bidAmount && (
                                            <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-700">
                                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Bid Amount (Contract Price)</label>
                                                <p className="text-lg font-bold text-blue-400 font-mono">₱{parseFloat(procurement.bidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        )}
                                        {procurement.supplier && (
                                            <div className="p-3 bg-[#1e293b]/50 rounded-lg border border-slate-700">
                                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Supplier / Awarded to</label>
                                                <p className="text-sm font-medium text-slate-200">{procurement.supplier}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Main Details */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold border-b border-slate-800 pb-2 mb-3">Description</h3>
                                    <p className="text-slate-200 leading-relaxed bg-[#1e293b] p-4 rounded-md text-sm border border-slate-700/50">
                                        {procurement.description}
                                    </p>
                                </div>

                                <div>
                                    <div className="border-b border-slate-800 pb-2 mb-3">
                                        <h3 className="text-lg font-semibold">Monitoring Process</h3>
                                        <p className="text-sm text-slate-400">Key dates and status.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Pre-Procurement */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                                                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Pre-Procurement</h4>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-500 block">Received PR</label>
                                                    <p className="font-mono text-sm text-slate-200">{formatDate(procurement.receivedPrDate)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-500 block">PR Deliberated</label>
                                                    <p className="font-mono text-sm text-slate-200">{formatDate(procurement.prDeliberatedDate)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-500 block">Published</label>
                                                    <p className="font-mono text-sm text-slate-200">{formatDate(procurement.publishedDate)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bidding / Canvass */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
                                                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                                                    {procurement.procurementType === 'Regular Bidding' ? 'Bidding Proper' : 'Canvassing'}
                                                </h4>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {procurement.procurementType === 'Regular Bidding' ? (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Pre-bid Conf</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.preBidDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Bid Opening</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.bidOpeningDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Bid Eval Report</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.bidEvaluationDate)}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">RFQ for Canvass</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.rfqCanvassDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">RFQ Opening</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.rfqOpeningDate)}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Qualification & Award */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                                                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Qualification & Award</h4>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {procurement.procurementType === 'Regular Bidding' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Post-Qual</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.postQualDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Post-Qual Report</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.postQualReportDate)}</p>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-500 block">BAC Resolution</label>
                                                    <p className="font-mono text-sm text-slate-200">{formatDate(procurement.bacResolutionDate)}</p>
                                                </div>

                                                {procurement.procurementType === 'Regular Bidding' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Notice of Award</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.noaDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Contract Date</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.contractDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">NTP</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.ntpDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">To OAPIA</label>
                                                            <p className="font-mono text-sm text-slate-200">{formatDate(procurement.forwardedOapiDate)}</p>
                                                        </div>
                                                    </>
                                                )}

                                                {procurement.procurementType === 'Regular Bidding' ? (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Awarded Date</label>
                                                            <p className="font-mono text-sm text-emerald-400 font-semibold">{formatDate(procurement.awardedToDate)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-slate-500 block">Supplier</label>
                                                            <p className="font-medium text-sm text-slate-200">{procurement.supplier || 'N/A'}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-500 block">To GSD</label>
                                                        <p className="font-mono text-sm text-slate-200">{formatDate(procurement.forwardedGsdDate)}</p>
                                                    </div>
                                                )}
                                            </div>
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

                                {/* Checklist Summary (Hide for special types) */}
                                {!['Attendance Sheets', 'Others'].includes(procurement.procurementType || '') && (
                                    <Card className="bg-[#1e293b] border-slate-700 mb-6">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-emerald-400" />
                                                Documents Handed Over
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[250px] pr-4">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    {/* LEFT COLUMN */}
                                                    <div className="flex-1 space-y-2">
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
                                                                <span className={`text-xs leading-tight ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                    ? 'text-slate-200'
                                                                    : 'text-slate-500'
                                                                    }`}>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* RIGHT COLUMN */}
                                                    <div className="flex-1 space-y-2">
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
                                                                <span className={`text-xs leading-tight ${procurement.checklist?.[item.key as keyof typeof procurement.checklist]
                                                                    ? 'text-slate-200'
                                                                    : 'text-slate-500'
                                                                    }`}>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
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
                </div >
            </DialogContent >
        </Dialog >
    );
};

export default ProcurementDetailsDialog;
