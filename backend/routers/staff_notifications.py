from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import StaffNotification
from schemas import StaffNotificationOut

router = APIRouter(prefix="/api/staff", tags=["Staff Notifications"])


@router.get("/notifications", response_model=list[StaffNotificationOut])
def list_staff_notifications(db: Session = Depends(get_db)):
    notifications = db.query(StaffNotification).order_by(StaffNotification.createdAt.desc()).all()
    return [StaffNotificationOut.model_validate(n) for n in notifications]


@router.patch("/notifications/{notification_id}/read", response_model=StaffNotificationOut)
def mark_staff_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notification = db.query(StaffNotification).filter(StaffNotification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.isRead = True
    db.commit()
    return StaffNotificationOut.model_validate(notification)


@router.patch("/notifications/read-all")
def mark_all_staff_notifications_read(db: Session = Depends(get_db)):
    db.query(StaffNotification).filter(StaffNotification.isRead == False).update({"isRead": True})  # noqa: E712
    db.commit()
    return {"message": "All notifications marked read"}
