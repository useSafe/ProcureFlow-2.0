import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cabinet, Shelf, Folder, Box, Procurement } from '@/types/procurement';
import { onCabinetsChange, onShelvesChange, onFoldersChange, onBoxesChange, onProcurementsChange } from '@/lib/storage';

interface DataContextType {
    cabinets: Cabinet[];
    shelves: Shelf[];
    folders: Folder[];
    boxes: Box[];
    procurements: Procurement[];
    loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [procurements, setProcurements] = useState<Procurement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubCabinets = onCabinetsChange(setCabinets);
        const unsubShelves = onShelvesChange(setShelves);
        const unsubFolders = onFoldersChange(setFolders);
        const unsubBoxes = onBoxesChange(setBoxes);
        const unsubProcurements = onProcurementsChange(setProcurements);

        // Simple loading simulation or wait for initial data
        // In real app, we'd check if data is loaded.
        // For now, we just give it a small timeout or assume loaded on first callback
        const timer = setTimeout(() => setLoading(false), 500);

        return () => {
            unsubCabinets();
            unsubShelves();
            unsubFolders();
            unsubBoxes();
            unsubProcurements();
            clearTimeout(timer);
        };
    }, []);

    return (
        <DataContext.Provider value={{ cabinets, shelves, folders, boxes, procurements, loading }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
