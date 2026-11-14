-- DeliveryAssist AI schema v1.0.0. Exclusively synthetic demo records.
CREATE TABLE IF NOT EXISTS schema_migrations (name text primary key, applied_at timestamptz not null default now());
CREATE TABLE users (
 id uuid primary key default gen_random_uuid(), name varchar(120) not null CHECK(length(trim(name))>0),
 email varchar(254) not null unique CHECK(email=lower(email)), password_hash text not null,
 role varchar(12) not null CHECK(role IN ('ADMIN','OPERATOR')), is_active boolean not null default true,
 is_demo_account boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
CREATE TABLE auth_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id), jti_hash varchar(64) not null unique,
 created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz, last_seen_at timestamptz not null default now(), user_agent_digest varchar(64)
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id, expires_at);
CREATE TABLE restaurants (
 id uuid primary key default gen_random_uuid(), name varchar(160) not null, slug varchar(160) not null unique,
 is_active boolean not null default true, version integer not null default 1 CHECK(version>=1), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
CREATE TABLE customers (
 id uuid primary key default gen_random_uuid(), display_name varchar(120) not null, fictional_reference varchar(40) not null unique, created_at timestamptz not null default now()
);
CREATE TABLE orders (
 id uuid primary key default gen_random_uuid(), order_code varchar(24) not null unique, restaurant_id uuid not null references restaurants(id),
 customer_id uuid not null references customers(id), status varchar(22) not null CHECK(status IN ('CREATED','PREPARING','READY_FOR_PICKUP','IN_DELIVERY','DELIVERED','CANCELED')),
 total_cents integer not null CHECK(total_cents>=0), placed_at timestamptz not null,
 estimated_delivery_at timestamptz, delivered_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 CHECK(status='CANCELED' OR estimated_delivery_at IS NOT NULL),
 CHECK((status='DELIVERED' AND delivered_at IS NOT NULL) OR (status<>'DELIVERED' AND delivered_at IS NULL))
);
CREATE INDEX orders_restaurant_status_eta_idx ON orders(restaurant_id,status,estimated_delivery_at);
CREATE INDEX orders_eta_idx ON orders(estimated_delivery_at);
CREATE INDEX orders_placed_idx ON orders(placed_at DESC,id DESC);
CREATE TABLE order_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id),
 event_type varchar(20) not null CHECK(event_type IN ('CREATED','PREPARING','READY_FOR_PICKUP','IN_DELIVERY','DELIVERED','CANCELED','NOTE')),
 description varchar(500) not null, occurred_at timestamptz not null
);
CREATE INDEX order_events_order_idx ON order_events(order_id,occurred_at DESC,id DESC);
CREATE TABLE incidents (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id),
 category varchar(32) not null CHECK(category IN ('DELIVERY_DELAY','MISSING_ITEM','WRONG_ITEM','COMMUNICATION','CANCELLATION_REQUEST','OTHER')),
 description text not null CHECK(char_length(description) BETWEEN 15 AND 2000),
 priority varchar(10) not null CHECK(priority IN ('LOW','MEDIUM','HIGH')),
 status varchar(16) not null default 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED')),
 assigned_to_user_id uuid references users(id), source varchar(14) not null CHECK(source IN ('MANUAL','AI_APPROVED')),
 created_by_user_id uuid not null references users(id), resolved_at timestamptz,
 version integer not null default 1 CHECK(version>=1), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX incidents_active_once ON incidents(order_id,category) WHERE status IN ('OPEN','IN_PROGRESS');
