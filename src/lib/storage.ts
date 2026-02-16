import { Cabinet, Shelf, Folder, Box, Division, Procurement, User, LocationStats } from '@/types/procurement';
import { db } from './firebase';
import { ref, get, set, remove, push, child, onValue, update } from 'firebase/database';

// ========== User Storage ==========
// We'll keep user storage local for now as it's just a simple simulation
// In a real app, this would use Firebase Auth
export const getStoredUser = (): User | null => {
    const data = localStorage.getItem('filetracker_user');
    return data ? JSON.parse(data) : null;
};

export const setStoredUser = (user: User | null): void => {
    if (user) {
        // Security: Do not store password or role in local storage
        const { password, role, ...safeUser } = user;
        localStorage.setItem('filetracker_user', JSON.stringify(safeUser));
    } else {
        localStorage.removeItem('filetracker_user');
    }
};

// ========== Realtime Subscriptions ==========
// These helpers allow components to subscribe to data changes

export const onCabinetsChange = (callback: (cabinets: Cabinet[]) => void) => {
    const cabinetsRef = ref(db, 'cabinets');
    return onValue(cabinetsRef, (snapshot) => {
        const data = snapshot.val();
        const cabinets = data ? Object.values(data) as Cabinet[] : [];
        callback(cabinets);
    });
};

export const onShelvesChange = (callback: (shelves: Shelf[]) => void) => {
    const shelvesRef = ref(db, 'shelves');
    return onValue(shelvesRef, (snapshot) => {
        const data = snapshot.val();
        const shelves = data ? Object.values(data) as Shelf[] : [];
        callback(shelves);
    });
};

export const onFoldersChange = (callback: (folders: Folder[]) => void) => {
    const foldersRef = ref(db, 'folders');
    return onValue(foldersRef, (snapshot) => {
        const data = snapshot.val();
        const folders = data ? Object.values(data) as Folder[] : [];
        callback(folders);
    });
};

export const onProcurementsChange = (callback: (procurements: Procurement[]) => void) => {
    const procurementsRef = ref(db, 'procurements');
    return onValue(procurementsRef, (snapshot) => {
        const data = snapshot.val();
        const procurements = data ? Object.values(data) as Procurement[] : [];
        callback(procurements);
    });
};

export const onBoxesChange = (callback: (boxes: Box[]) => void) => {
    const boxesRef = ref(db, 'boxes');
    return onValue(boxesRef, (snapshot) => {
        const data = snapshot.val();
        const boxes = data ? Object.values(data) as Box[] : [];
        callback(boxes);
    });
};

export const onDivisionsChange = (callback: (divisions: Division[]) => void) => {
    const divisionsRef = ref(db, 'divisions');
    return onValue(divisionsRef, (snapshot) => {
        const data = snapshot.val();
        const divisions = data ? Object.values(data) as Division[] : [];
        callback(divisions);
    });
};

// ========== FETCH (Promise-based for one-time reads) ==========

export const getCabinets = async (): Promise<Cabinet[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'cabinets'));
    if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Cabinet[];
    }
    return [];
};

export const getShelves = async (): Promise<Shelf[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'shelves'));
    if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Shelf[];
    }
    return [];
};

export const getFolders = async (): Promise<Folder[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'folders'));
    if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Folder[];
    }
    return [];
};

export const getProcurements = async (): Promise<Procurement[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'procurements'));
    if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Procurement[];
    }
    return [];
};

export const getBoxes = async (): Promise<Box[]> => {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'boxes'));
    if (snapshot.exists()) {
        return Object.values(snapshot.val()) as Box[];
    }
    return [];
};

// ========== WRITE OPERATIONS ==========

// --- Cabinet ---
export const addCabinet = async (name: string, code: string, description?: string): Promise<Cabinet> => {
    const id = crypto.randomUUID();
    const newCabinet: Cabinet = {
        id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim(),
        createdAt: new Date().toISOString(),
    };
    await set(ref(db, 'cabinets/' + id), newCabinet);
    return newCabinet;
};

