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
import random
from urllib.parse import quote
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'tripinn_db')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'tripinn-secret-key-2024-secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Future API Keys placeholders
SKYSCANNER_API_KEY = os.environ.get('SKYSCANNER_API_KEY', '')
BOOKING_API_KEY = os.environ.get('BOOKING_API_KEY', '')

app = FastAPI(title="TripInn API", description="Tu guía de bienestar y experiencias de viaje")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== AIRPORTS DATABASE ====================

AIRPORTS = [
    {"code": "MAD", "city": "Madrid", "country": "España", "name": "Adolfo Suárez Madrid-Barajas"},
    {"code": "BCN", "city": "Barcelona", "country": "España", "name": "El Prat"},
    {"code": "AGP", "city": "Málaga", "country": "España", "name": "Costa del Sol"},
    {"code": "PMI", "city": "Palma de Mallorca", "country": "España", "name": "Son Sant Joan"},
    {"code": "ALC", "city": "Alicante", "country": "España", "name": "Alicante-Elche"},
    {"code": "VLC", "city": "Valencia", "country": "España", "name": "Valencia"},
    {"code": "SVQ", "city": "Sevilla", "country": "España", "name": "San Pablo"},
    {"code": "BIO", "city": "Bilbao", "country": "España", "name": "Bilbao"},
    {"code": "TFS", "city": "Tenerife Sur", "country": "España", "name": "Tenerife Sur"},
    {"code": "LPA", "city": "Gran Canaria", "country": "España", "name": "Gran Canaria"},
    {"code": "LIS", "city": "Lisboa", "country": "Portugal", "name": "Humberto Delgado"},
    {"code": "OPO", "city": "Oporto", "country": "Portugal", "name": "Francisco Sá Carneiro"},
    {"code": "FCO", "city": "Roma", "country": "Italia", "name": "Fiumicino"},
    {"code": "MXP", "city": "Milán", "country": "Italia", "name": "Malpensa"},
    {"code": "VCE", "city": "Venecia", "country": "Italia", "name": "Marco Polo"},
    {"code": "NAP", "city": "Nápoles", "country": "Italia", "name": "Capodichino"},
    {"code": "CDG", "city": "París", "country": "Francia", "name": "Charles de Gaulle"},
    {"code": "ORY", "city": "París Orly", "country": "Francia", "name": "Orly"},
    {"code": "NCE", "city": "Niza", "country": "Francia", "name": "Costa Azul"},
    {"code": "MRS", "city": "Marsella", "country": "Francia", "name": "Provence"},
    {"code": "AMS", "city": "Ámsterdam", "country": "Países Bajos", "name": "Schiphol"},
    {"code": "BRU", "city": "Bruselas", "country": "Bélgica", "name": "Zaventem"},
    {"code": "FRA", "city": "Frankfurt", "country": "Alemania", "name": "Frankfurt"},
    {"code": "MUC", "city": "Múnich", "country": "Alemania", "name": "Franz Josef Strauss"},
    {"code": "BER", "city": "Berlín", "country": "Alemania", "name": "Brandenburg"},
    {"code": "LHR", "city": "Londres", "country": "Reino Unido", "name": "Heathrow"},
    {"code": "LGW", "city": "Londres Gatwick", "country": "Reino Unido", "name": "Gatwick"},
    {"code": "STN", "city": "Londres Stansted", "country": "Reino Unido", "name": "Stansted"},
    {"code": "DUB", "city": "Dublín", "country": "Irlanda", "name": "Dublin"},
    {"code": "PRG", "city": "Praga", "country": "República Checa", "name": "Václav Havel"},
    {"code": "BUD", "city": "Budapest", "country": "Hungría", "name": "Ferenc Liszt"},
    {"code": "VIE", "city": "Viena", "country": "Austria", "name": "Schwechat"},
    {"code": "WAW", "city": "Varsovia", "country": "Polonia", "name": "Chopin"},
    {"code": "KRK", "city": "Cracovia", "country": "Polonia", "name": "Juan Pablo II"},
    {"code": "ATH", "city": "Atenas", "country": "Grecia", "name": "Eleftherios Venizelos"},
    {"code": "SKG", "city": "Salónica", "country": "Grecia", "name": "Makedonia"},
    {"code": "IST", "city": "Estambul", "country": "Turquía", "name": "Istanbul"},
    {"code": "RAK", "city": "Marrakech", "country": "Marruecos", "name": "Menara"},
    {"code": "CMN", "city": "Casablanca", "country": "Marruecos", "name": "Mohammed V"},
    {"code": "DBV", "city": "Dubrovnik", "country": "Croacia", "name": "Dubrovnik"},
    {"code": "SPU", "city": "Split", "country": "Croacia", "name": "Split"},
    {"code": "ZAG", "city": "Zagreb", "country": "Croacia", "name": "Franjo Tuđman"},
    {"code": "CPH", "city": "Copenhague", "country": "Dinamarca", "name": "Kastrup"},
    {"code": "ARN", "city": "Estocolmo", "country": "Suecia", "name": "Arlanda"},
    {"code": "OSL", "city": "Oslo", "country": "Noruega", "name": "Gardermoen"},
    {"code": "HEL", "city": "Helsinki", "country": "Finlandia", "name": "Vantaa"},
    {"code": "GVA", "city": "Ginebra", "country": "Suiza", "name": "Geneva"},
    {"code": "ZRH", "city": "Zúrich", "country": "Suiza", "name": "Kloten"},
    {"code": "TLV", "city": "Tel Aviv", "country": "Israel", "name": "Ben Gurion"},
    {"code": "JFK", "city": "Nueva York", "country": "Estados Unidos", "name": "John F. Kennedy"},
    {"code": "MIA", "city": "Miami", "country": "Estados Unidos", "name": "Miami International"},
    {"code": "MEX", "city": "Ciudad de México", "country": "México", "name": "Benito Juárez"},
    {"code": "CUN", "city": "Cancún", "country": "México", "name": "Cancún International"},
    {"code": "BOG", "city": "Bogotá", "country": "Colombia", "name": "El Dorado"},
    {"code": "EZE", "city": "Buenos Aires", "country": "Argentina", "name": "Ezeiza"},
    {"code": "GRU", "city": "São Paulo", "country": "Brasil", "name": "Guarulhos"},
]

