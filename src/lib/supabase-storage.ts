import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'your-supabase-url';
const supabaseAnonKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseStorage {
  constructor(private table: string) {}

  // Fetch all records from the specified table
  async fetchAll() {
    const { data, error } = await supabase.from(this.table).select('*');
    if (error) throw error;
    return data;
  }

  // Add a new record to the specified table
  async addRecord(record: object) {
    const { data, error } = await supabase.from(this.table).insert([record]);
    if (error) throw error;
    return data;
  }

  // Update a record by ID
  async updateRecord(id: number, updates: object) {
    const { data, error } = await supabase.from(this.table).update(updates).match({ id });
    if (error) throw error;
    return data;
  }

  // Delete a record by ID
  async deleteRecord(id: number) {
    const { data, error } = await supabase.from(this.table).delete().match({ id });
    if (error) throw error;
    return data;
  }

  // Subscribe to real-time updates on the specified table
  subscribeToUpdates(callback: (payload: any) => void) {
    supabase
      .from(`${this.table}:*`)
      .on('*', (payload) => {
        callback(payload);
      })
      .subscribe();
  }
}

// Example Usage
const procurementStorage = new SupabaseStorage('procurements');
const categoriesStorage = new SupabaseStorage('categories');

// Use async functions for operations
async function demoOperations() {
  // Fetch procurements
  const procurements = await procurementStorage.fetchAll();
  
  // Add a new procurement
  await procurementStorage.addRecord({ name: 'New Procurement Item' });

  // Subscribe to real-time updates
  procurementStorage.subscribeToUpdates((payload) => {
    console.log('New update:', payload);
  });
}

demoOperations();
