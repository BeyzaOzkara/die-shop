/*
  # Die Shop Management System - Complete Database Schema

  ## Overview
  This migration creates a comprehensive die shop management system with:
  - Die and component type definitions
  - Component BOM (routing templates)
  - Work Centers (machines/stations)
  - Production Orders and Work Orders
  - Work Order Operations tracking
  - Steel stock and lot management
  - Stock movement tracking

  ## New Tables

  ### 1. work_centers
  Represents machines and work stations in the die shop
  - `id` (uuid, primary key)
  - `name` (text) - e.g., "Testere 1", "CNC Torna 3"
  - `type` (text) - e.g., "Cutting", "Turning", "Milling"
  - `status` (text) - "Available", "Busy", "Under Maintenance"
  - `location` (text, optional)
  - `capacity_per_hour` (numeric, optional)
  - `setup_time_minutes` (numeric, optional)
  - `cost_per_hour` (numeric, optional)
  - `created_at` (timestamptz)

  ### 2. component_types
  Defines types of components (Havuz, Destek, Kapak, Bolster, Köprü, Dişi)
  - `id` (uuid, primary key)
  - `name` (text) - Component type name in Turkish
  - `die_type` (text) - "Solid" or "Portol"
  - `description` (text, optional)
  - `created_at` (timestamptz)

  ### 3. component_bom
  Routing templates for each component type (operation sequences only)
  - `id` (uuid, primary key)
  - `component_type_id` (uuid, foreign key)
  - `sequence_number` (integer) - Operation order
  - `operation_name` (text) - e.g., "Kesim", "Tornalama"
  - `work_center_id` (uuid, foreign key) - Default work center
  - `estimated_duration_minutes` (numeric, optional)
  - `notes` (text, optional)
  - `created_at` (timestamptz)

  ### 4. steel_stock_items
  Defines steel products by Alloy + Diameter combination
  - `id` (uuid, primary key)
  - `alloy` (text) - Steel alloy type
  - `diameter_mm` (numeric) - Diameter in millimeters
  - `description` (text, optional)
  - `created_at` (timestamptz)

  ### 5. lots
  Individual steel blocks with certificate information
  - `id` (uuid, primary key)
  - `stock_item_id` (uuid, foreign key)
  - `certificate_number` (text)
  - `supplier` (text)
  - `length_mm` (numeric) - Total length
  - `gross_weight_kg` (numeric) - Total weight
  - `remaining_kg` (numeric) - Available stock
  - `certificate_file_url` (text, optional) - PDF link
  - `received_date` (date)
  - `created_at` (timestamptz)

  ### 6. dies
  Final product definitions
  - `id` (uuid, primary key)
  - `die_number` (text, unique) - Unique identifier
  - `die_diameter_mm` (numeric)
  - `total_package_length_mm` (numeric)
  - `die_type` (text) - "Solid" or "Portol"
  - `design_file_url` (text, optional)
  - `status` (text) - "Draft", "Ready", "In Production", "Completed"
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. die_components
  Selected components for each die with steel specifications
  - `id` (uuid, primary key)
  - `die_id` (uuid, foreign key)
  - `component_type_id` (uuid, foreign key)
  - `stock_item_id` (uuid, foreign key) - Selected steel
  - `package_length_mm` (numeric)
  - `theoretical_consumption_kg` (numeric) - Auto-calculated
  - `created_at` (timestamptz)

  ### 8. production_orders
  One per die, contains overall die production information
  - `id` (uuid, primary key)
  - `die_id` (uuid, foreign key)
  - `order_number` (text, unique)
  - `status` (text) - "Waiting", "In Progress", "Completed", "Cancelled"
  - `started_at` (timestamptz, optional)
  - `completed_at` (timestamptz, optional)
  - `created_at` (timestamptz)

  ### 9. work_orders
  One per die component, tracks component production
  - `id` (uuid, primary key)
  - `production_order_id` (uuid, foreign key)
  - `die_component_id` (uuid, foreign key)
  - `order_number` (text, unique)
  - `status` (text) - "Waiting", "In Progress", "Completed"
  - `theoretical_consumption_kg` (numeric)
  - `actual_consumption_kg` (numeric, optional)
  - `lot_id` (uuid, foreign key, optional) - Selected after completion
  - `started_at` (timestamptz, optional)
  - `completed_at` (timestamptz, optional)
  - `created_at` (timestamptz)

  ### 10. work_order_operations
  Individual operation steps for each work order
  - `id` (uuid, primary key)
  - `work_order_id` (uuid, foreign key)
  - `sequence_number` (integer)
  - `operation_name` (text)
  - `work_center_id` (uuid, foreign key)
  - `operator_name` (text, optional)
  - `status` (text) - "Waiting", "In Progress", "Completed"
  - `estimated_duration_minutes` (numeric, optional)
  - `started_at` (timestamptz, optional)
  - `completed_at` (timestamptz, optional)
  - `notes` (text, optional)
  - `created_at` (timestamptz)

  ### 11. stock_movements
  Tracks all stock reductions when work orders are completed
  - `id` (uuid, primary key)
  - `lot_id` (uuid, foreign key)
  - `work_order_id` (uuid, foreign key)
  - `quantity_kg` (numeric) - Amount consumed
  - `movement_date` (timestamptz)
  - `notes` (text, optional)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read all data
  - Authenticated users can insert/update/delete all data (can be refined per role)

  ## Indexes
  - Foreign keys indexed for performance
  - Unique constraints on die_number, order_numbers
  - Composite unique constraint on alloy + diameter
*/