# Estimated prices (will be replaced by API data in future)
DESTINATION_ESTIMATES = {
    "LIS": {"flight_estimate": 80, "hotel_estimate": 65, "image": "https://images.unsplash.com/photo-1580323956656-26bbb7e19b1e"},
    "OPO": {"flight_estimate": 70, "hotel_estimate": 55, "image": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b"},
    "RAK": {"flight_estimate": 100, "hotel_estimate": 45, "image": "https://images.unsplash.com/photo-1597212618440-806262de4f6b"},
    "FCO": {"flight_estimate": 90, "hotel_estimate": 80, "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5"},
    "CDG": {"flight_estimate": 85, "hotel_estimate": 95, "image": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34"},
    "AMS": {"flight_estimate": 75, "hotel_estimate": 90, "image": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017"},
    "PRG": {"flight_estimate": 65, "hotel_estimate": 50, "image": "https://images.unsplash.com/photo-1541849546-216549ae216d"},
    "BUD": {"flight_estimate": 60, "hotel_estimate": 45, "image": "https://images.unsplash.com/photo-1541343672885-9be56236302a"},
    "ATH": {"flight_estimate": 95, "hotel_estimate": 60, "image": "https://images.unsplash.com/photo-1555993539-1732b0258235"},
    "DBV": {"flight_estimate": 110, "hotel_estimate": 70, "image": "https://images.unsplash.com/photo-1555990538-16d7db2b3ef7"},
    "VIE": {"flight_estimate": 80, "hotel_estimate": 75, "image": "https://images.unsplash.com/photo-1516550893923-42d28e5677af"},
    "BER": {"flight_estimate": 70, "hotel_estimate": 70, "image": "https://images.unsplash.com/photo-1560969184-10fe8719e047"},
    "CPH": {"flight_estimate": 90, "hotel_estimate": 100, "image": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc"},
    "DUB": {"flight_estimate": 85, "hotel_estimate": 85, "image": "https://images.unsplash.com/photo-1549918864-48ac978761a4"},
    "IST": {"flight_estimate": 120, "hotel_estimate": 55, "image": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b"},
    "MXP": {"flight_estimate": 75, "hotel_estimate": 85, "image": "https://images.unsplash.com/photo-1513581166391-887a96ddeafd"},
    "VCE": {"flight_estimate": 85, "hotel_estimate": 120, "image": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0"},
    "NCE": {"flight_estimate": 80, "hotel_estimate": 90, "image": "https://images.unsplash.com/photo-1491166617655-0723a0999cfc"},
}

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    nationality: str = "España"
    language: str = "es"
    city: str = "Madrid"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    nationality: Optional[str] = None
    language: Optional[str] = None
    city: Optional[str] = None

class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood: str
    intensity: float = 0.5
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MoodInput(BaseModel):
    mood: str
    intensity: float = 0.5

class TravelSearchRequest(BaseModel):
    origin_code: str  # Airport code
    origin_city: str
    max_budget: float
    date_from: str  # YYYY-MM-DD
    date_to: str    # YYYY-MM-DD
    adults: int = 2

class SavedExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    experience_id: str
    saved_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
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

# ==================== URL GENERATORS ====================

def generate_skyscanner_url(origin_code: str, dest_code: str, date_out: str, date_in: str, adults: int = 2) -> str:
    """
    Generate Skyscanner search URL
    Format: https://www.skyscanner.es/transporte/vuelos/mad/lis/240415/240418/?adults=2&adultsv2=2&cabinclass=economy
    """
    # Convert date from YYYY-MM-DD to YYMMDD
    try:
        date_out_obj = datetime.strptime(date_out, "%Y-%m-%d")
        date_in_obj = datetime.strptime(date_in, "%Y-%m-%d")
        date_out_fmt = date_out_obj.strftime("%y%m%d")
        date_in_fmt = date_in_obj.strftime("%y%m%d")
    except:
        date_out_fmt = date_out.replace("-", "")[2:]
        date_in_fmt = date_in.replace("-", "")[2:]
    
    return f"https://www.skyscanner.es/transporte/vuelos/{origin_code.lower()}/{dest_code.lower()}/{date_out_fmt}/{date_in_fmt}/?adults={adults}&adultsv2={adults}&cabinclass=economy&currency=EUR"

def generate_booking_url(destination_city: str, checkin: str, checkout: str, adults: int = 2) -> str:
    """
    Generate Booking.com search URL
    """
    city_encoded = quote(destination_city)
    return f"https://www.booking.com/searchresults.es.html?ss={city_encoded}&checkin={checkin}&checkout={checkout}&group_adults={adults}&no_rooms=1&selected_currency=EUR"

def generate_combined_search_url(origin_code: str, dest_code: str, dest_city: str, date_out: str, date_in: str, adults: int = 2) -> dict:
    """Generate both flight and hotel URLs"""
    return {
        "flights_url": generate_skyscanner_url(origin_code, dest_code, date_out, date_in, adults),
        "hotels_url": generate_booking_url(dest_city, date_out, date_in, adults)
    }

# ==================== TRAVEL SEARCH ====================

# Placeholder for future API integration
async def fetch_real_flight_prices(origin: str, destination: str, date_out: str, date_in: str):
    """
    Future: Integrate with Skyscanner API
    For now, returns None to indicate we should use estimates
    """
    if SKYSCANNER_API_KEY:
        # TODO: Implement Skyscanner API call
        # Example endpoint: https://partners.api.skyscanner.net/apiservices/v3/flights/live/search/create
        pass
    return None

async def fetch_real_hotel_prices(destination: str, checkin: str, checkout: str):
    """
    Future: Integrate with Booking.com API
    For now, returns None to indicate we should use estimates
    """
    if BOOKING_API_KEY:
        # TODO: Implement Booking.com API call
        pass
    return None

@api_router.get("/airports/search")
async def search_airports(query: str):
    """Search airports by city name or code"""
    query_lower = query.lower()
    results = []
    for airport in AIRPORTS:
        if (query_lower in airport["city"].lower() or 
            query_lower in airport["code"].lower() or
            query_lower in airport["country"].lower()):
            results.append(airport)
    return results[:10]

@api_router.get("/airports")
async def get_all_airports():
    """Get all airports"""
    return AIRPORTS

@api_router.post("/travel/search")
async def search_travel(request: TravelSearchRequest, user: dict = Depends(get_current_user)):
    """
    Search for travel options within budget.
    Returns estimated prices and direct links to Skyscanner/Booking.
    
    Logic:
    - Flight (round trip) must be <= 50% of max budget
    - Hotel per night must be <= 10% of max budget
    """
    max_flight_budget = request.max_budget * 0.5
    max_hotel_budget = request.max_budget * 0.1
    
    try:
        date_from = datetime.strptime(request.date_from, "%Y-%m-%d")
        date_to = datetime.strptime(request.date_to, "%Y-%m-%d")
        nights = (date_to - date_from).days
        if nights <= 0:
            nights = 2
    except:
        nights = 2
    
    matching_destinations = []
    
    for dest_code, dest_info in DESTINATION_ESTIMATES.items():
        # Skip if origin is same as destination
        if dest_code == request.origin_code:
            continue
            
        # Get airport info for destination
        dest_airport = next((a for a in AIRPORTS if a["code"] == dest_code), None)
        if not dest_airport:
            continue
        
        # Calculate estimated costs
        flight_cost = dest_info["flight_estimate"] * 2 * request.adults  # Round trip for all adults
        hotel_cost = dest_info["hotel_estimate"] * nights
        total_cost = flight_cost + hotel_cost
        
        # Check if within budget constraints
        if flight_cost <= max_flight_budget and dest_info["hotel_estimate"] <= max_hotel_budget:
            # Generate real search URLs
            urls = generate_combined_search_url(
                request.origin_code,
                dest_code,
                dest_airport["city"],
                request.date_from,
                request.date_to,
                request.adults
            )
            
            matching_destinations.append({
                "destination_code": dest_code,
                "destination": dest_airport["city"],
                "country": dest_airport["country"],
                "image": dest_info["image"],
                "flight_estimate": flight_cost,
                "hotel_estimate_per_night": dest_info["hotel_estimate"],
                "hotel_estimate_total": hotel_cost,
                "total_estimate": total_cost,
                "nights": nights,
                "adults": request.adults,
                "within_budget": total_cost <= request.max_budget,
                "savings_estimate": max(0, request.max_budget - total_cost),
                "flights_url": urls["flights_url"],
                "hotels_url": urls["hotels_url"],
                "is_estimate": True  # Flag to indicate these are estimates, not live prices
            })
    
    # Sort by total cost
    matching_destinations.sort(key=lambda x: x["total_estimate"])
    
    return {
        "origin": {
            "code": request.origin_code,
            "city": request.origin_city
        },
        "search_params": {
            "max_budget": request.max_budget,
            "date_from": request.date_from,
            "date_to": request.date_to,
            "nights": nights,
            "adults": request.adults
        },
        "budget_breakdown": {
            "max_for_flights": max_flight_budget,
            "max_for_hotel_per_night": max_hotel_budget
        },
        "destinations": matching_destinations[:8],
        "note": "Precios estimados. Haz clic en los enlaces para ver precios actuales en Skyscanner y Booking.",
        "api_status": {
            "skyscanner_connected": bool(SKYSCANNER_API_KEY),
            "booking_connected": bool(BOOKING_API_KEY)
        }
    }

# ==================== CONTENT DATA ====================

DAILY_QUOTES = [
    {"quote": "Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.", "author": "Carl Jung"},
    {"quote": "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.", "author": "Brian Tracy"},
    {"quote": "No es la montaña lo que conquistamos, sino a nosotros mismos.", "author": "Edmund Hillary"},
    {"quote": "La única manera de hacer un gran trabajo es amar lo que haces.", "author": "Steve Jobs"},
    {"quote": "El secreto del cambio es enfocar toda tu energía en construir lo nuevo.", "author": "Sócrates"},
    {"quote": "La vida es lo que pasa mientras estás ocupado haciendo otros planes.", "author": "John Lennon"},
    {"quote": "Conocer a otros es inteligencia; conocerte a ti mismo es verdadera sabiduría.", "author": "Lao Tzu"},
    {"quote": "La felicidad no es algo que pospones para el futuro; es algo que diseñas para el presente.", "author": "Jim Rohn"},
    {"quote": "El que tiene un porqué para vivir, puede soportar casi cualquier cómo.", "author": "Friedrich Nietzsche"},
    {"quote": "El viaje de mil millas comienza con un solo paso.", "author": "Lao Tzu"},
    {"quote": "La mejor forma de predecir el futuro es creándolo.", "author": "Peter Drucker"},
    {"quote": "Lo que niegas te somete. Lo que aceptas te transforma.", "author": "Carl Jung"},
    {"quote": "La paz viene de dentro. No la busques fuera.", "author": "Buda"},
]

RECOMMENDED_MOVIES = [
    {"title": "Into the Wild", "year": 2007, "genre": "Aventura/Drama", "description": "Un joven abandona todo para vivir en la naturaleza."},
    {"title": "Comer, Rezar, Amar", "year": 2010, "genre": "Drama", "description": "Una mujer viaja buscando encontrarse a sí misma."},
    {"title": "El Secreto de Walter Mitty", "year": 2013, "genre": "Aventura", "description": "Un soñador emprende una aventura épica."},
    {"title": "Soul", "year": 2020, "genre": "Animación", "description": "Un músico descubre qué hace que la vida valga la pena."},
    {"title": "Amélie", "year": 2001, "genre": "Comedia/Romance", "description": "Una joven parisina decide hacer felices a los demás."},
    {"title": "Wild", "year": 2014, "genre": "Drama/Aventura", "description": "Una mujer recorre sola el Pacific Crest Trail."},
    {"title": "Up", "year": 2009, "genre": "Animación/Aventura", "description": "Un anciano cumple su sueño de aventura."},
    {"title": "Coco", "year": 2017, "genre": "Animación", "description": "Un niño descubre la importancia de la familia."},
]

RECOMMENDED_BOOKS = [
    {"title": "El Alquimista", "author": "Paulo Coelho", "genre": "Ficción filosófica"},
    {"title": "Ikigai", "author": "Héctor García", "genre": "Desarrollo personal"},
    {"title": "El poder del ahora", "author": "Eckhart Tolle", "genre": "Espiritualidad"},
    {"title": "Atomic Habits", "author": "James Clear", "genre": "Desarrollo personal"},
    {"title": "Siddhartha", "author": "Hermann Hesse", "genre": "Ficción filosófica"},
]

COFFEE_PLACES = [
    {"name": "Café de especialidad local", "tip": "Busca cafeterías con tostado propio"},
    {"name": "Librería-cafetería", "tip": "Combina lectura con buen café"},
    {"name": "Café con terraza tranquila", "tip": "Ideal para observar y reflexionar"},
]

FOOD_OPTIONS = [
    {"name": "Cocina mediterránea casera", "description": "Ingredientes frescos y sabores reconfortantes"},
    {"name": "Sushi hecho en casa", "description": "Disfruta preparando algo diferente juntos"},
    {"name": "Pasta italiana artesanal", "description": "Desde cero, una experiencia culinaria"},
    {"name": "Tapas variadas", "description": "Pequeños bocados para compartir"},
    {"name": "Fondue de queso", "description": "Perfecto para compartir y conversar"},
]

def get_daily_quote():
    day_of_year = datetime.utcnow().timetuple().tm_yday
    return DAILY_QUOTES[day_of_year % len(DAILY_QUOTES)]

def get_random_movie():
    return random.choice(RECOMMENDED_MOVIES)

def get_random_book():
    return random.choice(RECOMMENDED_BOOKS)

def get_random_coffee_place():
    return random.choice(COFFEE_PLACES)

def get_random_food_options():
    return random.sample(FOOD_OPTIONS, min(3, len(FOOD_OPTIONS)))

# ==================== EXPERIENCES ====================

DEMO_EXPERIENCES = [
    # Travel experiences
    {
        "id": "exp-1", "title": "Escapada a la Naturaleza", "description": "Desconecta del ruido y reconecta con la naturaleza.",
        "short_description": "Desconecta del ruido", "category": "nature", "tags": ["naturaleza", "relax"],
        "image_url": "https://images.unsplash.com/photo-1560199738-3d933bc1e714", "duration": "2-3 días",
        "location": "Destinos naturales", "affiliate_link_placeholder": "", "mood_tags": ["need_change", "disconnect"],
        "is_express": False, "is_home_activity": False, "is_travel": True
    },
    {
        "id": "exp-2", "title": "Aventura en la Montaña", "description": "Siente la adrenalina de las alturas.",
        "short_description": "Conquista nuevas cimas", "category": "mountain", "tags": ["montaña", "aventura"],
        "image_url": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606", "duration": "3-4 días",
        "location": "Montañas", "affiliate_link_placeholder": "", "mood_tags": ["adventure", "need_change"],
        "is_express": False, "is_home_activity": False, "is_travel": True
    },
    {
        "id": "exp-3", "title": "Relax en la Playa", "description": "Deja que el mar se lleve tus preocupaciones.",
        "short_description": "Relax junto al mar", "category": "beach", "tags": ["playa", "relax"],
        "image_url": "https://images.unsplash.com/photo-1505142468610-359e7d316be0", "duration": "4-5 días",
        "location": "Costas", "affiliate_link_placeholder": "", "mood_tags": ["disconnect", "couple"],
        "is_express": False, "is_home_activity": False, "is_travel": True
    },
    {
        "id": "exp-4", "title": "Escapada Romántica", "description": "Un fin de semana especial para dos.",
        "short_description": "Momentos para dos", "category": "couple", "tags": ["romántico", "pareja"],
        "image_url": "https://images.pexels.com/photos/19763210/pexels-photo-19763210.jpeg", "duration": "2-3 días",
        "location": "Destinos románticos", "affiliate_link_placeholder": "", "mood_tags": ["couple"],
        "is_express": False, "is_home_activity": False, "is_travel": True
    },
    # Cultural escape
    {
        "id": "exp-5", "title": "Escapada a Nuevas Culturas", "description": "Sumérgete en tradiciones, gastronomía y costumbres de otros lugares. Descubre mercados locales, museos y barrios con historia.",
        "short_description": "Descubre nuevas tradiciones", "category": "urban", "tags": ["cultura", "gastronomía", "historia"],
        "image_url": "https://images.unsplash.com/photo-1533105079780-92b9be482077", "duration": "3-5 días",
        "location": "Ciudades con historia", "affiliate_link_placeholder": "", "mood_tags": ["need_change", "adventure", "disconnect"],
        "is_express": False, "is_home_activity": False, "is_travel": True
    },
    # Local nature
    {
        "id": "exp-local-1", "title": "Descubre un Sendero Local", "description": "Explora rutas de senderismo cerca de tu ciudad.",
        "short_description": "Trekking sin salir de tu zona", "category": "local_nature", "tags": ["trekking", "naturaleza"],
        "image_url": "https://images.unsplash.com/photo-1560199738-3d933bc1e714", "duration": "Medio día",
        "location": "Cerca de tu ciudad", "affiliate_link_placeholder": "", "mood_tags": ["need_change", "disconnect", "adventure"],
        "is_express": True, "is_home_activity": False, "is_travel": False
    },
    {
        "id": "exp-local-2", "title": "Bosque Urbano", "description": "Descubre el pulmón verde de tu ciudad.",
        "short_description": "Naturaleza en tu ciudad", "category": "local_nature", "tags": ["bosque", "naturaleza"],
        "image_url": "https://images.unsplash.com/photo-1612056026402-ac9e86c277e0", "duration": "2-3 horas",
        "location": "Tu ciudad", "affiliate_link_placeholder": "", "mood_tags": ["disconnect", "indecisive"],
        "is_express": True, "is_home_activity": False, "is_travel": False
    },
    # Express plans
    {
        "id": "exp-express-1", "title": "Cena Sorpresa", "description": "Reserva en un restaurante nuevo.",
        "short_description": "Descubre un restaurante nuevo", "category": "express", "tags": ["gastronomía", "ciudad"],
        "image_url": "https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg", "duration": "2-3 horas",
        "location": "Tu ciudad", "affiliate_link_placeholder": "", "mood_tags": ["indecisive", "need_change", "couple"],
        "is_express": True, "is_home_activity": False, "food_options": True
    },
    {
        "id": "exp-express-2", "title": "Descubre este Parque", "description": "Explora un parque que no conoces bien.",
        "short_description": "Explora espacios verdes", "category": "express", "tags": ["parque", "naturaleza"],
        "image_url": "https://images.pexels.com/photos/33972315/pexels-photo-33972315.jpeg", "duration": "2-3 horas",
        "location": "Tu ciudad", "affiliate_link_placeholder": "", "mood_tags": ["indecisive", "disconnect", "couple"],
        "is_express": True, "is_home_activity": False
    },
    {
        "id": "exp-express-3", "title": "Café y Libro", "description": "Ve a una cafetería con encanto y disfruta de la lectura.",
        "short_description": "Momento de calma con lectura", "category": "express", "tags": ["café", "relax"],
        "image_url": "https://images.unsplash.com/photo-1556740767-414a9c4860c1", "duration": "1-2 horas",
        "location": "Tu ciudad", "affiliate_link_placeholder": "", "mood_tags": ["indecisive", "disconnect"],
        "is_express": True, "is_home_activity": False, "has_recommendations": True
    },
    # Home activities
    {
        "id": "exp-home-1", "title": "Sesión de Yoga", "description": "20 minutos de yoga para estirar y calmar.",
        "short_description": "Estira tu cuerpo", "category": "home", "tags": ["yoga", "bienestar"],
        "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b", "duration": "20 minutos",
        "location": "En casa", "affiliate_link_placeholder": "", "mood_tags": ["disconnect", "indecisive", "need_change"],
        "is_express": False, "is_home_activity": True
    },
    {
        "id": "exp-home-2", "title": "Meditación Guiada", "description": "10 minutos para encontrar tu centro.",
        "short_description": "Encuentra tu paz interior", "category": "home", "tags": ["meditación", "mindfulness"],
        "image_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773", "duration": "10-15 minutos",
        "location": "En casa", "affiliate_link_placeholder": "", "mood_tags": ["disconnect", "indecisive"],
        "is_express": False, "is_home_activity": True
    },
    {
        "id": "exp-home-3", "title": "Carrera Rápida", "description": "15-20 minutos corriendo para liberar endorfinas.",
        "short_description": "15-20 minutos para activarte", "category": "home", "tags": ["running", "deporte"],
        "image_url": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571", "duration": "15-20 minutos",
        "location": "Tu barrio", "affiliate_link_placeholder": "", "mood_tags": ["need_change", "adventure", "indecisive"],
        "is_express": False, "is_home_activity": True
    },
    {
        "id": "exp-home-4", "title": "Noche de Película", "description": "Prepara palomitas y disfruta de cine en casa.",
        "short_description": "Cine en casa", "category": "home", "tags": ["película", "relax"],
        "image_url": "https://images.pexels.com/photos/9807998/pexels-photo-9807998.jpeg", "duration": "2-3 horas",
        "location": "En casa", "affiliate_link_placeholder": "", "mood_tags": ["indecisive", "disconnect", "couple"],
        "is_express": False, "is_home_activity": True, "has_movie_recommendation": True
    },
    {
        "id": "exp-home-5", "title": "Cena Especial en Casa", "description": "Cocina algo especial con velas y música.",
        "short_description": "Transforma tu cena", "category": "home", "tags": ["cocina", "romántico"],
        "image_url": "https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg", "duration": "1-2 horas",
        "location": "En casa", "affiliate_link_placeholder": "", "mood_tags": ["couple", "indecisive"],
        "is_express": False, "is_home_activity": True, "food_options": True
    }
]

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id, "email": user.email.lower(), "password_hash": hash_password(user.password),
        "name": user.name, "nationality": user.nationality, "language": user.language,
        "city": user.city, "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    return {"token": token, "user": {"id": user_id, "email": user.email.lower(), "name": user.name,
            "nationality": user.nationality, "language": user.language, "city": user.city}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"],
            "nationality": user["nationality"], "language": user["language"], "city": user.get("city", "Tu ciudad")}}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"],
            "nationality": user["nationality"], "language": user["language"], "city": user.get("city", "Tu ciudad")}

@api_router.put("/auth/profile")
async def update_profile(update: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user["id"]})
    return {"id": updated_user["id"], "email": updated_user["email"], "name": updated_user["name"],
            "nationality": updated_user["nationality"], "language": updated_user["language"], "city": updated_user.get("city", "Tu ciudad")}

# ==================== MOOD ENDPOINTS ====================

MOOD_TRANSLATIONS = {"need_change": "Necesito un cambio", "disconnect": "Quiero desconectar",
                     "adventure": "Ganas de aventura", "couple": "Planes de pareja", "indecisive": "No sé qué hacer"}
TRAVELER_TYPES = {"need_change": "Buscador de Cambios", "disconnect": "Explorador Zen",
                  "adventure": "Aventurero Nato", "couple": "Romántico Viajero", "indecisive": "Espíritu Libre"}

@api_router.post("/mood/analyze")
async def analyze_mood(mood_input: MoodInput, user: dict = Depends(get_current_user)):
    mood_entry = MoodEntry(user_id=user["id"], mood=mood_input.mood, intensity=mood_input.intensity)
    await db.mood_entries.insert_one(mood_entry.dict())
    
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(10).to_list(10)
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    total = sum(mood_counts.values()) or 1
    mood_percentages = {MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) for k, v in mood_counts.items()}
    
    matching_experiences = []
    home_exp = [e for e in DEMO_EXPERIENCES if mood_input.mood in e.get("mood_tags", []) and e.get("is_home_activity")]
    express_exp = [e for e in DEMO_EXPERIENCES if mood_input.mood in e.get("mood_tags", []) and e.get("is_express")]
    travel_exp = [e for e in DEMO_EXPERIENCES if mood_input.mood in e.get("mood_tags", []) and e.get("is_travel")]
    
    if home_exp: matching_experiences.append(random.choice(home_exp))
    if express_exp: matching_experiences.append(random.choice(express_exp))
    if travel_exp: matching_experiences.extend(random.sample(travel_exp, min(2, len(travel_exp))))
    
    daily_quote = get_daily_quote()
    user_city = user.get("city", "tu ciudad")
    ai_message, quick_routine = "", ""
    
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"tripinn-{user['id']}-{datetime.utcnow().timestamp()}",
                system_message=f"Eres TripInn, asistente de bienestar cálido. Usuario vive en {user_city}. Responde en español, breve y positivo. Sin markdown."
            ).with_model("openai", "gpt-4o")
            prompt = f"Usuario se siente: {MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood)}. Ciudad: {user_city}\nDa mensaje motivador (2 frases) y actividad rápida (20 min).\nFormato:\nMENSAJE: [texto]\nRUTINA: [actividad] - [cómo]"
            response = await chat.send_message(UserMessage(text=prompt))
            for line in response.strip().split('\n'):
                if line.startswith('MENSAJE:'): ai_message = line.replace('MENSAJE:', '').strip()
                elif line.startswith('RUTINA:'): quick_routine = line.replace('RUTINA:', '').strip()
        except Exception as e:
            logger.error(f"AI error: {e}")
    
    if not ai_message:
        ai_message = "¡Hoy es un gran día para hacer algo diferente!"
        quick_routine = "Sal a dar un paseo de 10 minutos sin móvil."
    
    return {"ai_message": ai_message, "quick_routine": quick_routine, "experiences": matching_experiences,
            "mood_profile": {"current_mood": mood_input.mood, "mood_label": MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood),
                            "percentages": mood_percentages, "traveler_type": TRAVELER_TYPES.get(mood_input.mood, "Explorador")},
            "daily_quote": daily_quote}

