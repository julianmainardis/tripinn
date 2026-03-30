from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'numa_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'numa-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="Numa API", description="Emotional wellness & travel recommendation app")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    nationality: str = "España"
    language: str = "es"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    nationality: str
    language: str
    created_at: datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    nationality: Optional[str] = None
    language: Optional[str] = None

class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood: str  # stressed, sad, need_change, disconnect, lost
    intensity: float = 0.5  # 0-1
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MoodInput(BaseModel):
    mood: str
    intensity: float = 0.5

class Experience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    short_description: str
    category: str  # nature, beach, mountain, urban, retreat
    tags: List[str]
    image_url: str
    duration: str
    location: str
    affiliate_link_placeholder: str = ""
    mood_tags: List[str]  # which moods this experience helps with

class RecommendationResponse(BaseModel):
    ai_message: str
    quick_routine: str
    experiences: List[Experience]
    mood_profile: dict

class SavedExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    experience_id: str
    saved_at: datetime = Field(default_factory=datetime.utcnow)

class EmotionalProfile(BaseModel):
    user_id: str
    dominant_mood: str
    mood_percentages: dict
    recommended_type: str
    traveler_type: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# ==================== DEMO EXPERIENCES ====================

DEMO_EXPERIENCES = [
    {
        "id": "exp-1",
        "title": "Escapada a la Naturaleza",
        "description": "Desconecta del ruido y reconecta con la naturaleza. Un retiro de 2-3 días en un entorno natural donde podrás respirar aire puro, caminar por senderos tranquilos y dejar atrás el estrés del día a día.",
        "short_description": "Desconecta del ruido y reconecta contigo",
        "category": "nature",
        "tags": ["naturaleza", "relax", "desconexión", "aire libre"],
        "image_url": "https://images.unsplash.com/photo-1588152850700-c82ecb8ba9b1",
        "duration": "2-3 días",
        "location": "Pirineos, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=pirineos",
        "mood_tags": ["stressed", "disconnect", "sad"]
    },
    {
        "id": "exp-2",
        "title": "Aventura en la Montaña",
        "description": "Siente la adrenalina y la libertad de las alturas. Rutas de senderismo, vistas panorámicas y la satisfacción de conquistar nuevas cimas. Ideal para resetear tu mente con desafíos físicos.",
        "short_description": "Conquista nuevas cimas y resetea tu mente",
        "category": "mountain",
        "tags": ["montaña", "aventura", "senderismo", "desafío"],
        "image_url": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606",
        "duration": "3-4 días",
        "location": "Sierra Nevada, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=sierra-nevada",
        "mood_tags": ["need_change", "stressed", "lost"]
    },
    {
        "id": "exp-3",
        "title": "Relax en la Playa",
        "description": "Aguas cristalinas, arena suave y el sonido de las olas. Un escape perfecto para liberar tensiones, tomar el sol y dejar que el mar se lleve tus preocupaciones.",
        "short_description": "Deja que el mar se lleve tus preocupaciones",
        "category": "beach",
        "tags": ["playa", "relax", "mar", "descanso"],
        "image_url": "https://images.unsplash.com/photo-1505142468610-359e7d316be0",
        "duration": "4-5 días",
        "location": "Costa Brava, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=costa-brava",
        "mood_tags": ["stressed", "sad", "disconnect"]
    },
    {
        "id": "exp-4",
        "title": "Escapada Urbana Wellness",
        "description": "Combina cultura, gastronomía y bienestar en una ciudad vibrante. Spas urbanos, yoga al amanecer, mercados locales y experiencias que nutren cuerpo y alma.",
        "short_description": "Cultura, gastronomía y bienestar urbano",
        "category": "urban",
        "tags": ["urbano", "spa", "cultura", "gastronomía"],
        "image_url": "https://images.unsplash.com/photo-1704338801473-fedc27bf73ea",
        "duration": "2-3 días",
        "location": "Barcelona, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=barcelona",
        "mood_tags": ["need_change", "lost", "sad"]
    },
    {
        "id": "exp-5",
        "title": "Retiro de Bienestar",
        "description": "Un espacio dedicado a tu sanación interior. Meditación guiada, yoga, alimentación consciente y talleres de desarrollo personal en un entorno de paz absoluta.",
        "short_description": "Sanación interior y desarrollo personal",
        "category": "retreat",
        "tags": ["retiro", "meditación", "yoga", "bienestar"],
        "image_url": "https://images.pexels.com/photos/18772173/pexels-photo-18772173.jpeg",
        "duration": "5-7 días",
        "location": "Mallorca, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=mallorca-retreat",
        "mood_tags": ["stressed", "lost", "disconnect", "sad"]
    },
    {
        "id": "exp-6",
        "title": "Ruta del Vino",
        "description": "Descubre los viñedos más hermosos, degusta vinos excepcionales y disfruta de la gastronomía local. Una experiencia sensorial que combina placer y descubrimiento.",
        "short_description": "Vinos, paisajes y gastronomía local",
        "category": "nature",
        "tags": ["vino", "gastronomía", "cultura", "relax"],
        "image_url": "https://images.unsplash.com/photo-1588152850700-c82ecb8ba9b1",
        "duration": "2-3 días",
        "location": "La Rioja, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=la-rioja",
        "mood_tags": ["need_change", "disconnect"]
    }
]

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email.lower(),
        "password_hash": hash_password(user.password),
        "name": user.name,
        "nationality": user.nationality,
        "language": user.language,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email.lower(),
            "name": user.name,
            "nationality": user.nationality,
            "language": user.language
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "nationality": user["nationality"],
            "language": user["language"]
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "nationality": user["nationality"],
        "language": user["language"]
    }

