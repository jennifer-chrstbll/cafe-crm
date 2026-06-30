"""
Seed script to populate the menu table with cafe menu items.
Run from backend dir: python scripts/seed_menu.py
"""
import sys
import os
from decimal import Decimal
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from app.models.menu import Menu
from app.models.enums import MenuCategory

MENU_ITEMS = [
    # Coffee
    {"name": "Espresso", "category": MenuCategory.COFFEE, "price": Decimal("22000"), "description": "Double shot espresso"},
    {"name": "Americano", "category": MenuCategory.COFFEE, "price": Decimal("25000"), "description": "Espresso with hot water"},
    {"name": "Cappuccino", "category": MenuCategory.COFFEE, "price": Decimal("30000"), "description": "Espresso with steamed milk foam"},
    {"name": "Caffe Latte", "category": MenuCategory.COFFEE, "price": Decimal("32000"), "description": "Espresso with steamed milk"},
    {"name": "Matcha Latte", "category": MenuCategory.COFFEE, "price": Decimal("35000"), "description": "Premium matcha with steamed milk"},
    {"name": "Iced Americano", "category": MenuCategory.COFFEE, "price": Decimal("28000"), "description": "Espresso with cold water and ice"},
    {"name": "Cold Brew", "category": MenuCategory.COFFEE, "price": Decimal("38000"), "description": "12-hour cold brewed coffee"},
    # Non Coffee
    {"name": "Matcha Frappe", "category": MenuCategory.NON_COFFEE, "price": Decimal("38000"), "description": "Blended matcha with milk"},
    {"name": "Chocolate Latte", "category": MenuCategory.NON_COFFEE, "price": Decimal("32000"), "description": "Rich hot chocolate"},
    {"name": "Taro Latte", "category": MenuCategory.NON_COFFEE, "price": Decimal("35000"), "description": "Purple taro blended latte"},
    {"name": "Lemon Tea", "category": MenuCategory.NON_COFFEE, "price": Decimal("22000"), "description": "Fresh lemon iced tea"},
    # Food
    {"name": "Croissant", "category": MenuCategory.FOOD, "price": Decimal("20000"), "description": "Buttery flaky croissant"},
    {"name": "Club Sandwich", "category": MenuCategory.FOOD, "price": Decimal("45000"), "description": "Triple-decker with chicken"},
    {"name": "Avocado Toast", "category": MenuCategory.FOOD, "price": Decimal("40000"), "description": "Smashed avo on sourdough"},
    {"name": "Chicken Wrap", "category": MenuCategory.FOOD, "price": Decimal("42000"), "description": "Grilled chicken in whole wheat wrap"},
    # Dessert
    {"name": "Cheesecake", "category": MenuCategory.DESSERT, "price": Decimal("35000"), "description": "New York style cheesecake"},
    {"name": "Tiramisu", "category": MenuCategory.DESSERT, "price": Decimal("38000"), "description": "Classic Italian tiramisu"},
    {"name": "Brownies", "category": MenuCategory.DESSERT, "price": Decimal("25000"), "description": "Fudgy chocolate brownies"},
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Menu).count()
        if existing > 0:
            print(f"Menu already has {existing} items. Skipping seed.")
            return

        for item in MENU_ITEMS:
            menu = Menu(
                menu_id=uuid4(),
                name=item["name"],
                description=item["description"],
                category=item["category"],
                price=item["price"],
                is_active=True,
            )
            db.add(menu)

        db.commit()
        print(f"Seeded {len(MENU_ITEMS)} menu items.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
