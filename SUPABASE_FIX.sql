-- This SQL script will fix the schema issue with the tickets table
-- Run this in your Supabase SQL Editor

-- First, check if the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE tickets (
          id text primary key,
          itsm_ref text,
          priority text not null,
          status text not null,
          site_id text not null,
          is_dependent boolean not null default false,
          opened_at timestamptz not null,
          neutralized_at timestamptz,
          closed_at timestamptz,
          sla_deadline_at timestamptz,
          exclusion_cause text,
          recurrence_flag boolean not null default false,
          description text not null,
          intervention_type text,
          created_at timestamptz default now()
        );
    ELSE
        -- Table exists, add missing columns if they don't exist
        
        -- Add closed_at if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tickets' 
            AND column_name = 'closed_at'
        ) THEN
            ALTER TABLE tickets ADD COLUMN closed_at timestamptz;
        END IF;
        
        -- Add neutralized_at if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tickets' 
            AND column_name = 'neutralized_at'
        ) THEN
            ALTER TABLE tickets ADD COLUMN neutralized_at timestamptz;
        END IF;
        
        -- Add sla_deadline_at if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tickets' 
            AND column_name = 'sla_deadline_at'
        ) THEN
            ALTER TABLE tickets ADD COLUMN sla_deadline_at timestamptz;
        END IF;
        
        -- Add intervention_type if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'tickets' 
            AND column_name = 'intervention_type'
        ) THEN
            ALTER TABLE tickets ADD COLUMN intervention_type text;
        END IF;
        
    END IF;
END $$;

-- Create or replace RLS policies
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON tickets;
DROP POLICY IF EXISTS "Allow public select" ON tickets;
DROP POLICY IF EXISTS "Allow public update" ON tickets;
DROP POLICY IF EXISTS "Allow public delete" ON tickets;

-- Create new policies (permissive for development - restrict in production)
CREATE POLICY "Allow public insert" 
ON tickets FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow public select" 
ON tickets FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow public update" 
ON tickets FOR UPDATE 
TO public 
USING (true);

CREATE POLICY "Allow public delete" 
ON tickets FOR DELETE 
TO public 
USING (true);