CREATE INDEX incidents_status_priority_idx ON incidents(status,priority,created_at DESC);
CREATE INDEX incidents_assignee_idx ON incidents(assigned_to_user_id,status);
CREATE INDEX incidents_created_idx ON incidents(created_at DESC,id DESC);
CREATE TABLE incident_notes (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references incidents(id), author_user_id uuid not null references users(id),
 source varchar(14) not null CHECK(source IN ('MANUAL','AI_APPROVED')), body text not null CHECK(char_length(body) BETWEEN 1 AND 1000),created_at timestamptz not null default now()
);
CREATE INDEX incident_notes_incident_idx ON incident_notes(incident_id,created_at DESC,id DESC);
CREATE TABLE reply_drafts (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references incidents(id), body text not null CHECK(char_length(body) BETWEEN 1 AND 2000),
 status varchar(12) not null default 'DRAFT' CHECK(status IN ('DRAFT','ARCHIVED')),
 source varchar(14) not null CHECK(source IN ('MANUAL','AI_APPROVED')),
 created_by_user_id uuid not null references users(id),updated_by_user_id uuid not null references users(id),
 version integer not null default 1 CHECK(version>=1),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
CREATE INDEX reply_drafts_incident_idx ON reply_drafts(incident_id,updated_at DESC,id DESC);
CREATE TABLE ai_conversations (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id),auth_session_id uuid not null references auth_sessions(id),
 title varchar(120) not null default 'Nova conversa',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz
);
CREATE INDEX ai_conversations_session_idx ON ai_conversations(auth_session_id,updated_at DESC);
CREATE TABLE ai_messages (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references ai_conversations(id),
 role varchar(16) not null CHECK(role IN ('USER','ASSISTANT','SYSTEM_EVENT')),
 content text not null CHECK(char_length(content) <= 4000), message_kind varchar(20) not null CHECK(message_kind IN ('FACTUAL','LLM_GENERATED','ERROR','USER_INPUT','ACTION_RESULT')),
 status varchar(14) not null CHECK(status IN ('PROCESSING','COMPLETED','FAILED')),
 context_refs jsonb not null default '[]'::jsonb CHECK(jsonb_typeof(context_refs)='array'),created_at timestamptz not null default now()
);
CREATE INDEX ai_messages_conv_idx ON ai_messages(conversation_id,created_at,id);
CREATE TABLE action_proposals (
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references ai_conversations(id),ai_message_id uuid not null references ai_messages(id),
 group_id uuid not null,type varchar(32) not null CHECK(type IN ('CREATE_INCIDENT','SET_INCIDENT_PRIORITY','SET_INCIDENT_STATUS','ADD_INCIDENT_NOTE','CREATE_REPLY_DRAFT')),
 target_type varchar(20) not null CHECK(target_type IN ('ORDER','INCIDENT','PROPOSAL_RESULT')),
 target_id uuid, depends_on_proposal_id uuid references action_proposals(id),
 parameters jsonb not null CHECK(jsonb_typeof(parameters)='object'), evidence_refs jsonb not null default '[]'::jsonb CHECK(jsonb_typeof(evidence_refs)='array'),
 reason varchar(600) not null,status varchar(16) not null CHECK(status IN ('BLOCKED','PENDING','APPROVED','EXECUTING','EXECUTED','REJECTED','FAILED','EXPIRED','CANCELED')),
 observed_entity_version integer, created_by_user_id uuid not null references users(id), approved_by_user_id uuid references users(id),
 expires_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),execution_result_id uuid
);
CREATE INDEX action_proposals_conv_idx ON action_proposals(conversation_id,status,created_at DESC);
CREATE INDEX action_proposals_exp_idx ON action_proposals(expires_at,status);
CREATE TABLE action_executions (
 id uuid primary key default gen_random_uuid(),proposal_id uuid not null unique references action_proposals(id),
 idempotency_key uuid not null,actor_user_id uuid not null references users(id),
 result_entity_type varchar(20) not null CHECK(result_entity_type IN ('INCIDENT','NOTE','DRAFT')),
 result_entity_id uuid,outcome varchar(9) not null CHECK(outcome IN ('SUCCESS','FAILURE')),
 safe_error_code varchar(80),executed_at timestamptz not null default now()
);
CREATE TABLE audit_logs (
 id uuid primary key default gen_random_uuid(),actor_user_id uuid references users(id),actor_kind varchar(10) not null CHECK(actor_kind IN ('USER','SYSTEM')),
 request_id varchar(64) not null,event_type varchar(90) not null,entity_type varchar(50) not null,entity_id uuid,
 source varchar(14) not null CHECK(source IN ('MANUAL','AI_APPROVED','SYSTEM')),
 before_data jsonb not null default '{}'::jsonb,after_data jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
CREATE INDEX audit_logs_date_idx ON audit_logs(created_at DESC,id DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type,entity_id,created_at DESC);
CREATE TABLE ai_usage (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id),auth_session_id uuid not null references auth_sessions(id),
 conversation_id uuid references ai_conversations(id),request_id varchar(64) not null,provider varchar(50) not null,model varchar(100) not null,
 purpose varchar(12) not null CHECK(purpose IN ('INTENT','RESPONSE')),
 outcome varchar(18) not null CHECK(outcome IN ('SUCCESS','ERROR','TIMEOUT','INVALID_OUTPUT','RATE_LIMITED')),
 duration_ms integer not null CHECK(duration_ms>=0),input_tokens integer,output_tokens integer,
 estimated_cost_cents integer,created_at timestamptz not null default now()
);
CREATE INDEX ai_usage_report_idx ON ai_usage(created_at DESC,provider,outcome);
CREATE TABLE ai_quota_daily (
 quota_scope varchar(10) not null CHECK(quota_scope IN ('GLOBAL','SESSION','USER')),
 quota_subject varchar(100) not null,usage_date_utc date not null,used_turns integer not null default 0 CHECK(used_turns>=0),
 reserved_turns integer not null default 0 CHECK(reserved_turns>=0),updated_at timestamptz not null default now(),
 primary key(quota_scope,quota_subject,usage_date_utc)
);
CREATE TABLE ai_turns (
 id uuid primary key default gen_random_uuid(),auth_session_id uuid not null references auth_sessions(id),user_id uuid not null references users(id),
 request_id varchar(64) not null unique,status varchar(10) not null CHECK(status IN ('RESERVED','USED','RELEASED')),
 created_at timestamptz not null default now()
);
CREATE INDEX ai_turns_recent_idx ON ai_turns(auth_session_id,created_at DESC);
CREATE TABLE idempotency_records (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id),operation_scope varchar(80) not null,
 idempotency_key uuid not null,request_hash varchar(64) not null,http_status integer not null,response_body jsonb not null,
 created_at timestamptz not null default now(),expires_at timestamptz not null,
 unique(user_id,operation_scope,idempotency_key)
);
CREATE TABLE demo_control (
 id smallint primary key default 1 CHECK(id=1),seed_version varchar(30) not null,last_reset_at timestamptz not null,
 next_reset_at timestamptz not null, reset_in_progress boolean not null default false,updated_at timestamptz not null default now()
);
CREATE TABLE login_attempts (
 key_hash varchar(64) primary key,failures integer not null default 0,window_start timestamptz not null default now(),locked_until timestamptz
);
