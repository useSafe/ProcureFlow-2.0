import { db } from './firebase';
import { ref, set } from 'firebase/database';

// Helper function to hash password (same as in AuthContext)
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

export const initializeDummyData = async () => {
    try {
        console.log('🚀 Initializing dummy data...');

        // Create sample users
        const users = [
            {
                id: 'user-001',
                name: 'John Smith',
                email: 'john.smith@company.com',
                passwordHash: await hashPassword('SecurePass123!'),
            },
            {
                id: 'user-002',
                name: 'Sarah Johnson',
                email: 'sarah.johnson@company.com',
                passwordHash: await hashPassword('SecurePass123!'),
            },
            {
                id: 'user-003',
                name: 'Michael Chen',
                email: 'michael.chen@company.com',
                passwordHash: await hashPassword('SecurePass123!'),
            },
        ];

        // Save users to Firebase
        for (const user of users) {
            await set(ref(db, `users/${user.id}`), user);
        }
        console.log('✅ Created 3 sample users');

        // Create Shelves (Tier 1 - stored in cabinets table)
        const shelves = [
            {
                id: 'shelf-001',
                code: 'S1',
                name: 'Main Storage Shelf',
                description: 'Primary storage location',
                createdAt: new Date('2024-01-15').toISOString(),
            },
            {
                id: 'shelf-002',
                code: 'S2',
                name: 'Archive Shelf',
                description: 'Long-term storage',
                createdAt: new Date('2024-01-20').toISOString(),
            },
            {
                id: 'shelf-003',
                code: 'S3',
                name: 'Active Projects Shelf',
                description: 'Current ongoing projects',
                createdAt: new Date('2024-02-01').toISOString(),
            },
        ];

        for (const shelf of shelves) {
            await set(ref(db, `cabinets/${shelf.id}`), shelf);
        }
        console.log('✅ Created 3 shelves');

        // Create Cabinets (Tier 2 - stored in shelves table)
        const cabinets = [
            // S1 cabinets
            { id: 'cabinet-001', cabinetId: 'shelf-001', code: 'C1', name: 'Cabinet A', createdAt: new Date('2024-01-16').toISOString() },
            { id: 'cabinet-002', cabinetId: 'shelf-001', code: 'C2', name: 'Cabinet B', createdAt: new Date('2024-01-16').toISOString() },
            { id: 'cabinet-003', cabinetId: 'shelf-001', code: 'C3', name: 'Cabinet C', createdAt: new Date('2024-01-16').toISOString() },
            // S2 cabinets
            { id: 'cabinet-004', cabinetId: 'shelf-002', code: 'C1', name: 'Archive Cabinet A', createdAt: new Date('2024-01-21').toISOString() },
            { id: 'cabinet-005', cabinetId: 'shelf-002', code: 'C2', name: 'Archive Cabinet B', createdAt: new Date('2024-01-21').toISOString() },
            // S3 cabinets
            { id: 'cabinet-006', cabinetId: 'shelf-003', code: 'C1', name: 'Project Cabinet', createdAt: new Date('2024-02-02').toISOString() },
        ];

        for (const cabinet of cabinets) {
            await set(ref(db, `shelves/${cabinet.id}`), cabinet);
        }
        console.log('✅ Created 6 cabinets');

        // Create Folders (Tier 3)
        const folders = [
            // Cabinet C1 (S1) folders
            { id: 'folder-001', shelfId: 'cabinet-001', code: 'F1', name: 'IT Equipment', createdAt: new Date('2024-01-17').toISOString() },
            { id: 'folder-002', shelfId: 'cabinet-001', code: 'F2', name: 'Office Supplies', createdAt: new Date('2024-01-17').toISOString() },
            { id: 'folder-003', shelfId: 'cabinet-001', code: 'F3', name: 'Furniture', createdAt: new Date('2024-01-17').toISOString() },
            // Cabinet C2 (S1) folders
            { id: 'folder-004', shelfId: 'cabinet-002', code: 'F1', name: 'Maintenance', createdAt: new Date('2024-01-18').toISOString() },
            { id: 'folder-005', shelfId: 'cabinet-002', code: 'F2', name: 'Utilities', createdAt: new Date('2024-01-18').toISOString() },
            // Cabinet C3 (S1) folders
            { id: 'folder-006', shelfId: 'cabinet-003', code: 'F1', name: 'Marketing Materials', createdAt: new Date('2024-01-19').toISOString() },
            { id: 'folder-007', shelfId: 'cabinet-003', code: 'F2', name: 'Training Resources', createdAt: new Date('2024-01-19').toISOString() },
            // Archive folders
            { id: 'folder-008', shelfId: 'cabinet-004', code: 'F1', name: '2023 Records', createdAt: new Date('2024-01-22').toISOString() },
            { id: 'folder-009', shelfId: 'cabinet-004', code: 'F2', name: '2022 Records', createdAt: new Date('2024-01-22').toISOString() },
            // Project folders
            { id: 'folder-010', shelfId: 'cabinet-006', code: 'F1', name: 'Q1 Projects', createdAt: new Date('2024-02-03').toISOString() },
            { id: 'folder-011', shelfId: 'cabinet-006', code: 'F2', name: 'Q2 Projects', createdAt: new Date('2024-02-03').toISOString() },
        ];

        for (const folder of folders) {
            await set(ref(db, `folders/${folder.id}`), folder);
        }
        console.log('✅ Created 11 folders');

        // Create Procurement Records
        const procurements = [
            {
                id: 'proc-001',
                prNumber: 'PR-2024-001',
                description: 'Dell Latitude 5540 Laptops (Qty: 10) for IT Department',
                dateAdded: new Date('2024-01-20').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-001',
                folderId: 'folder-001',
                status: 'active',
                urgencyLevel: 'high',
                tags: ['IT', 'Hardware', 'Laptops'],
                createdBy: 'john.smith@company.com',
                createdByName: 'John Smith',
                createdAt: new Date('2024-01-20T09:30:00').toISOString(),
                updatedAt: new Date('2024-01-20T09:30:00').toISOString(),
            },
            {
                id: 'proc-002',
                prNumber: 'PR-2024-002',
                description: 'Office Chairs - Ergonomic (Qty: 25)',
                dateAdded: new Date('2024-01-22').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-001',
                folderId: 'folder-003',
                status: 'active',
                urgencyLevel: 'medium',
                tags: ['Furniture', 'Office'],
                createdBy: 'sarah.johnson@company.com',
                createdByName: 'Sarah Johnson',
                editedBy: 'john.smith@company.com',
                editedByName: 'John Smith',
                lastEditedAt: new Date('2024-01-23T14:20:00').toISOString(),
                createdAt: new Date('2024-01-22T10:15:00').toISOString(),
                updatedAt: new Date('2024-01-23T14:20:00').toISOString(),
            },
            {
                id: 'proc-003',
                prNumber: 'PR-2024-003',
                description: 'Printer Toner Cartridges - HP LaserJet (Qty: 50)',
                dateAdded: new Date('2024-01-25').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-001',
                folderId: 'folder-002',
                status: 'active',
                urgencyLevel: 'low',
                tags: ['Office Supplies', 'Consumables'],
                createdBy: 'michael.chen@company.com',
                createdByName: 'Michael Chen',
                createdAt: new Date('2024-01-25T11:00:00').toISOString(),
                updatedAt: new Date('2024-01-25T11:00:00').toISOString(),
            },
            {
                id: 'proc-004',
                prNumber: 'PR-2024-004',
                description: 'HVAC Maintenance Service Contract - Annual',
                dateAdded: new Date('2024-01-28').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-002',
                folderId: 'folder-004',
                status: 'active',
                urgencyLevel: 'critical',
                tags: ['Maintenance', 'HVAC', 'Service'],
                createdBy: 'john.smith@company.com',
                createdByName: 'John Smith',
                editedBy: 'sarah.johnson@company.com',
                editedByName: 'Sarah Johnson',
                lastEditedAt: new Date('2024-01-29T09:45:00').toISOString(),
                createdAt: new Date('2024-01-28T08:30:00').toISOString(),
                updatedAt: new Date('2024-01-29T09:45:00').toISOString(),
            },
            {
                id: 'proc-005',
                prNumber: 'PR-2024-005',
                description: 'Marketing Brochures - Product Launch (Qty: 5000)',
                dateAdded: new Date('2024-02-01').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-003',
                folderId: 'folder-006',
                status: 'active',
                urgencyLevel: 'high',
                tags: ['Marketing', 'Print Materials'],
                createdBy: 'sarah.johnson@company.com',
                createdByName: 'Sarah Johnson',
                createdAt: new Date('2024-02-01T13:20:00').toISOString(),
                updatedAt: new Date('2024-02-01T13:20:00').toISOString(),
            },
            {
                id: 'proc-006',
                prNumber: 'PR-2024-006',
                description: 'Employee Training Program - Leadership Development',
                dateAdded: new Date('2024-02-03').toISOString(),
                cabinetId: 'shelf-001',
                shelfId: 'cabinet-003',
                folderId: 'folder-007',
                status: 'active',
                urgencyLevel: 'medium',
                tags: ['Training', 'HR', 'Development'],
                createdBy: 'michael.chen@company.com',
                createdByName: 'Michael Chen',
                editedBy: 'michael.chen@company.com',
                editedByName: 'Michael Chen',
                lastEditedAt: new Date('2024-02-04T10:30:00').toISOString(),
                createdAt: new Date('2024-02-03T15:45:00').toISOString(),
                updatedAt: new Date('2024-02-04T10:30:00').toISOString(),
            },
            {
                id: 'proc-007',
                prNumber: 'PR-2023-089',
                description: 'Network Infrastructure Upgrade - Archived Project',
                dateAdded: new Date('2023-12-15').toISOString(),
                cabinetId: 'shelf-002',
                shelfId: 'cabinet-004',
                folderId: 'folder-008',
                status: 'archived',
                urgencyLevel: 'low',
                tags: ['IT', 'Network', 'Infrastructure'],
                createdBy: 'john.smith@company.com',
                createdByName: 'John Smith',
                createdAt: new Date('2023-12-15T10:00:00').toISOString(),
                updatedAt: new Date('2023-12-15T10:00:00').toISOString(),
            },
            {
                id: 'proc-008',
                prNumber: 'PR-2024-007',
                description: 'Q1 Software Licenses - Microsoft 365 (Qty: 100)',
                dateAdded: new Date('2024-02-05').toISOString(),
                cabinetId: 'shelf-003',
                shelfId: 'cabinet-006',
                folderId: 'folder-010',
                status: 'active',
                urgencyLevel: 'critical',
                tags: ['Software', 'Licenses', 'Q1'],
                createdBy: 'john.smith@company.com',
                createdByName: 'John Smith',
                createdAt: new Date('2024-02-05T09:00:00').toISOString(),
                updatedAt: new Date('2024-02-05T09:00:00').toISOString(),
            },
        ];

        for (const procurement of procurements) {
            await set(ref(db, `procurements/${procurement.id}`), procurement);
        }
        console.log('✅ Created 8 procurement records');

        console.log('');
        console.log('🎉 Dummy data initialization complete!');
        console.log('');
        console.log('📝 Sample User Credentials:');
        console.log('   Email: john.smith@company.com');
        console.log('   Email: sarah.johnson@company.com');
        console.log('   Email: michael.chen@company.com');
        console.log('   Password (all users): SecurePass123!');
        console.log('');

        return true;
    } catch (error) {
        console.error('❌ Error initializing dummy data:', error);
        return false;
    }
};
