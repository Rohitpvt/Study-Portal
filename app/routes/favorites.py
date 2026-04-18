from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, DBSession
from app.models.favorite import Favorite
from app.models.material import Material
from app.schemas.material import PaginatedMaterials, MaterialOut
from app.models.base import generate_uuid

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.post("/{material_id}", summary="Add material to favorites")
async def add_favorite(
    material_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """Adds a specific material to the user's favorites list safely."""
    
    # Check if the material actually exists and is approved
    material = await db.scalar(
        select(Material).where(and_(Material.id == material_id, Material.is_approved == True))
    )
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
        
    # Check if already favorited natively
    existing_favorite = await db.scalar(
        select(Favorite).where(
            and_(Favorite.user_id == current_user.id, Favorite.material_id == material_id)
        )
    )
    if existing_favorite:
        return {"status": "success", "detail": "Already favorited", "id": existing_favorite.id}
        
    # Bind new favorite
    new_fav = Favorite(id=generate_uuid(), user_id=current_user.id, material_id=material_id)
    db.add(new_fav)
    await db.commit()
    return {"status": "success", "detail": "Added to favorites", "id": new_fav.id}


@router.delete("/{material_id}", summary="Remove material from favorites")
async def remove_favorite(
    material_id: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """Removes a material from the user's secure favorites ledger."""
    favorite = await db.scalar(
        select(Favorite).where(
            and_(Favorite.user_id == current_user.id, Favorite.material_id == material_id)
        )
    )
    if not favorite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in favorites")
        
    await db.delete(favorite)
    await db.commit()
    return {"status": "success", "detail": "Removed from favorites"}


@router.get("", response_model=PaginatedMaterials, summary="Get purely favorited materials")
async def get_favorites(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Generates a strictly paginated query natively returning only exactly what the user bookmarked."""
    
    # Establish base tracking
    query = (
        select(Material)
        .join(Favorite, Favorite.material_id == Material.id)
        .where(Favorite.user_id == current_user.id)
    )
    
    # Count total
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()
    
    # Finalize ordering and offset natively mapped against the join table Date
    query = query.order_by(Favorite.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PaginatedMaterials(
        total=total,
        page=page,
        page_size=page_size,
        items=list(items),
    )