@api_router.get("/mood/history")
async def get_mood_history(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(30).to_list(30)
    return [{"id": e["id"], "mood": e["mood"], "mood_label": MOOD_TRANSLATIONS.get(e["mood"], e["mood"]),
             "intensity": e["intensity"], "timestamp": e["timestamp"]} for e in history]

@api_router.get("/mood/profile")
async def get_emotional_profile(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).to_list(100)
    if not history:
        return {"dominant_mood": None, "mood_percentages": {}, "traveler_type": "Nuevo Explorador", "total_entries": 0}
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    total = sum(mood_counts.values())
    mood_percentages = {MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) for k, v in mood_counts.items()}
    dominant = max(mood_counts, key=mood_counts.get)
    return {"dominant_mood": MOOD_TRANSLATIONS.get(dominant, dominant), "mood_percentages": mood_percentages,
            "traveler_type": TRAVELER_TYPES.get(dominant, "Explorador"), "total_entries": total}

@api_router.get("/quote/daily")
async def get_quote():
    return get_daily_quote()

@api_router.get("/recommendations/movie")
async def get_movie_recommendation():
    return get_random_movie()

@api_router.get("/recommendations/book")
async def get_book_recommendation():
    return get_random_book()

@api_router.get("/recommendations/coffee")
async def get_coffee_recommendation():
    return {"place": get_random_coffee_place(), "book": get_random_book()}

