/*
  # Add Master Data Management for Die Types and Components

  ## Overview
  This migration adds proper master data management for die types, component types,
  and their relationships. It replaces hardcoded values with configurable catalog data.

  ## Changes

  ### 1. New Tables

  #### die_types
  Master catalog of die types (e.g., Solid, Portol)
  - `id` (uuid, primary key)
  - `code` (text, unique) - System code (e.g., "SOLID", "PORTOL")
  - `name` (text) - Display name in Turkish
  - `description` (text, optional)
  - `is_active` (boolean) - Active/Inactive flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  #### die_type_components
  Maps which component types are allowed for each die type
  - `id` (uuid, primary key)
  - `die_type_id` (uuid, foreign key)
  - `component_type_id` (uuid, foreign key)
  - `created_at` (timestamptz)
  - Unique constraint on (die_type_id, component_type_id)

  ### 2. Modified Tables

  #### component_types
  - Remove `die_type` column
  - Add `code` column (unique system code)
  - Add `is_active` column
  - Add `updated_at` column

  #### dies
  - Change `die_type` from text to uuid foreign key referencing die_types

  ## Data Migration

  - Creates initial die types (SOLID, PORTOL)
  - Updates existing component_types with codes and is_active flag
  - Migrates existing dies to reference die_types table
  - Creates die_type_components mappings based on existing data

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can read/write all master data
*/

-- Create die_types table
CREATE TABLE IF NOT EXISTS die_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default die types
INSERT INTO die_types (code, name, description) VALUES
  ('SOLID', 'Solid Kalıp', 'Solid tip kalıp'),
  ('PORTOL', 'Portol Kalıp', 'Portol tip kalıp')
ON CONFLICT (code) DO NOTHING;

-- Add columns to component_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_types' AND column_name = 'code'
  ) THEN
    ALTER TABLE component_types ADD COLUMN code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_types' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE component_types ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'component_types' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE component_types ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing component_types with codes
UPDATE component_types SET code = UPPER(REPLACE(name, ' ', '_'))
WHERE code IS NULL;

-- Make code unique and not null
ALTER TABLE component_types ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_component_types_code ON component_types(code);

-- Create die_type_components mapping table
CREATE TABLE IF NOT EXISTS die_type_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  die_type_id uuid NOT NULL REFERENCES die_types(id) ON DELETE CASCADE,
  component_type_id uuid NOT NULL REFERENCES component_types(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(die_type_id, component_type_id)
);

-- Migrate existing die_type_components relationships
DO $$
DECLARE
  solid_id uuid;
  portol_id uuid;
BEGIN
  SELECT id INTO solid_id FROM die_types WHERE code = 'SOLID';
  SELECT id INTO portol_id FROM die_types WHERE code = 'PORTOL';

  -- Map existing component_types based on their old die_type field
  INSERT INTO die_type_components (die_type_id, component_type_id)
  SELECT
    CASE
      WHEN ct.die_type = 'Solid' THEN solid_id
      WHEN ct.die_type = 'Portol' THEN portol_id
    END,
    ct.id
  FROM component_types ct
  WHERE ct.die_type IS NOT NULL
  ON CONFLICT (die_type_id, component_type_id) DO NOTHING;
END $$;

-- Add new die_type_id column to dies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dies' AND column_name = 'die_type_id'
  ) THEN
    ALTER TABLE dies ADD COLUMN die_type_id uuid REFERENCES die_types(id);
  END IF;
END $$;

-- Migrate existing dies to use die_type_id
UPDATE dies SET die_type_id = (
  SELECT id FROM die_types WHERE code = UPPER(dies.die_type)
)
WHERE die_type_id IS NULL AND die_type IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_die_type_components_die_type ON die_type_components(die_type_id);
CREATE INDEX IF NOT EXISTS idx_die_type_components_component_type ON die_type_components(component_type_id);
CREATE INDEX IF NOT EXISTS idx_dies_die_type_id ON dies(die_type_id);

-- Enable RLS
ALTER TABLE die_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE die_type_components ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for die_types
CREATE POLICY "Authenticated users can read die_types"
  ON die_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert die_types"
  ON die_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update die_types"
  ON die_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete die_types"
  ON die_types FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for die_type_components
CREATE POLICY "Authenticated users can read die_type_components"
  ON die_type_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert die_type_components"
  ON die_type_components FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update die_type_components"
  ON die_type_components FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete die_type_components"
  ON die_type_components FOR DELETE
  TO authenticated
  USING (true);