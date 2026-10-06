from database import SessionLocal, engine, Base
import models

def seed_db():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if seeded
    if db.query(models.User).first():
        print("Database already seeded.")
        return

    print("Seeding Users...")
    alice = models.User(phone_number="555-0001", display_name="Alice")
    bob = models.User(phone_number="555-0002", display_name="Bob")
    charlie = models.User(phone_number="555-0003", display_name="Charlie")
    
    db.add_all([alice, bob, charlie])
    db.commit()

    print("Seeding Conversations & Messages...")
    conv = models.Conversation(is_group=False)
    db.add(conv)
    db.commit()
    db.refresh(conv)

    msg1 = models.Message(conversation_id=conv.id, sender_id=alice.id, content="Hey Bob, checking out the new Signal Clone!")
    msg2 = models.Message(conversation_id=conv.id, sender_id=bob.id, content="Looks great so far.")
    
    db.add_all([msg1, msg2])
    db.commit()
    print("Seeding Complete!")

if __name__ == "__main__":
    seed_db()