@api_router.get("/recommendations/food")
async def get_food_recommendations():
    return get_random_food_options()

@api_router.get("/experiences")
async def get_experiences(category: Optional[str] = None, express_only: bool = False, home_only: bool = False, travel_only: bool = False):
    experiences = DEMO_EXPERIENCES
    if express_only: experiences = [e for e in experiences if e.get("is_express")]
    elif home_only: experiences = [e for e in experiences if e.get("is_home_activity")]
    elif travel_only: experiences = [e for e in experiences if e.get("is_travel")]
    elif category and category != "all":
        if category == "local_nature": experiences = [e for e in experiences if e.get("category") == "local_nature"]
        else: experiences = [e for e in experiences if e.get("category") == category]
    return experiences

@api_router.get("/experiences/{experience_id}")
async def get_experience(experience_id: str):
    for exp in DEMO_EXPERIENCES:
        if exp["id"] == experience_id:
            result = dict(exp)
            if exp.get("has_movie_recommendation"): result["movie_recommendation"] = get_random_movie()
            if exp.get("has_recommendations"): result["coffee_recommendation"] = get_random_coffee_place(); result["book_recommendation"] = get_random_book()
            if exp.get("food_options"): result["food_recommendations"] = get_random_food_options()
            return result
    raise HTTPException(status_code=404, detail="Experiencia no encontrada")

