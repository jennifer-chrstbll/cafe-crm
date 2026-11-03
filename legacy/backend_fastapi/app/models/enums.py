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


class PaymentMethod(str, Enum):
    CASH = "cash"
    QRIS = "qris"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
    E_WALLET = "e_wallet"