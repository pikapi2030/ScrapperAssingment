const fs = require('fs');
const path = require('path');

// Polyfill WebSocket for Node.js <= 20 environments so @supabase/supabase-js initializes cleanly
if (!globalThis.WebSocket) {
    globalThis.WebSocket = class {};
}

const { createClient } = require('@supabase/supabase-js');

// Check for Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Support both new Supabase keys (sb_publishable_...) and legacy anon JWTs (eyJ...)
const isValidSupabaseKey = Boolean(
    supabaseKey &&
    (supabaseKey.startsWith('sb_') || supabaseKey.startsWith('eyJ')) &&
    !supabaseKey.includes('your_supabase') &&
    !supabaseKey.includes('placeholder') &&
    supabaseKey.length > 25
);

const isSupabaseConfigured = Boolean(supabaseUrl && isValidSupabaseKey);

let supabase = null;
if (isSupabaseConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[DB] Connected to Supabase PostgreSQL at', supabaseUrl);
    } catch (err) {
        console.warn('[DB] Failed to initialize Supabase client:', err.message);
    }
} else {
    console.log('[DB] Supabase credentials not set or not a valid JWT key. Using persistent local store (backend/data/db.json).');
}

// Local persistent store fallback
const LOCAL_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, 'db.json');

function ensureLocalDb() {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
        fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
        const initial = {
            products: [],
            price_history: [],
            scrape_logs: [],
            alerts: []
        };
        fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }
}

function readLocalDb() {
    ensureLocalDb();
    try {
        const data = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { products: [], price_history: [], scrape_logs: [], alerts: [] };
    }
}

