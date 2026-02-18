import { Procurement } from '@/types/procurement';

export interface ProcessStep {
    key: string;
    label: string;
    dependencies: string[];
}

/**
 * SVP Process Steps with dependencies
 */
export const SVP_PROCESS_STEPS: ProcessStep[] = [
    { key: 'receivedPrDate', label: 'Received PR for Action', dependencies: [] },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', dependencies: ['receivedPrDate'] },
    { key: 'publishedDate', label: 'Published', dependencies: ['prDeliberatedDate'] },
    { key: 'rfqCanvassDate', label: 'RFQ for Canvass', dependencies: ['publishedDate'] },
    { key: 'rfqOpeningDate', label: 'RFQ Opening', dependencies: ['rfqCanvassDate'] },
    { key: 'bacResolutionDate', label: 'BAC Resolution', dependencies: ['rfqOpeningDate'] },
    { key: 'forwardedGsdDate', label: 'Forwarded GSD for P.O.', dependencies: ['bacResolutionDate'] }
];

/**
 * Regular Bidding Process Steps with dependencies
 */
export const REGULAR_BIDDING_PROCESS_STEPS: ProcessStep[] = [
    { key: 'receivedPrDate', label: 'Received PR for Action', dependencies: [] },
    { key: 'prDeliberatedDate', label: 'PR Deliberated', dependencies: ['receivedPrDate'] },
    { key: 'publishedDate', label: 'Published', dependencies: ['prDeliberatedDate'] },
    { key: 'preBidDate', label: 'Pre-bid', dependencies: ['publishedDate'] },
    { key: 'bidOpeningDate', label: 'Bid Opening', dependencies: ['preBidDate'] },
    { key: 'bidEvaluationDate', label: 'Bid Evaluation Report', dependencies: ['bidOpeningDate'] },
    { key: 'bacResolutionDate', label: 'BAC Resolution', dependencies: ['bidEvaluationDate'] },
    { key: 'postQualDate', label: 'Post-Qualification', dependencies: ['bacResolutionDate'] },
    { key: 'postQualReportDate', label: 'Post-Qualification Report', dependencies: ['postQualDate'] },
    { key: 'forwardedOapiDate', label: 'Forwarded to OAPIA', dependencies: ['postQualReportDate'] },
    { key: 'noaDate', label: 'NOA (Notice of Award)', dependencies: ['forwardedOapiDate'] },
    { key: 'contractDate', label: 'Contract Date', dependencies: ['noaDate'] },
    { key: 'ntpDate', label: 'NTP (Notice to Proceed)', dependencies: ['contractDate'] }
];

/**
 * Get process steps based on procurement type
 */
export const getProcessSteps = (procurementType: string): ProcessStep[] => {
    if (procurementType === 'Regular Bidding') {
        return REGULAR_BIDDING_PROCESS_STEPS;
    }
    return SVP_PROCESS_STEPS;
};

/**
 * Validate if a process step can be enabled based on dependencies
 */
export const validateProcessStep = (
    procurement: Partial<Procurement>,
    stepKey: string,
    procurementType: string
): boolean => {
    const steps = getProcessSteps(procurementType);
    const step = steps.find(s => s.key === stepKey);

    if (!step) return true; // If step not found, allow it

    // Check if all dependencies are satisfied
    for (const depKey of step.dependencies) {
        if (!procurement[depKey as keyof Procurement]) {
            return false; // Dependency not met
        }
    }

    return true; // All dependencies met
};

/**
 * Check if a step should be disabled in the UI
 */
export const isStepDisabled = (
    procurement: Partial<Procurement>,
    stepKey: string,
    procurementType: string
): boolean => {
    return !validateProcessStep(procurement, stepKey, procurementType);
};

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Validate date sequence (ensure dates are in chronological order)
 */
export const validateDateSequence = (dates: Record<string, string | undefined>): ValidationResult => {
    const errors: string[] = [];
    const dateEntries = Object.entries(dates)
        .filter(([_, value]) => value)
        .map(([key, value]) => ({ key, date: new Date(value!) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Check if dates are in the expected order based on process steps
    // This is a simplified check - you might want to make it more sophisticated

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Get completion percentage for a procurement record
 */
export const getProcessCompletionPercentage = (
    procurement: Procurement,
    procurementType: string
): number => {
    const steps = getProcessSteps(procurementType);
    const completedSteps = steps.filter(step =>
        procurement[step.key as keyof Procurement]
    ).length;

    return Math.round((completedSteps / steps.length) * 100);
};

/**
 * Get next required step for a procurement
 */
export const getNextRequiredStep = (
    procurement: Procurement,
    procurementType: string
): ProcessStep | null => {
    const steps = getProcessSteps(procurementType);

    for (const step of steps) {
        // If this step is not completed
        if (!procurement[step.key as keyof Procurement]) {
            // Check if all dependencies are met
            const allDependenciesMet = step.dependencies.every(depKey =>
                procurement[depKey as keyof Procurement]
            );

            if (allDependenciesMet) {
                return step;
            }
        }
    }

    return null; // All steps completed or no valid next step
};
