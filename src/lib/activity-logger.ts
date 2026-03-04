import { db } from './firebase';
import { ref, push, set, onValue, query, orderByChild, limitToLast, get, update } from 'firebase/database';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActivityAction =
    | 'login'
    | 'logout'
    | 'add'
    | 'edit'
    | 'delete';

export type ActivityEntity =
    | 'account'
    | 'division'
    | 'folder'
    | 'cabinet'    // Drawer (Tier 1)
    | 'drawer'     // Cabinet (Tier 2 / Shelf)
    | 'box'
    | 'file'       // Procurement record
    | 'system';

export interface ActivityLog {
    id: string;
    action: ActivityAction;
    entity: ActivityEntity;
    entityName: string;          // Human-readable name of what was affected
    userEmail: string;
    userName: string;
    timestamp: string;           // ISO string
    details?: string;            // Optional extra detail
}

// ── Internal write helper ──────────────────────────────────────────────────────

export const logActivity = async (
    action: ActivityAction,
    entity: ActivityEntity,
    entityName: string,
    userEmail: string,
    userName: string,
    details?: string
): Promise<void> => {
    try {
        const logsRef = ref(db, 'activity_logs');
        const newLogRef = push(logsRef);
        const log: ActivityLog = {
            id: newLogRef.key || crypto.randomUUID(),
            action,
            entity,
            entityName,
            userEmail,
            userName,
            timestamp: new Date().toISOString(),
            ...(details ? { details } : {}),
        };
        await set(newLogRef, log);

        // Auto-cleanup: Keep only youngest 500 logs
        try {
            const snap = await get(logsRef);
            if (snap.exists()) {
                const allLogs = snap.val();
                const keys = Object.keys(allLogs);
                if (keys.length > 500) {
                    const sorted = Object.entries(allLogs).sort((a: any, b: any) =>
                        new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime()
                    );
                    const toDelete = sorted.slice(0, keys.length - 500);
                    const updates: any = {};
                    toDelete.forEach(([k]) => { updates[k] = null; });
                    await update(logsRef, updates);
                }
            }
        } catch (cleanupErr) {
            console.warn('[ActivityLogger] Failed to cleanup old logs:', cleanupErr);
        }
    } catch (err) {
        // Never let logging failure break the main operation
        console.warn('[ActivityLogger] Failed to write log:', err);
    }
};

// ── Realtime subscription ──────────────────────────────────────────────────────

export const onActivityLogsChange = (
    callback: (logs: ActivityLog[]) => void,
    limit = 500
) => {
    const logsRef = query(
        ref(db, 'activity_logs'),
        orderByChild('timestamp'),
        limitToLast(limit)
    );
    return onValue(logsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            callback([]);
            return;
        }
        // Convert object → array, sort newest first
        const logs: ActivityLog[] = Object.values(data) as ActivityLog[];
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(logs);
    });
};

// ── Label helpers (used in UI) ─────────────────────────────────────────────────

export const ACTION_LABELS: Record<ActivityAction, string> = {
    login: 'Logged In',
    logout: 'Logged Out',
    add: 'Added',
    edit: 'Edited',
    delete: 'Deleted',
};

export const ACTION_COLORS: Record<ActivityAction, string> = {
    login: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    logout: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    add: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    edit: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    delete: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export const ENTITY_LABELS: Record<ActivityEntity, string> = {
    account: 'Account',
    division: 'Division',
    folder: 'Folder',
    cabinet: 'Drawer',
    drawer: 'Cabinet',
    box: 'Box',
    file: 'File (Procurement)',
    system: 'System',
};