@api_router.put("/auth/profile")
async def update_profile(update: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]})
    return {
        "id": updated_user["id"],
        "email": updated_user["email"],
        "name": updated_user["name"],
        "nationality": updated_user["nationality"],
        "language": updated_user["language"]
    }

# ==================== MOOD & RECOMMENDATIONS ====================

MOOD_TRANSLATIONS = {
    "stressed": "Saturado",
    "sad": "Bajo de ánimo", 
    "need_change": "Necesito cambio",
    "disconnect": "Quiero desconectar",
    "lost": "Me siento perdido"
}

TRAVELER_TYPES = {
    "stressed": "Buscador de Paz",
    "sad": "Explorador Emocional",
    "need_change": "Reiniciador",
    "disconnect": "Viajero Escape",
    "lost": "Aventurero Interior"
}

@api_router.post("/mood/analyze")
async def analyze_mood(mood_input: MoodInput, user: dict = Depends(get_current_user)):
    # Save mood entry
    mood_entry = MoodEntry(
        user_id=user["id"],
        mood=mood_input.mood,
        intensity=mood_input.intensity
    )
    await db.mood_entries.insert_one(mood_entry.dict())
    
    # Get user's mood history for context
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(10).to_list(10)
    
    # Calculate mood profile
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values()) or 1
    mood_percentages = {k: round(v/total * 100) for k, v in mood_counts.items()}
    
    # Get matching experiences
    matching_experiences = [
        exp for exp in DEMO_EXPERIENCES 
        if mood_input.mood in exp["mood_tags"]
    ][:3]
    
    # Generate AI recommendation
    ai_message = ""
    quick_routine = ""
    
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"numa-{user['id']}-{datetime.utcnow().timestamp()}",
                system_message=f"""Eres Numa, un asistente de bienestar emocional empático y cálido.
El usuario es de {user.get('nationality', 'España')} y habla {user.get('language', 'español')}.
Tu objetivo es ayudarle a sentirse mejor y recomendarle experiencias según su estado emocional.
Responde siempre en español de forma breve, cálida y personalizada.
NO uses markdown ni asteriscos. Solo texto plano."""
            ).with_model("openai", "gpt-4o")
            
            mood_spanish = MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood)
            
            prompt = f"""El usuario se siente: {mood_spanish} (intensidad: {mood_input.intensity * 100}%)
Historial reciente de estados: {[MOOD_TRANSLATIONS.get(e['mood'], e['mood']) for e in history[:5]]}

Genera una respuesta empática de máximo 2 frases que:
1. Valide cómo se siente
2. Le dé esperanza o una perspectiva positiva

Luego sugiere UNA rutina rápida de 5-10 minutos que pueda hacer ahora mismo (respiración, journaling, paseo, etc).

Formato exacto:
MENSAJE: [tu mensaje empático]
RUTINA: [nombre de la rutina] - [descripción breve de cómo hacerla]"""

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse response
            lines = response.strip().split('\n')
            for line in lines:
                if line.startswith('MENSAJE:'):
                    ai_message = line.replace('MENSAJE:', '').strip()
                elif line.startswith('RUTINA:'):
                    quick_routine = line.replace('RUTINA:', '').strip()
                    
        except Exception as e:
            logger.error(f"AI recommendation error: {e}")
            ai_message = "Entiendo cómo te sientes. Recuerda que cada momento difícil es temporal y estás dando un gran paso al buscar tu bienestar."
            quick_routine = "Respiración 4-7-8 - Inhala 4 segundos, mantén 7, exhala 8. Repite 4 veces."
    else:
        ai_message = "Entiendo cómo te sientes. Recuerda que cada momento difícil es temporal y estás dando un gran paso al buscar tu bienestar."
        quick_routine = "Respiración 4-7-8 - Inhala 4 segundos, mantén 7, exhala 8. Repite 4 veces."
    
    return {
        "ai_message": ai_message,
        "quick_routine": quick_routine,
        "experiences": matching_experiences,
        "mood_profile": {
            "current_mood": mood_input.mood,
            "mood_label": MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood),
            "percentages": mood_percentages,
            "traveler_type": TRAVELER_TYPES.get(mood_input.mood, "Explorador")
        }
    }

