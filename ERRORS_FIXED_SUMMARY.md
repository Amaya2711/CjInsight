# Errors Fixed - Summary

## Date: 2025-10-24

### Issues Resolved

#### 1. Duplicate Key Error in FlatList
**Error**: `Encountered two children with the same key, ''`

**Cause**: Some tickets from Supabase had empty or duplicate IDs, causing React's FlatList to throw key uniqueness errors.

**Fix**: Updated both FlatList components in `app/(tabs)/tickets.tsx` to use fallback keys:
- Active tickets: `keyExtractor={(item, index) => item.id || `ticket-${index}`}`
- Completed tickets: `keyExtractor={(item, index) => item.id || `completed-${index}`}`

**Files Modified**: 
- `app/(tabs)/tickets.tsx` (lines 386, 432)

---

#### 2. Supabase Schema Error - Missing Column `codigo_site`
**Error**: `Could not find the 'codigo_site' column of 'tickets_v1' in the schema cache`

**Cause**: The app was trying to insert tickets into Supabase using old column names that don't exist in the `tickets_v1` table.

**Fix**: Updated `store/useAppStore.ts` to use correct column names from `tickets_v1`:

**Old columns (that don't exist)**:
- `folio`
- `codigo_site`
- `descripcion`
- `tipo_falla`
- `detalle`
- `severidad`
- `estado`
- `resuelto_at`
- `creado_por`

**New columns (that exist)**:
- `ticket_source`
- `site_id`
- `site_name`
- `fault_level`
- `task_category`
- `task_subcategory`
- `attention_type`
- `fault_occur_time`
- `complete_time`

**Files Modified**:
- `store/useAppStore.ts` (lines 346-360)

---

### Testing Recommendations

1. **Test ticket creation**:
   - Create a new ticket as an office user
   - Verify it appears in the list without key errors
   - Check Supabase dashboard to confirm the ticket was inserted successfully

2. **Test ticket listing**:
   - Navigate to tickets tab
   - Verify all tickets display without duplicate key warnings
   - Test pagination and search
   - Switch between Active and Neutralizados tabs

3. **Check console**:
   - No more "Encountered two children with the same key" errors
   - No more "codigo_site" column errors
   - Should see success messages: `[Supabase] ✅ Ticket inserted successfully`

---

### Additional Notes

- The ticket service (`services/tickets.ts`) already had the correct column mappings
- The issue was specifically in the store's ticket creation code
- All new tickets will now sync properly to Supabase using the correct schema