export const updateCabinet = async (id: string, updates: Partial<Cabinet>): Promise<void> => {
    await update(ref(db, 'cabinets/' + id), updates);
};

export const deleteCabinet = async (id: string): Promise<void> => {
    // Check for procurements
    const procurements = await getProcurements();
    const hasFiles = procurements.some(p => p.cabinetId === id);
    if (hasFiles) {
        throw new Error("Cannot delete Cabinet: It contains active records. Please move or delete them first.");
    }

    // Also delete all shelves and folders in this cabinet
    // Note: In a real backend this should be a transaction or cloud function.
    // Client-side cascading delete is risky but sufficient for this demo.

    // 1. Get Shelves to delete
    const shelves = await getShelves();
    const cabinetShelves = shelves.filter(s => s.cabinetId === id);

    // 2. Delete Shelves (which will delete folders)
    for (const shelf of cabinetShelves) {
        await deleteShelf(shelf.id);
    }

    // 3. Delete Cabinet
    await remove(ref(db, 'cabinets/' + id));
};

// --- Shelf ---
export const addShelf = async (cabinetId: string, name: string, code: string, description?: string): Promise<Shelf> => {
    const id = crypto.randomUUID();
    const newShelf: Shelf = {
        id,
        cabinetId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim(),
        createdAt: new Date().toISOString(),
    };
    await set(ref(db, 'shelves/' + id), newShelf);
    return newShelf;
};

export const updateShelf = async (id: string, updates: Partial<Shelf>): Promise<void> => {
    await update(ref(db, 'shelves/' + id), updates);
};

export const deleteShelf = async (id: string): Promise<void> => {
    // Check for procurements
    const procurements = await getProcurements();
    const hasFiles = procurements.some(p => p.shelfId === id);
    if (hasFiles) {
        throw new Error("Cannot delete Shelf: It contains active records. Please move or delete them first.");
    }

    // 1. Get Folders
    const folders = await getFolders();
    const shelfFolders = folders.filter(f => f.shelfId === id);

    // 2. Delete Folders
    for (const folder of shelfFolders) {
        await deleteFolder(folder.id);
    }

    // 3. Delete Shelf
    await remove(ref(db, 'shelves/' + id));
};

// --- Folder ---
export const addFolder = async (shelfId: string, name: string, code: string, description?: string, color?: string): Promise<Folder> => {
    const id = crypto.randomUUID();
    const newFolder: Folder = {
        id,
        shelfId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim(),
        color: color || '#FF6B6B',
        createdAt: new Date().toISOString(),
    };
    await set(ref(db, 'folders/' + id), newFolder);
    return newFolder;
};

export const updateFolder = async (id: string, updates: Partial<Folder>): Promise<void> => {
    await update(ref(db, 'folders/' + id), updates);
};

export const deleteFolder = async (id: string): Promise<void> => {
    // Check for procurements
    const procurements = await getProcurements();
    const hasFiles = procurements.some(p => p.folderId === id);
    if (hasFiles) {
        throw new Error("Cannot delete Folder: It contains active records. Please move or delete them first.");
    }
    await remove(ref(db, 'folders/' + id));
};

// --- Box ---
export const addBox = async (name: string, code: string, description?: string): Promise<Box> => {
    const id = crypto.randomUUID();
    const newBox: Box = {
        id,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim(),
        createdAt: new Date().toISOString(),
    };
    await set(ref(db, 'boxes/' + id), newBox);
    return newBox;
};

export const updateBox = async (id: string, updates: Partial<Box>): Promise<void> => {
    await update(ref(db, 'boxes/' + id), updates);
};

export const deleteBox = async (id: string): Promise<void> => {
    // Check for procurements
    const procurements = await getProcurements();
    const hasFiles = procurements.some(p => p.boxId === id);
    if (hasFiles) {
        throw new Error("Cannot delete Box: It contains active records. Please move or delete them first.");
    }
    await remove(ref(db, 'boxes/' + id));
};

// --- Division ---
export const addDivision = async (name: string, abbreviation: string): Promise<Division> => {
    const id = crypto.randomUUID();
    const newDivision: Division = {
        id,
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
    };
    await set(ref(db, 'divisions/' + id), newDivision);
    return newDivision;
};

