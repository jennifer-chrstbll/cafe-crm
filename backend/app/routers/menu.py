from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional

from database import SessionLocal
from app.models.menu import Menu
from app.models.enums import MenuCategory

router = APIRouter(
    prefix="/menus",
    tags=["Menu"]
)


class MenuResponse(BaseModel):
    menu_id: str
    name: str
    description: Optional[str] = None
    category: str
    price: Decimal
    is_active: bool


class MenuRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    price: Decimal


@router.get("", response_model=list[MenuResponse])
def get_menus():
    db = SessionLocal()
    try:
        menus = (
            db.query(Menu)
            .filter(Menu.is_active == True)
            .order_by(Menu.category, Menu.name)
            .all()
        )
        return [
            MenuResponse(
                menu_id=str(m.menu_id),
                name=m.name,
                description=m.description,
                category=m.category.value,
                price=m.price,
                is_active=m.is_active,
            )
            for m in menus
        ]
    finally:
        db.close()


@router.post("", response_model=MenuResponse)
def create_menu(request: MenuRequest):
    db = SessionLocal()
    try:
        try:
            category_enum = MenuCategory(request.category)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category")

        menu = Menu(
            name=request.name,
            description=request.description,
            category=category_enum,
            price=request.price,
            is_active=True
        )
        db.add(menu)
        db.commit()
        db.refresh(menu)
        return MenuResponse(
            menu_id=str(menu.menu_id),
            name=menu.name,
            description=menu.description,
            category=menu.category.value,
            price=menu.price,
            is_active=menu.is_active,
        )
    finally:
        db.close()


@router.put("/{menu_id}", response_model=MenuResponse)
def update_menu(menu_id: str, request: MenuRequest):
    db = SessionLocal()
    try:
        menu = db.query(Menu).filter(Menu.menu_id == menu_id).first()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")

        try:
            category_enum = MenuCategory(request.category)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category")

        menu.name = request.name
        menu.description = request.description
        menu.category = category_enum
        menu.price = request.price
        db.commit()
        db.refresh(menu)
        
        return MenuResponse(
            menu_id=str(menu.menu_id),
            name=menu.name,
            description=menu.description,
            category=menu.category.value,
            price=menu.price,
            is_active=menu.is_active,
        )
    finally:
        db.close()


@router.delete("/{menu_id}")
def delete_menu(menu_id: str):
    db = SessionLocal()
    try:
        menu = db.query(Menu).filter(Menu.menu_id == menu_id).first()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")
        menu.is_active = False
        db.commit()
        return {"message": "Menu successfully deleted"}
    finally:
        db.close()