@api_router.get("/experiences/categories/list")
async def get_categories():
    return [{"id": "all", "name": "Todos", "icon": "grid"}, {"id": "express", "name": "Express", "icon": "flash"},
            {"id": "home", "name": "En Casa", "icon": "home"}, {"id": "local_nature", "name": "Naturaleza Local", "icon": "leaf"},
            {"id": "couple", "name": "Pareja", "icon": "heart"}, {"id": "travel", "name": "Escapadas", "icon": "airplane"}]

@api_router.post("/saved/{experience_id}")
async def save_experience(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({"user_id": user["id"], "experience_id": experience_id})
    if existing: return {"message": "Ya guardada", "saved": True}
    saved = SavedExperience(user_id=user["id"], experience_id=experience_id)
    await db.saved_experiences.insert_one(saved.dict())
    return {"message": "Guardada", "saved": True}

@api_router.delete("/saved/{experience_id}")
async def unsave_experience(experience_id: str, user: dict = Depends(get_current_user)):
    await db.saved_experiences.delete_one({"user_id": user["id"], "experience_id": experience_id})
    return {"message": "Eliminada", "saved": False}

@api_router.get("/saved")
async def get_saved_experiences(user: dict = Depends(get_current_user)):
    saved = await db.saved_experiences.find({"user_id": user["id"]}).to_list(100)
    saved_ids = [s["experience_id"] for s in saved]
    return [exp for exp in DEMO_EXPERIENCES if exp["id"] in saved_ids]

@api_router.get("/saved/check/{experience_id}")
async def check_saved(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({"user_id": user["id"], "experience_id": experience_id})
    return {"saved": existing is not None}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "app": "TripInn API", "version": "2.0.0"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_db_client():
    logger.info("TripInn API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