export const updateDivision = async (id: string, updates: Partial<Division>): Promise<void> => {
    await update(ref(db, 'divisions/' + id), updates);
};

export const deleteDivision = async (id: string): Promise<void> => {
    // Optional: Check if used in procurements (though currently we verify via cascading delete logic usually)
    // For now, allow delete, but maybe warn user in UI.
    await remove(ref(db, 'divisions/' + id));
};

// --- Stack Number Logic ---

const recalculateStackNumbers = async (folderId?: string, boxId?: string): Promise<void> => {
    if (!folderId && !boxId) return;

    // Get all procurements
    const allProcurements = await getProcurements();

    // Filter by container (Folder OR Box)
    let containerProcurements: Procurement[] = [];
    if (folderId) {
        containerProcurements = allProcurements.filter(p => p.folderId === folderId);
    } else if (boxId) {
        containerProcurements = allProcurements.filter(p => p.boxId === boxId);
    }

    // Filter for those that are "In Stack" (Archived/Available)
    // Borrowed files (Active) are NOT in the physical stack ordering
    const stackFiles = containerProcurements
        .filter(p => p.status === 'archived')
        .sort((a, b) => {
            // Sort by stackOrderDate if available, else dateAdded
            const dateA = a.stackOrderDate || new Date(a.dateAdded).getTime();
            const dateB = b.stackOrderDate || new Date(b.dateAdded).getTime();
            return dateA - dateB;
        });

    // Update stack numbers
    const updates: Record<string, any> = {};

    // 1. Update Stack Files: Assign 1, 2, 3...
    stackFiles.forEach((p, index) => {
        const newStackNumber = index + 1;
        if (p.stackNumber !== newStackNumber) {
            updates[`procurements/${p.id}/stackNumber`] = newStackNumber;
        }
        // Ensure stackOrderDate is set if missing (to preserve order)
        if (!p.stackOrderDate) {
            updates[`procurements/${p.id}/stackOrderDate`] = new Date(p.dateAdded).getTime();
        }
    });

    // 2. Update Borrowed Files: Remove stack number
    const borrowedFiles = containerProcurements.filter(p => p.status === 'active');
    borrowedFiles.forEach(p => {
        if (p.stackNumber !== undefined && p.stackNumber !== null) {
            updates[`procurements/${p.id}/stackNumber`] = null;
        }
    });

    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
    }
};

// --- Procurement ---
export const addProcurement = async (
    procurement: Omit<Procurement, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>,
    userEmail: string,
    userName: string
): Promise<Procurement> => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Sanitize the object to remove undefined values
    const safeProcurement = JSON.parse(JSON.stringify(procurement)); // Simplest way to strip undefined

    const newProcurement: Procurement = {
        ...safeProcurement,
        id,
        createdBy: userEmail,
        createdByName: userName,
        createdAt: now,
        updatedAt: now,
        // If adding directly to stack (archived), set stackOrderDate
        ...(safeProcurement.status === 'archived' ? { stackOrderDate: Date.now() } : {}),
    };

    await set(ref(db, 'procurements/' + id), newProcurement);

    // Recalculate stack if added to a folder or box
    if (newProcurement.folderId) {
        await recalculateStackNumbers(newProcurement.folderId, undefined);
    } else if (newProcurement.boxId) {
        await recalculateStackNumbers(undefined, newProcurement.boxId);
    }

    return newProcurement;
};

