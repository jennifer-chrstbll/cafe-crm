-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM (
    'OWNER',
    'CASHIER',
    'ADMIN'
);

CREATE TYPE menu_category AS ENUM (
    'COFFEE',
    'NON_COFFEE',
    'FOOD',
    'DESSERT'
);

-- =====================================================
-- CUSTOMERS
-- =====================================================

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,

    phone_number VARCHAR(30) UNIQUE,

    email VARCHAR(255),

    gender VARCHAR(20),

    date_of_birth DATE,

    notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EMBEDDINGS
-- =====================================================

CREATE TABLE embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID NOT NULL,

    embedding_vector VECTOR(512) NOT NULL,

    model_name VARCHAR(50) NOT NULL,

    is_primary BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_embeddings_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
);

-- =====================================================
-- VISITS
-- =====================================================

CREATE TABLE visits (
    visit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID NOT NULL,

    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    exit_time TIMESTAMPTZ,

    duration_minutes INTEGER,

    CONSTRAINT fk_visits_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE CASCADE
);

-- =====================================================
-- MENU
-- =====================================================

CREATE TABLE menu (
    menu_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,

    description TEXT,

    category menu_category NOT NULL,

    price NUMERIC(10,2) NOT NULL,

    image_url TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ORDERS
-- =====================================================

CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    visit_id UUID NOT NULL,

    menu_id UUID NOT NULL,

    qty INTEGER NOT NULL CHECK (qty > 0),

    subtotal NUMERIC(10,2) NOT NULL,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_orders_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(visit_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_orders_menu
        FOREIGN KEY (menu_id)
        REFERENCES menu(menu_id)
);

-- =====================================================
-- TRANSACTIONS
-- =====================================================

CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    visit_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',

    total_amount NUMERIC(10,2) DEFAULT 0,

    payment_method VARCHAR(50),

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_transactions_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(visit_id)
        ON DELETE CASCADE
);

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role user_role NOT NULL,

    last_login TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RECOGNITION LOGS
-- =====================================================

CREATE TABLE recognition_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID,

    visit_id UUID,

    similarity_score FLOAT,

    model_used VARCHAR(50),

    camera_id VARCHAR(50),

    recognized BOOLEAN NOT NULL DEFAULT FALSE,

    is_correct BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_logs_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_logs_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(visit_id)
        ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_embeddings_customer
ON embeddings(customer_id);

CREATE INDEX idx_visits_customer
ON visits(customer_id);

CREATE INDEX idx_orders_visit
ON orders(visit_id);

CREATE INDEX idx_logs_customer
ON recognition_logs(customer_id);

CREATE INDEX idx_logs_created
ON recognition_logs(created_at);