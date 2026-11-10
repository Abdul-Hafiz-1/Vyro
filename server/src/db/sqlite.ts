import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

// Ensure DATA_DIR is always <repo_root>/server/data regardless of cwd
const cwd = process.cwd();
const DATA_DIR = cwd.endsWith('server')
  ? path.resolve(cwd, 'data')
  : path.resolve(cwd, 'server/data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'vyro.db');

export class SQLiteDatabase {
  public db: DatabaseSync;

  constructor(filePath: string = DB_PATH) {
    this.db = new DatabaseSync(filePath);
    this.configure();
    this.runMigrations();
  }

  private configure(): void {
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedMigrations = new Set<string>(
      (this.db.prepare('SELECT name FROM _migrations').all() as Array<{ name: string }>).map(r => r.name)
    );

    const migrations: Array<{ name: string; up: (db: DatabaseSync) => void }> = [
      {
        name: '001_initial_schema_v2',
        up: (db) => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT,
              display_name TEXT NOT NULL,
              username TEXT NOT NULL,
              avatar_url TEXT,
              bio TEXT,
              role TEXT NOT NULL DEFAULT 'buyer',
              capabilities TEXT NOT NULL,
              active_workspace TEXT NOT NULL DEFAULT 'buyer',
              onboarding_completed INTEGER NOT NULL DEFAULT 1,
              onboarding_step INTEGER NOT NULL DEFAULT 3,
              buyer_preferences TEXT,
              seller_profile TEXT,
              auto_approval_limit REAL NOT NULL DEFAULT 200,
              daily_budget_cap REAL NOT NULL DEFAULT 500,
              balance REAL NOT NULL DEFAULT 2500,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agents (
              id TEXT PRIMARY KEY,
              owner_id TEXT NOT NULL,
              business_name TEXT NOT NULL,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              capabilities TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active',
              verification_status TEXT NOT NULL DEFAULT 'community',
              catalog TEXT NOT NULL,
              pricing_constraints TEXT NOT NULL,
              policies TEXT,
              negotiation_strategy TEXT NOT NULL DEFAULT 'balanced',
              approval_policy TEXT NOT NULL DEFAULT 'explicit_human_required',
              instructions TEXT,
              communication_style TEXT DEFAULT 'concise',
              metrics TEXT,
              operator_name TEXT,
              operator_role TEXT,
              operator_location TEXT,
              rating REAL DEFAULT 5.0,
              review_count INTEGER DEFAULT 0,
              verified_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS listings (
              id TEXT PRIMARY KEY,
              seller_id TEXT NOT NULL,
              seller_agent_id TEXT,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              type TEXT NOT NULL DEFAULT 'service',
              asking_price REAL NOT NULL,
              floor_price REAL NOT NULL, -- STRICTLY PRIVATE TO SELLER
              currency TEXT NOT NULL DEFAULT 'USD',
              pricing_model TEXT NOT NULL DEFAULT 'fixed',
              delivery_days INTEGER NOT NULL DEFAULT 3,
              deliverables TEXT NOT NULL,
              images TEXT NOT NULL,
              is_negotiable INTEGER NOT NULL DEFAULT 1,
              status TEXT NOT NULL DEFAULT 'active',
              tags TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS requests (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              buyer_agent_id TEXT NOT NULL,
              raw_input TEXT NOT NULL,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              required_capabilities TEXT NOT NULL,
              deliverables TEXT NOT NULL,
              target_budget REAL NOT NULL,
              max_budget REAL NOT NULL, -- STRICTLY PRIVATE TO BUYER
              currency TEXT NOT NULL DEFAULT 'USD',
              deadline_days INTEGER NOT NULL DEFAULT 5,
              quality_requirements TEXT NOT NULL,
              additional_conditions TEXT,
              max_candidates INTEGER DEFAULT 3,
              status TEXT NOT NULL DEFAULT 'active',
              selected_seller_agent_ids TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS negotiations (
              id TEXT PRIMARY KEY,
              request_id TEXT NOT NULL,
              buyer_agent_id TEXT NOT NULL,
              seller_agent_id TEXT NOT NULL,
              buyer_user_id TEXT,
              seller_user_id TEXT,
              listing_id TEXT,
              status TEXT NOT NULL DEFAULT 'initiated',
              current_round INTEGER NOT NULL DEFAULT 1,
              max_rounds INTEGER NOT NULL DEFAULT 4,
              current_proposal TEXT,
              messages TEXT NOT NULL DEFAULT '[]',
              agreement_id TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS proposals (
              id TEXT PRIMARY KEY,
              negotiation_id TEXT NOT NULL,
              sender_agent_id TEXT NOT NULL,
              round INTEGER NOT NULL,
              price REAL NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              deliverables TEXT NOT NULL,
              delivery_days INTEGER NOT NULL,
              terms TEXT NOT NULL,
              valid_until TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at TEXT NOT NULL,
              FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evaluations (
              request_id TEXT PRIMARY KEY,
              evaluations TEXT NOT NULL,
              recommended_negotiation_id TEXT,
              summary_verdict TEXT NOT NULL,
              evaluated_at TEXT NOT NULL,
              FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_queue (
              id TEXT PRIMARY KEY,
              negotiation_id TEXT NOT NULL,
              request_id TEXT NOT NULL,
              seller_id TEXT NOT NULL,
              buyer_id TEXT NOT NULL,
              urgency TEXT NOT NULL DEFAULT 'medium',
              urgency_score REAL NOT NULL DEFAULT 0.5,
              ai_recommendation TEXT NOT NULL,
              confidence REAL NOT NULL,
              reasons TEXT NOT NULL,
              proposed_price REAL NOT NULL,
              buyer_max_budget REAL NOT NULL,
              seller_floor_price REAL NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              resolution_note TEXT,
              resolved_by TEXT,
              resolved_at TEXT,
              created_at TEXT NOT NULL,
              FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agreements (
              id TEXT PRIMARY KEY,
              negotiation_id TEXT NOT NULL,
              request_id TEXT NOT NULL,
              buyer_agent_id TEXT NOT NULL,
              seller_agent_id TEXT NOT NULL,
              buyer_user_id TEXT NOT NULL,
              seller_user_id TEXT,
              seller_business_name TEXT NOT NULL,
              final_price REAL NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              final_deliverables TEXT NOT NULL,
              delivery_days INTEGER NOT NULL,
              commercial_terms TEXT NOT NULL,
              human_approval_status TEXT NOT NULL DEFAULT 'approved',
              human_approved_at TEXT,
              seller_acceptance_status TEXT NOT NULL DEFAULT 'accepted',
              seller_accepted_at TEXT,
              rejection_reason TEXT,
              paypal_ready INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              agreement_id TEXT NOT NULL,
              negotiation_id TEXT NOT NULL,
              request_id TEXT NOT NULL,
              buyer_user_id TEXT NOT NULL,
              buyer_agent_name TEXT NOT NULL,
              seller_agent_id TEXT NOT NULL,
              seller_business_name TEXT NOT NULL,
              service_title TEXT NOT NULL,
              amount REAL NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              paypal_order_id TEXT,
              paypal_capture_id TEXT,
              paypal_payer_email TEXT,
              paypal_payer_name TEXT,
              payment_status TEXT NOT NULL DEFAULT 'completed',
              idempotency_key TEXT UNIQUE NOT NULL,
              created_at TEXT NOT NULL,
              completed_at TEXT,
              failure_reason TEXT,
              is_sandbox INTEGER NOT NULL DEFAULT 1,
              FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              action TEXT NOT NULL,
              policy_matched TEXT NOT NULL,
              decision TEXT NOT NULL,
              actor TEXT NOT NULL,
              confidence REAL,
              reasons TEXT NOT NULL DEFAULT '[]',
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tuning_overrides (
              id TEXT PRIMARY KEY,
              queue_item_id TEXT NOT NULL,
              original_recommendation TEXT NOT NULL,
              override_action TEXT NOT NULL,
              override_note TEXT NOT NULL,
              suggested_policy_change TEXT,
              status TEXT NOT NULL DEFAULT 'logged',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activity_events (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              agent_id TEXT,
              negotiation_id TEXT,
              transaction_id TEXT,
              amount REAL,
              currency TEXT,
              severity TEXT NOT NULL DEFAULT 'info',
              timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              type TEXT NOT NULL,
              link_url TEXT,
              metadata TEXT,
              read INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviews (
              id TEXT PRIMARY KEY,
              transaction_id TEXT NOT NULL,
              listing_id TEXT,
              seller_id TEXT NOT NULL,
              buyer_id TEXT NOT NULL,
              rating REAL NOT NULL,
              feedback TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
          `);
        }
      },
      {
        name: '002_decision_model_v1',
        up: (db) => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS decisions (
              id TEXT PRIMARY KEY,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              status TEXT NOT NULL,
              reasons TEXT NOT NULL,
              recommendation TEXT NOT NULL,
              signals TEXT NOT NULL,
              confidence REAL NOT NULL,
              decided_by TEXT NOT NULL,
              undo_until TEXT,
              expires_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
          `);

          try {
            db.exec(`ALTER TABLE users ADD COLUMN is_automation_paused INTEGER NOT NULL DEFAULT 0;`);
          } catch (e) {
            // Column may already exist
          }

          try {
            db.exec(`ALTER TABLE review_queue ADD COLUMN expires_at TEXT;`);
          } catch (e) {
            // Column may already exist
          }

          try {
            db.exec(`ALTER TABLE review_queue ADD COLUMN decision_id TEXT;`);
          } catch (e) {
            // Column may already exist
          }
        }
      },
      {
        name: '003_rules_and_memory',
        up: (db) => {
          db.exec(`
            CREATE TABLE IF NOT EXISTS memory_items (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              role TEXT NOT NULL,
              type TEXT NOT NULL,
              key TEXT NOT NULL,
              value TEXT NOT NULL,
              source TEXT NOT NULL DEFAULT 'user_provided',
              confidence REAL NOT NULL DEFAULT 1.0,
              verified_by_user INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
          `);
        }
      },
      {
        name: '004_user_isolation_and_sessions',
        up: (db) => {
          // 1. Password hash for users
          try {
            db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
          } catch (e) {
            // Already added
          }

          // 2. Real Sessions Table
          db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
          `);

          // 3. Ownership columns across all entities
          try {
            db.exec(`ALTER TABLE listings ADD COLUMN seller_user_id TEXT;`);
            db.exec(`UPDATE listings SET seller_user_id = seller_id WHERE seller_user_id IS NULL;`);
          } catch (e) {}

          try {
            db.exec(`ALTER TABLE requests ADD COLUMN buyer_user_id TEXT;`);
            db.exec(`UPDATE requests SET buyer_user_id = user_id WHERE buyer_user_id IS NULL;`);
          } catch (e) {}

          try {
            db.exec(`ALTER TABLE transactions ADD COLUMN seller_user_id TEXT;`);
          } catch (e) {}

          try {
            db.exec(`ALTER TABLE agents ADD COLUMN user_id TEXT;`);
            db.exec(`UPDATE agents SET user_id = owner_id WHERE user_id IS NULL;`);
          } catch (e) {}
        }
      },
      {
        name: '005_paypal_ledger',
        up: (db) => {
          try {
            db.exec(`ALTER TABLE transactions ADD COLUMN seller_share_held REAL;`);
          } catch (e) {}
          try {
            db.exec(`ALTER TABLE transactions ADD COLUMN seller_payout_status TEXT DEFAULT 'held';`);
          } catch (e) {}
          try {
            db.exec(`ALTER TABLE transactions ADD COLUMN seller_payout_at TEXT;`);
          } catch (e) {}
        }
      },
      {
        name: '006_multi_issue_negotiation',
        up: (db) => {
          try {
            db.exec(`ALTER TABLE proposals ADD COLUMN revisions INTEGER DEFAULT 2;`);
            db.exec(`ALTER TABLE proposals ADD COLUMN payment_terms TEXT DEFAULT 'escrow_milestone';`);
            db.exec(`ALTER TABLE proposals ADD COLUMN trades_made TEXT DEFAULT '[]';`);
            db.exec(`ALTER TABLE proposals ADD COLUMN utility_score REAL;`);
            db.exec(`ALTER TABLE proposals ADD COLUMN why_this_offer TEXT;`);
          } catch (e) {}

          try {
            db.exec(`ALTER TABLE agreements ADD COLUMN trades_summary TEXT DEFAULT '[]';`);
            db.exec(`ALTER TABLE agreements ADD COLUMN what_buyer_gave TEXT DEFAULT '[]';`);
            db.exec(`ALTER TABLE agreements ADD COLUMN what_seller_gave TEXT DEFAULT '[]';`);
            db.exec(`ALTER TABLE agreements ADD COLUMN payment_terms TEXT DEFAULT 'escrow_milestone';`);
            db.exec(`ALTER TABLE agreements ADD COLUMN revisions INTEGER DEFAULT 2;`);
          } catch (e) {}
        }
      },
      {
        name: '007_negotiable_budgets_and_cents',
        up: (db) => {
          const addCol = (sql: string) => {
            try { db.exec(sql); } catch (e) {}
          };
          addCol(`ALTER TABLE requests ADD COLUMN flexibility TEXT NOT NULL DEFAULT 'flexible';`);
          addCol(`ALTER TABLE requests ADD COLUMN hard_cap REAL;`);
          addCol(`ALTER TABLE requests ADD COLUMN budget_cents INTEGER;`);
          addCol(`ALTER TABLE requests ADD COLUMN target_price_cents INTEGER;`);
          addCol(`ALTER TABLE requests ADD COLUMN hard_cap_cents INTEGER;`);
          db.exec(`UPDATE requests SET flexibility = 'flexible' WHERE flexibility IS NULL;`);
          db.exec(`UPDATE requests SET budget_cents = ROUND(max_budget * 100) WHERE budget_cents IS NULL;`);
          db.exec(`UPDATE requests SET target_price_cents = ROUND(COALESCE(NULLIF(target_budget, 0), max_budget * 0.8) * 100) WHERE target_price_cents IS NULL;`);
          db.exec(`UPDATE requests SET hard_cap = ROUND(max_budget * 1.1) WHERE hard_cap IS NULL;`);
          db.exec(`UPDATE requests SET hard_cap_cents = ROUND(max_budget * 110) WHERE hard_cap_cents IS NULL;`);

          addCol(`ALTER TABLE listings ADD COLUMN flexibility TEXT NOT NULL DEFAULT 'flexible';`);
          addCol(`ALTER TABLE listings ADD COLUMN absolute_min_price REAL;`);
          addCol(`ALTER TABLE listings ADD COLUMN asking_price_cents INTEGER;`);
          addCol(`ALTER TABLE listings ADD COLUMN floor_price_cents INTEGER;`);
          addCol(`ALTER TABLE listings ADD COLUMN absolute_min_cents INTEGER;`);
          db.exec(`UPDATE listings SET flexibility = 'flexible' WHERE flexibility IS NULL;`);
          db.exec(`UPDATE listings SET asking_price_cents = ROUND(asking_price * 100) WHERE asking_price_cents IS NULL;`);
          db.exec(`UPDATE listings SET floor_price_cents = ROUND(floor_price * 100) WHERE floor_price_cents IS NULL;`);
          db.exec(`UPDATE listings SET absolute_min_price = ROUND(floor_price * 0.9) WHERE absolute_min_price IS NULL;`);
          db.exec(`UPDATE listings SET absolute_min_cents = ROUND(floor_price * 90) WHERE absolute_min_cents IS NULL;`);

          addCol(`ALTER TABLE proposals ADD COLUMN price_cents INTEGER;`);
          addCol(`ALTER TABLE proposals ADD COLUMN why_move TEXT;`);
          db.exec(`UPDATE proposals SET price_cents = ROUND(price * 100) WHERE price_cents IS NULL;`);

          addCol(`ALTER TABLE agreements ADD COLUMN final_price_cents INTEGER;`);
          addCol(`ALTER TABLE agreements ADD COLUMN savings_vs_budget_cents INTEGER;`);
          addCol(`ALTER TABLE agreements ADD COLUMN stretch_zone_side TEXT;`);
          db.exec(`UPDATE agreements SET final_price_cents = ROUND(final_price * 100) WHERE final_price_cents IS NULL;`);
        }
      },
      {
        name: '008_seller_payouts_ledger_onboarding',
        up: (db) => {
          const addCol = (sql: string) => {
            try { db.exec(sql); } catch (e) {}
          };

          db.exec(`
            CREATE TABLE IF NOT EXISTS seller_payout_accounts (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL UNIQUE,
              provider TEXT NOT NULL DEFAULT 'paypal_email',
              paypal_email TEXT,
              status TEXT NOT NULL DEFAULT 'not_set',
              verified_at TEXT,
              last_error TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS payouts (
              id TEXT PRIMARY KEY,
              deal_id TEXT NOT NULL UNIQUE,
              agreement_id TEXT NOT NULL,
              seller_user_id TEXT NOT NULL,
              amount_cents INTEGER NOT NULL,
              fee_cents INTEGER NOT NULL,
              gross_amount_cents INTEGER NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              status TEXT NOT NULL DEFAULT 'scheduled',
              provider TEXT NOT NULL DEFAULT 'paypal',
              provider_batch_id TEXT,
              provider_item_id TEXT,
              paypal_debug_id TEXT,
              failure_reason TEXT,
              retry_count INTEGER NOT NULL DEFAULT 0,
              next_retry_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ledger_entries (
              id TEXT PRIMARY KEY,
              deal_id TEXT NOT NULL,
              type TEXT NOT NULL,
              amount_cents INTEGER NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              note TEXT,
              created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ledger_deal ON ledger_entries(deal_id);
          `);

          addCol(`ALTER TABLE agreements ADD COLUMN work_acceptance_status TEXT NOT NULL DEFAULT 'pending';`);
          addCol(`ALTER TABLE agreements ADD COLUMN work_accepted_at TEXT;`);
          addCol(`ALTER TABLE agreements ADD COLUMN dispute_reason TEXT;`);
          addCol(`ALTER TABLE agreements ADD COLUMN platform_fee_cents INTEGER;`);
          addCol(`ALTER TABLE agreements ADD COLUMN seller_payout_cents INTEGER;`);

          addCol(`ALTER TABLE transactions ADD COLUMN amount_cents INTEGER;`);
          addCol(`ALTER TABLE transactions ADD COLUMN platform_fee_cents INTEGER;`);
          addCol(`ALTER TABLE transactions ADD COLUMN seller_payout_cents INTEGER;`);
          addCol(`ALTER TABLE transactions ADD COLUMN refund_id TEXT;`);
          addCol(`ALTER TABLE transactions ADD COLUMN refunded_at TEXT;`);
          addCol(`ALTER TABLE transactions ADD COLUMN refund_reason TEXT;`);
          db.exec(`UPDATE transactions SET amount_cents = ROUND(amount * 100) WHERE amount_cents IS NULL;`);

          addCol(`ALTER TABLE users ADD COLUMN motion_preference TEXT NOT NULL DEFAULT 'system';`);
          addCol(`ALTER TABLE users ADD COLUMN coach_marks_dismissed TEXT NOT NULL DEFAULT '[]';`);
        }
      }
    ];

    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.name)) {
        console.log(`[DB] Applying migration: ${migration.name}`);
        migration.up(this.db);
        this.db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
          migration.name,
          new Date().toISOString()
        );
      }
    }
  }
}

export const sqliteDb = new SQLiteDatabase();