export const updateProcurement = async (
    id: string,
    updates: Partial<Procurement>,
    userEmail?: string,
    userName?: string
): Promise<void> => {
    // Fetch current state to check for status changes
    // Need to do this to handle stack logic correctly
    // Optimization: In a real app backend would handle this trigger.
    const currentProcurementSnapshot = await get(child(ref(db), `procurements/${id}`));
    const currentProcurement = currentProcurementSnapshot.val() as Procurement;

    // Sanitize updates to remove undefined
    const safeUpdates = JSON.parse(JSON.stringify(updates));

    const updatePayload: any = {
        ...safeUpdates,
        updatedAt: new Date().toISOString()
    };

    // Logic for Status Change (Borrowed <-> Returned)
    if (currentProcurement && updates.status && updates.status !== currentProcurement.status) {
        if (updates.status === 'archived') {
            // Returning to stack: Add to end of queue
            updatePayload.stackOrderDate = Date.now();
        } else {
            // Borrowing: Removed from stack (handled by recalculate, implies loss of position)
            updatePayload.stackOrderDate = null;
        }
    }

    // Add editor information if user info is provided
    if (userEmail && userName) {
        updatePayload.editedBy = userEmail;
        updatePayload.editedByName = userName;
        updatePayload.lastEditedAt = new Date().toISOString();
    }

    await update(ref(db, 'procurements/' + id), updatePayload);

    // Trigger recalculation if folder or box involved
    const folderId = updates.folderId || currentProcurement?.folderId;
    const boxId = updates.boxId || currentProcurement?.boxId;

    if (folderId) {
        await recalculateStackNumbers(folderId, undefined);
        // If moving between folders
        if (updates.folderId && currentProcurement?.folderId && updates.folderId !== currentProcurement.folderId) {
            await recalculateStackNumbers(currentProcurement.folderId, undefined);
        }
    }

    if (boxId) {
        await recalculateStackNumbers(undefined, boxId);
        // If moving between boxes
        if (updates.boxId && currentProcurement?.boxId && updates.boxId !== currentProcurement.boxId) {
            await recalculateStackNumbers(undefined, currentProcurement.boxId);
        }
    }
};

export const deleteProcurement = async (id: string): Promise<void> => {
    const currentProcurementSnapshot = await get(child(ref(db), `procurements/${id}`));
    const currentProcurement = currentProcurementSnapshot.val() as Procurement;

    await remove(ref(db, 'procurements/' + id));

    if (currentProcurement?.folderId) {
        await recalculateStackNumbers(currentProcurement.folderId, undefined);
    }
    if (currentProcurement?.boxId) {
        await recalculateStackNumbers(undefined, currentProcurement.boxId);
    }
};

// ========== Statistics ==========
export const getLocationStats = async (): Promise<LocationStats[]> => {
    const cabinets = await getCabinets();
    const procurements = await getProcurements();

    return cabinets
        .map(cabinet => ({
            cabinetId: cabinet.id,
            cabinetName: cabinet.name,
            count: procurements.filter(p => p.cabinetId === cabinet.id).length,
        }))
        .filter(stat => stat.count > 0)
        .sort((a, b) => b.count - a.count);
};

// ========== Initialization ==========
export const initializeDemoData = (): void => {
    // Blank initialization as requested
    console.log("Firebase initialized. No demo data added.");
};

// ========== User Management ==========

export const onUsersChange = (callback: (users: User[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const users = data ? Object.values(data) as User[] : [];
        callback(users);
    });
};

export const addUser = async (user: User): Promise<void> => {
    // Generate ID if not provided, but usually provided by caller or randomUUID
    // We expect user object to be fully formed except maybe ID if we generate it here
    const userId = user.id || crypto.randomUUID();
    const newUser = { ...user, id: userId, createdAt: new Date().toISOString() };
    await set(ref(db, `users/${userId}`), newUser);
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    await update(ref(db, `users/${id}`), updates);
};

export const deleteUser = async (id: string): Promise<void> => {
    await remove(ref(db, `users/${id}`));
};

export const ensureAdminUser = async () => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    let adminExists = false;

    if (snapshot.exists()) {
        const users = Object.values(snapshot.val()) as User[];
        // Check for admin email (case insensitive)
        if (users.some(u => u.email.toLowerCase() === 'admin@gmail.com')) {
            adminExists = true;
        }
    }

    if (!adminExists) {
        const adminUser: User = {
            id: crypto.randomUUID(),
            name: 'System Admin',
            email: 'admin@gmail.com',
            password: 'Cosmiano123@',
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString()
        };
        await set(ref(db, `users/${adminUser.id}`), adminUser);
        console.log('Seeded Admin User: admin@gmail.com');
    }
};
