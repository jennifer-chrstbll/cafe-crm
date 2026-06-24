-- =====================================================
-- DEFAULT USERS
-- password sementara:
-- admin123
-- nanti diganti bcrypt dari backend
-- =====================================================

INSERT INTO users (
    name,
    email,
    password_hash,
    role
)
VALUES
(
    'Cafe Owner',
    'owner@cafecrm.com',
    'TEMP_PASSWORD',
    'OWNER'
),
(
    'Cashier',
    'cashier@cafecrm.com',
    'TEMP_PASSWORD',
    'CASHIER'
);

-- =====================================================
-- MENU DATA
-- =====================================================

INSERT INTO menu (
    name,
    description,
    category,
    price
)
VALUES

(
    'Americano',
    'Espresso dengan air panas',
    'COFFEE',
    25000
),

(
    'Cafe Latte',
    'Espresso dengan susu',
    'COFFEE',
    32000
),

(
    'Cappuccino',
    'Espresso dengan foam susu',
    'COFFEE',
    32000
),

(
    'Mocha',
    'Espresso dengan coklat',
    'COFFEE',
    35000
),

(
    'Matcha Latte',
    'Matcha premium dengan susu',
    'NON_COFFEE',
    35000
),

(
    'Chocolate',
    'Minuman coklat hangat',
    'NON_COFFEE',
    30000
),

(
    'Croissant',
    'Butter croissant',
    'FOOD',
    28000
),

(
    'Chicken Sandwich',
    'Sandwich ayam panggang',
    'FOOD',
    42000
),

(
    'Cheesecake',
    'New York style cheesecake',
    'DESSERT',
    38000
),

(
    'Tiramisu',
    'Italian coffee dessert',
    'DESSERT',
    40000
);