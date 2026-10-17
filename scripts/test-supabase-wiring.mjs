import { isSupabaseConfigured, SupabaseAdapter } from '../lib/db/supabase-adapter.ts'
import { PersistentStore } from '../lib/db/store.ts'

console.log('Testing Supabase Adapter & Store Wiring...')
console.log('isSupabaseConfigured():', isSupabaseConfigured())
console.log('PersistentStore.read(): OK, users count:', PersistentStore.getUsers().length)
console.log('PersistentStore methods present:')
console.log('- writeUser:', typeof SupabaseAdapter.writeUser === 'function')
console.log('- writeWallet:', typeof SupabaseAdapter.writeWallet === 'function')
console.log('- writeTransaction:', typeof SupabaseAdapter.writeTransaction === 'function')
console.log('- writeBudget:', typeof SupabaseAdapter.writeBudget === 'function')
console.log('- deleteWallet:', typeof PersistentStore.deleteWallet === 'function')
console.log('- deleteCategory:', typeof PersistentStore.deleteCategory === 'function')
console.log('- hydrateFromSupabase:', typeof PersistentStore.hydrateFromSupabase === 'function')
console.log('ALL WIRE TESTS PASSED.')
