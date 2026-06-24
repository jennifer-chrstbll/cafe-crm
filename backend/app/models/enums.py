from enum import Enum

class UserRole(str, Enum):
    OWNER = "OWNER"
    CASHIER = "CASHIER"
    ADMIN = "ADMIN"


class MenuCategory(str, Enum):
    COFFEE = "COFFEE"
    NON_COFFEE = "NON_COFFEE"
    FOOD = "FOOD"
    DESSERT = "DESSERT"