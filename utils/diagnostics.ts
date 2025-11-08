import { supabase } from '@/utils/supabase';
import { Platform } from 'react-native';

export async function runDiagnostics() {
  console.log('\n========================================');
  console.log('🔍 INICIANDO DIAGNÓSTICO DE CONEXIÓN');
  console.log('========================================\n');

  console.log('📱 Platform:', Platform.OS);
  console.log('🌐 Supabase URL:', 'https://lgizmslffyaeeyogcdmm.supabase.co');
  console.log('');

  console.log('🔄 Testing connection to Supabase...');

  try {
    console.log('\n1️⃣ Testing tickets_v1 table...');
    const ticketsTest = await supabase
      .from('tickets_v1')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    
    if (ticketsTest.error) {
      console.error('❌ tickets_v1 ERROR:', ticketsTest.error);
    } else {
      console.log('✅ tickets_v1 OK - Count:', ticketsTest.count);
    }
  } catch (err: any) {
    console.error('❌ tickets_v1 EXCEPTION:', err?.message);
    console.error('Stack:', err?.stack);
  }

  try {
    console.log('\n2️⃣ Testing cuadrillas table...');
    const cuadrillasTest = await supabase
      .from('cuadrillas')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    
    if (cuadrillasTest.error) {
      console.error('❌ cuadrillas ERROR:', cuadrillasTest.error);
    } else {
      console.log('✅ cuadrillas OK - Count:', cuadrillasTest.count);
    }
  } catch (err: any) {
    console.error('❌ cuadrillas EXCEPTION:', err?.message);
  }

  try {
    console.log('\n3️⃣ Testing sites_v1 table...');
    const sitesTest = await supabase
      .from('sites_v1')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    
    if (sitesTest.error) {
      console.error('❌ sites_v1 ERROR:', sitesTest.error);
    } else {
      console.log('✅ sites_v1 OK - Count:', sitesTest.count);
    }
  } catch (err: any) {
    console.error('❌ sites_v1 EXCEPTION:', err?.message);
  }

  try {
    console.log('\n4️⃣ Testing usuario table...');
    const usuarioTest = await supabase
      .from('usuario')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    
    if (usuarioTest.error) {
      console.error('❌ usuario ERROR:', usuarioTest.error);
    } else {
      console.log('✅ usuario OK - Count:', usuarioTest.count);
    }
  } catch (err: any) {
    console.error('❌ usuario EXCEPTION:', err?.message);
  }

  console.log('\n5️⃣ Testing network connectivity...');
  try {
    const response = await fetch('https://lgizmslffyaeeyogcdmm.supabase.co/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnaXptc2xmZnlhZWV5b2djZG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjMyNjIsImV4cCI6MjA3NjYzOTI2Mn0.kUC9Vu1_Ox2jDKKE221wz2PcaM6BmIzV-KDAN6SYR2I'
      }
    });
    console.log('✅ Network fetch OK - Status:', response.status);
  } catch (err: any) {
    console.error('❌ Network fetch FAILED:', err?.message);
    console.error('❌ This means there is a network connectivity issue');
    console.error('❌ Possible causes:');
    console.error('   - No internet connection');
    console.error('   - Firewall blocking Supabase');
    console.error('   - CORS issues (web only)');
    console.error('   - Wrong Supabase URL or API key');
  }

  console.log('\n========================================');
  console.log('🏁 DIAGNÓSTICO COMPLETADO');
  console.log('========================================\n');
}
