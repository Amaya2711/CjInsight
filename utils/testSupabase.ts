import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('[Test] Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('tickets_v1')
      .select('*')
      .limit(1);

    if (error) {
      console.error('[Test] Connection test failed:', error);
      console.error('[Test] Error message:', error.message);
      console.error('[Test] Error details:', error.details);
      console.error('[Test] Error hint:', error.hint);
      return false;
    }

    console.log('[Test] Connection successful!');
    console.log('[Test] Data retrieved:', data);
    return true;
  } catch (err) {
    console.error('[Test] Exception during connection test:', err);
    return false;
  }
}
