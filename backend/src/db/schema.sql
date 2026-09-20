-- Supabase / PostgreSQL Database Schema for INE Product Price Tracker

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    slug TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    sku TEXT,
    description TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    current_price NUMERIC,
    current_mrp NUMERIC,
    discount_pct INTEGER,
    current_stock INTEGER,
    in_stock BOOLEAN DEFAULT TRUE,
    scrape_interval_hours INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped_at TIMESTAMPTZ,
    last_scrape_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Price and Stock History Table
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    mrp NUMERIC,
    discount_pct INTEGER,
    stock INTEGER NOT NULL,
    in_stock BOOLEAN DEFAULT TRUE,
    currency TEXT DEFAULT 'INR',
    format_type TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Honest Per-Product Scrape Logs Table
CREATE TABLE IF NOT EXISTS scrape_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    max_attempts INTEGER DEFAULT 6,
    status TEXT NOT NULL, -- 'success', 'retried', 'failed'
    response_time_ms INTEGER,
    http_status INTEGER,
    error_message TEXT,
    raw_extracted JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alerts Table (Price Drops, Restocks)
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT,
    alert_type TEXT NOT NULL, -- 'price_drop', 'back_in_stock'
    old_value NUMERIC,
    new_value NUMERIC,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product ON scrape_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC);