@api_router.get("/mood/history")
async def get_mood_history(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(30).to_list(30)
    return [
        {
            "id": entry["id"],
            "mood": entry["mood"],
            "mood_label": MOOD_TRANSLATIONS.get(entry["mood"], entry["mood"]),
            "intensity": entry["intensity"],
            "timestamp": entry["timestamp"]
        }
        for entry in history
    ]

@api_router.get("/mood/profile")
async def get_emotional_profile(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).to_list(100)
    
    if not history:
        return {
            "dominant_mood": None,
            "mood_percentages": {},
            "traveler_type": "Nuevo Explorador",
            "total_entries": 0
        }
    
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values())
    mood_percentages = {
        MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) 
        for k, v in mood_counts.items()
    }
    
    dominant = max(mood_counts, key=mood_counts.get)
    
    return {
        "dominant_mood": MOOD_TRANSLATIONS.get(dominant, dominant),
        "mood_percentages": mood_percentages,
        "traveler_type": TRAVELER_TYPES.get(dominant, "Explorador"),
        "total_entries": total
    }

# ==================== EXPERIENCES ====================

@api_router.get("/experiences")
async def get_experiences(category: Optional[str] = None):
    experiences = DEMO_EXPERIENCES
    if category:
        experiences = [e for e in experiences if e["category"] == category]
    return experiences

@api_router.get("/experiences/{experience_id}")
async def get_experience(experience_id: str):
    for exp in DEMO_EXPERIENCES:
        if exp["id"] == experience_id:
            return exp
    raise HTTPException(status_code=404, detail="Experiencia no encontrada")

@api_router.get("/experiences/categories/list")
async def get_categories():
    return [
        {"id": "nature", "name": "Naturaleza", "icon": "leaf"},
        {"id": "beach", "name": "Playa", "icon": "umbrella-beach"},
        {"id": "mountain", "name": "Montaña", "icon": "mountain"},
        {"id": "urban", "name": "Urbano", "icon": "city"},
        {"id": "retreat", "name": "Retiro", "icon": "spa"}
    ]

# ==================== SAVED EXPERIENCES ====================

@api_router.post("/saved/{experience_id}")
async def save_experience(experience_id: str, user: dict = Depends(get_current_user)):
    # Check if already saved
    existing = await db.saved_experiences.find_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    if existing:
        return {"message": "Ya guardada", "saved": True}
    
    saved = SavedExperience(user_id=user["id"], experience_id=experience_id)
    await db.saved_experiences.insert_one(saved.dict())
    return {"message": "Guardada", "saved": True}

@api_router.delete("/saved/{experience_id}")
async def unsave_experience(experience_id: str, user: dict = Depends(get_current_user)):
    await db.saved_experiences.delete_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    return {"message": "Eliminada", "saved": False}

@api_router.get("/saved")
async def get_saved_experiences(user: dict = Depends(get_current_user)):
    saved = await db.saved_experiences.find({"user_id": user["id"]}).to_list(100)
    saved_ids = [s["experience_id"] for s in saved]
    
    experiences = [exp for exp in DEMO_EXPERIENCES if exp["id"] in saved_ids]
    return experiences

@api_router.get("/saved/check/{experience_id}")
async def check_saved(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    return {"saved": existing is not None}

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "app": "Numa API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    # Seed demo experiences if needed
    logger.info("Numa API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