-- Create work_centers table
CREATE TABLE IF NOT EXISTS work_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'Available',
  location text,
  capacity_per_hour numeric,
  setup_time_minutes numeric,
  cost_per_hour numeric,
  created_at timestamptz DEFAULT now()
);

-- Create component_types table
CREATE TABLE IF NOT EXISTS component_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  die_type text NOT NULL CHECK (die_type IN ('Solid', 'Portol')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create component_bom table (routing templates)
CREATE TABLE IF NOT EXISTS component_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type_id uuid NOT NULL REFERENCES component_types(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  operation_name text NOT NULL,
  work_center_id uuid NOT NULL REFERENCES work_centers(id),
  estimated_duration_minutes numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(component_type_id, sequence_number)
);

-- Create steel_stock_items table
CREATE TABLE IF NOT EXISTS steel_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alloy text NOT NULL,
  diameter_mm numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alloy, diameter_mm)
);

-- Create lots table
CREATE TABLE IF NOT EXISTS lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES steel_stock_items(id) ON DELETE RESTRICT,
  certificate_number text NOT NULL,
  supplier text NOT NULL,
  length_mm numeric NOT NULL,
  gross_weight_kg numeric NOT NULL,
  remaining_kg numeric NOT NULL,
  certificate_file_url text,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create dies table
CREATE TABLE IF NOT EXISTS dies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  die_number text UNIQUE NOT NULL,
  die_diameter_mm numeric NOT NULL,
  total_package_length_mm numeric NOT NULL,
  die_type text NOT NULL CHECK (die_type IN ('Solid', 'Portol')),
  design_file_url text,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create die_components table
CREATE TABLE IF NOT EXISTS die_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  die_id uuid NOT NULL REFERENCES dies(id) ON DELETE CASCADE,
  component_type_id uuid NOT NULL REFERENCES component_types(id) ON DELETE RESTRICT,
  stock_item_id uuid NOT NULL REFERENCES steel_stock_items(id) ON DELETE RESTRICT,
  package_length_mm numeric NOT NULL,
  theoretical_consumption_kg numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create production_orders table
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  die_id uuid NOT NULL REFERENCES dies(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Waiting',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  die_component_id uuid NOT NULL REFERENCES die_components(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Waiting',
  theoretical_consumption_kg numeric NOT NULL,
  actual_consumption_kg numeric,
  lot_id uuid REFERENCES lots(id) ON DELETE RESTRICT,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create work_order_operations table
CREATE TABLE IF NOT EXISTS work_order_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  operation_name text NOT NULL,
  work_center_id uuid NOT NULL REFERENCES work_centers(id),
  operator_name text,
  status text NOT NULL DEFAULT 'Waiting',
  estimated_duration_minutes numeric,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(work_order_id, sequence_number)
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
  quantity_kg numeric NOT NULL,
  movement_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_component_bom_component_type ON component_bom(component_type_id);
CREATE INDEX IF NOT EXISTS idx_component_bom_work_center ON component_bom(work_center_id);
CREATE INDEX IF NOT EXISTS idx_lots_stock_item ON lots(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_die_components_die ON die_components(die_id);
CREATE INDEX IF NOT EXISTS idx_die_components_component_type ON die_components(component_type_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_die ON production_orders(die_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_production_order ON work_orders(production_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_lot ON work_orders(lot_id);
CREATE INDEX IF NOT EXISTS idx_work_order_operations_work_order ON work_order_operations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_operations_work_center ON work_order_operations(work_center_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot ON stock_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_work_order ON stock_movements(work_order_id);

-- Enable Row Level Security
ALTER TABLE work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE steel_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dies ENABLE ROW LEVEL SECURITY;
ALTER TABLE die_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can read work_centers"
  ON work_centers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert work_centers"
  ON work_centers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work_centers"
  ON work_centers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete work_centers"
  ON work_centers FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read component_types"
  ON component_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert component_types"
  ON component_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update component_types"
  ON component_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete component_types"
  ON component_types FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read component_bom"
  ON component_bom FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert component_bom"
  ON component_bom FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update component_bom"
  ON component_bom FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete component_bom"
  ON component_bom FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read steel_stock_items"
  ON steel_stock_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert steel_stock_items"
  ON steel_stock_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update steel_stock_items"
  ON steel_stock_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete steel_stock_items"
  ON steel_stock_items FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read lots"
  ON lots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lots"
  ON lots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lots"
  ON lots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lots"
  ON lots FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read dies"
  ON dies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dies"
  ON dies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dies"
  ON dies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dies"
  ON dies FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read die_components"
  ON die_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert die_components"
  ON die_components FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update die_components"
  ON die_components FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete die_components"
  ON die_components FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read production_orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert production_orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update production_orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete production_orders"
  ON production_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read work_orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert work_orders"
  ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work_orders"
  ON work_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete work_orders"
  ON work_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read work_order_operations"
  ON work_order_operations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert work_order_operations"
  ON work_order_operations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work_order_operations"
  ON work_order_operations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete work_order_operations"
  ON work_order_operations FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read stock_movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (true);