function writeLocalDb(data) {
    ensureLocalDb();
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const db = {
    isSupabase: () => isSupabaseConfigured && Boolean(supabase),

    // ================= PRODUCT METHODS =================
    async getTrackedProducts() {
        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }

        const data = readLocalDb();
        return data.products.filter(p => p.is_active);
    },

    async getProductById(id) {
        const numericId = Number(id);
        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', numericId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        }

        const data = readLocalDb();
        return data.products.find(p => p.id === numericId) || null;
    },

    async upsertTrackedProduct(product) {
        const now = new Date().toISOString();
        const payload = {
            id: Number(product.id),
            slug: product.slug || '',
            name: product.name,
            brand: product.brand || '',
            category: product.category || '',
            sku: product.sku || '',
            description: product.description || '',
            specs: product.specs || {},
            current_price: product.current_price !== undefined ? product.current_price : null,
            current_mrp: product.current_mrp !== undefined ? product.current_mrp : null,
            discount_pct: product.discount_pct !== undefined ? product.discount_pct : null,
            current_stock: product.current_stock !== undefined ? product.current_stock : null,
            in_stock: product.in_stock !== undefined ? product.in_stock : true,
            scrape_interval_hours: product.scrape_interval_hours || 2,
            is_active: true,
            updated_at: now
        };

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('products')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        const idx = local.products.findIndex(p => p.id === payload.id);
        if (idx >= 0) {
            local.products[idx] = { ...local.products[idx], ...payload };
        } else {
            payload.created_at = now;
            local.products.push(payload);
        }
        writeLocalDb(local);
        return payload;
    },

    async updateProductScrapeOutcome(id, { price, mrp, discount_pct, stock, in_stock, status }) {
        const now = new Date().toISOString();
        const numericId = Number(id);

        if (this.isSupabase()) {
            const updates = {
                last_scraped_at: now,
                last_scrape_status: status,
                updated_at: now
            };
            if (price !== undefined && price !== null) updates.current_price = price;
            if (mrp !== undefined && mrp !== null) updates.current_mrp = mrp;
            if (discount_pct !== undefined && discount_pct !== null) updates.discount_pct = discount_pct;
            if (stock !== undefined && stock !== null) updates.current_stock = stock;
            if (in_stock !== undefined) updates.in_stock = in_stock;

            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', numericId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        const p = local.products.find(x => x.id === numericId);
        if (p) {
            p.last_scraped_at = now;
            p.last_scrape_status = status;
            p.updated_at = now;
            if (price !== undefined && price !== null) p.current_price = price;
            if (mrp !== undefined && mrp !== null) p.current_mrp = mrp;
            if (discount_pct !== undefined && discount_pct !== null) p.discount_pct = discount_pct;
            if (stock !== undefined && stock !== null) p.current_stock = stock;
            if (in_stock !== undefined) p.in_stock = in_stock;
            writeLocalDb(local);
        }
        return p;
    },

    async updateScrapeInterval(id, intervalHours) {
        const numericId = Number(id);
        const hours = Math.max(1, Number(intervalHours) || 2);

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('products')
                .update({ scrape_interval_hours: hours, updated_at: new Date().toISOString() })
                .eq('id', numericId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        const p = local.products.find(x => x.id === numericId);
        if (p) {
            p.scrape_interval_hours = hours;
            p.updated_at = new Date().toISOString();
            writeLocalDb(local);
        }
        return p;
    },

    async untrackProduct(id) {
        const numericId = Number(id);

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('products')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', numericId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        const p = local.products.find(x => x.id === numericId);
        if (p) {
            p.is_active = false;
            p.updated_at = new Date().toISOString();
            writeLocalDb(local);
        }
        return p;
    },

    // ================= PRICE HISTORY =================
    async recordPriceHistory(entry) {
        const row = {
            product_id: Number(entry.product_id),
            price: Number(entry.price),
            mrp: entry.mrp ? Number(entry.mrp) : null,
            discount_pct: entry.discount_pct !== undefined ? Number(entry.discount_pct) : null,
            stock: Number(entry.stock),
            in_stock: Boolean(entry.in_stock),
            currency: entry.currency || 'INR',
            format_type: entry.format_type || 'standard',
            scraped_at: entry.scraped_at || new Date().toISOString()
        };

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('price_history')
                .insert([row])
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        row.id = Date.now() + Math.floor(Math.random() * 1000);
        local.price_history.push(row);
        writeLocalDb(local);
        return row;
    },

    async getPriceHistory(productId, limit = 100) {
        const numericId = Number(productId);

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('price_history')
                .select('*')
                .eq('product_id', numericId)
                .order('scraped_at', { ascending: true })
                .limit(limit);
            if (error) throw error;
            return data || [];
        }

        const local = readLocalDb();
        return local.price_history
            .filter(h => h.product_id === numericId)
            .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at))
            .slice(-limit);
    },

    // ================= SCRAPE LOGS =================
    async recordScrapeLog(log) {
        const row = {
            product_id: Number(log.product_id),
            attempt_number: Number(log.attempt_number || 1),
            max_attempts: Number(log.max_attempts || 6),
            status: log.status, // 'success', 'retried', 'failed'
            response_time_ms: Number(log.response_time_ms || 0),
            http_status: log.http_status ? Number(log.http_status) : null,
            error_message: log.error_message || null,
            raw_extracted: log.raw_extracted || null,
            created_at: new Date().toISOString()
        };

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('scrape_logs')
                .insert([row])
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        row.id = Date.now() + Math.floor(Math.random() * 1000);
        local.scrape_logs.push(row);
        writeLocalDb(local);
        return row;
    },

    async getScrapeLogs(productId = null, limit = 50) {
        if (this.isSupabase()) {
            let query = supabase
                .from('scrape_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (productId) {
                query = query.eq('product_id', Number(productId));
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }

        const local = readLocalDb();
        let logs = local.scrape_logs;
        if (productId) {
            logs = logs.filter(l => l.product_id === Number(productId));
        }
        return logs
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    },

    // ================= ALERTS =================
    async createAlert(alert) {
        const row = {
            product_id: Number(alert.product_id),
            product_name: alert.product_name,
            alert_type: alert.alert_type, // 'price_drop', 'back_in_stock'
            old_value: alert.old_value !== undefined ? Number(alert.old_value) : null,
            new_value: alert.new_value !== undefined ? Number(alert.new_value) : null,
            message: alert.message,
            is_read: false,
            created_at: new Date().toISOString()
        };

        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('alerts')
                .insert([row])
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        row.id = Date.now() + Math.floor(Math.random() * 1000);
        local.alerts.push(row);
        writeLocalDb(local);
        return row;
    },

    async getAlerts(unreadOnly = false) {
        if (this.isSupabase()) {
            let query = supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false });
            if (unreadOnly) {
                query = query.eq('is_read', false);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }

        const local = readLocalDb();
        let alerts = local.alerts;
        if (unreadOnly) {
            alerts = alerts.filter(a => !a.is_read);
        }
        return alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    async markAlertRead(id) {
        const numericId = Number(id);
        if (this.isSupabase()) {
            const { data, error } = await supabase
                .from('alerts')
                .update({ is_read: true })
                .eq('id', numericId)
                .select()
                .single();
            if (error) throw error;
            return data;
        }

        const local = readLocalDb();
        const a = local.alerts.find(x => x.id === numericId);
        if (a) {
            a.is_read = true;
            writeLocalDb(local);
        }
        return a;
    }
};

module.exports = db;
