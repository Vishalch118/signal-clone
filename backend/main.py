from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from pydantic import BaseModel
import datetime
import json

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

class LoginRequest(BaseModel):
    phone_number: str

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone_number == req.phone_number).first()
    if not user:
        user = models.User(phone_number=req.phone_number, display_name=f"User {req.phone_number[-4:]}")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.get("/api/conversations")
def get_conversations(db: Session = Depends(get_db)):
    return db.query(models.Conversation).all()

@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: int, db: Session = Depends(get_db)):
    return db.query(models.Message).filter(models.Message.conversation_id == conv_id).order_by(models.Message.created_at).all()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    db = SessionLocal()
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # CRITICAL FIX: Save the message to SQLite before broadcasting!
            if event.get("type") == "new_message":
                payload = event["payload"]
                new_msg = models.Message(
                    conversation_id=payload["conversation_id"],
                    sender_id=payload["sender_id"],
                    content=payload["content"],
                    status="DELIVERED"
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)
                
                # Update broadcast payload with real DB ID and timestamp
                payload["id"] = new_msg.id
                payload["created_at"] = new_msg.created_at.isoformat()
                event["payload"] = payload
                
            await manager.broadcast(json.dumps(event))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        db.close()
