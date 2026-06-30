task.md:
# Task: Cafe CRM Feature Enhancement

## Backend
- [x] Seed menu script (scripts/seed_menu.py) — 10 menu existing, 18 in seed
- [x] Menu router (GET /menus)
- [x] POS router (POST /pos/checkout)
- [x] Customer router: GET /customers/{id}/orders + segment field
- [x] Analytics: update dashboard-summary (orders + revenue)
- [x] Analytics: GET /analytics/product-analytics
- [x] Analytics: GET /analytics/customer-segments
- [x] Register menu + pos routers in main.py

## Frontend
- [x] Update types/index.ts (Menu, Order, CartItem, ProductAnalytics, CustomerSegment)
- [x] Mini POS page (src/app/pos/page.tsx)
- [x] Update Dashboard: kasir vs owner views with tailored stats
- [x] Update Analytics: product chart (qty + revenue) + segmentation donut
- [x] Update Customer Detail: segment badge + order history
- [x] Add POS link to Sidebar (kasir only)