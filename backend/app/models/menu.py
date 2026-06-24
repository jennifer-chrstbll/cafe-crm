from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    String,
    Text,
    Numeric,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import MenuCategory


class Menu(Base):
    __tablename__ = "menu"

    menu_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    name: Mapped[str] = mapped_column(String(100))

    description: Mapped[str | None] = mapped_column(Text)

    category: Mapped[MenuCategory] = mapped_column(
        Enum(MenuCategory)
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )

    image_url: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(default=True)