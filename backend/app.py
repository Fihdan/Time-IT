import os
import secrets
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, Response, Request, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from db import DBManager
from support import create_directory
import shutil
import db
from pathlib import Path
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
db = DBManager(db_path="ECHO_DB.db")
db.create_tables()


def issue_session(login: str, response: Response):
    id_session = secrets.token_urlsafe(32)
    csrftoken = secrets.token_urlsafe(32)
    db.save_session_cookies(login, id_session, csrftoken)
    response.set_cookie("id_session", id_session, httponly=True, max_age=60 * 60 * 24 * 30)
    response.set_cookie("csrftoken", csrftoken, max_age=60 * 60 * 24 * 30)


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.31.249:5173",  # Адрес вашего фронтенда из скриншота
    "http://192.168.31.173:5173",
]

# 3. Добавляем middleware в приложение
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Разрешаем запросы с этих адресов
    allow_credentials=True,           # КРИТИЧЕСКИ ВАЖНО для передачи COOKIES
    allow_methods=["*"],              # Разрешаем любые методы (GET, POST и т.д.)
    allow_headers=["*"],              # Разрешаем любые заголовки
)
@app.get("/")
def start():
    return "Server correct."

@app.post("/register")  # без завершающего слэша, чтобы не было 307
def register(login: str, password: str, response: Response, email: str = None,
             first_name: str = None, last_name: str = None):
    ok = db.add_user(login, password, email, first_name, last_name)
    if ok:
        issue_session(login, response)
    return ok

@app.post("/auth")  # фронт шлёт POST, раньше был GET -> 405
def auth(login: str, password: str, response: Response):
    if db.auth(login) == password:
        issue_session(login, response)
        return True
    return False

@app.post("/recovery_password")
def recovery_password(login: str):
    email = db.get_email_by_users(login)
    user_password = db.auth(login)


    smtp_server = os.getenv('SMTP_SERVER')  # по IP-адресу Gmail разрывает соединение (WebLoginRequired)
    smtp_port = int(os.getenv('SMTP_PORT'))
    sender_email = os.getenv('SENDER_EMAIL')
    password = os.getenv('SENDER_PASSWORD')  # Используйте пароль приложения, а не основной пароль
    receiver_email = email

    # Создание сообщения
    message = MIMEMultipart()
    message['From'] = sender_email
    message['To'] = receiver_email
    message['Subject'] = 'Восстановление пароля'

    body = f'Привет, {login}, твой пароль: {user_password}'
    message.attach(MIMEText(body, 'plain'))

    try:
        # Подключение к серверу и отправка
        server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
        server.login(sender_email, password)
        server.send_message(message)
        server.quit()
        return email
    except Exception as e:
        # SMTP недоступен (неверный пароль приложения, блокировка и т.п.) — логируем причину
        print(f"[recovery_password] SMTP error for '{login}': {type(e).__name__}: {e}")
        # dev-fallback: сохраняем письмо в файл, чтобы восстановление работало без реального SMTP
        try:
            os.makedirs("emails", exist_ok=True)
            path = f"emails/{login}.txt"
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"To: {email}\nSubject: Восстановление пароля\n\n{body}\n")
            print(f"[recovery_password] dev-fallback: письмо сохранено в {path}")
            return email
        except Exception as e2:
            print(f"[recovery_password] fallback error: {e2}")
            return None

@app.post("/create_card") #work
def create_card(login: str, card_name: str):
    try: 
        index = int(db.add_card(login, card_name))
        create_directory(index)
        return index
    except:
        return False

@app.get("/get_all_names_card_by_user") #work
def get_all_names_card_by_user(login: str):
    return db.get_all_names_card_by_user(login)

@app.post("/update_voice_mix")#work
def update_voice_mix(id_card: int, new_voice_mix: int):
    return db.update_voice_mix(id_card, new_voice_mix)

@app.post("/update_music_mix")#work
def update_voice_mix(id_card: int, new_music_mix: int):
    return db.update_music_mix(id_card, new_music_mix)

@app.get("/get_music_mix")#work
def get_music_mix(id_card: int):
    return db.get_music_mix(id_card)

@app.get("/get_voice_mix")#work
def get_voice_mix(id_card: int):
    return db.get_voice_mix(id_card)

@app.post("/update_card_name") # work
def update_card_name(id_card: int, new_card_name: str):
    return db.update_card_name(id_card, new_card_name)

@app.get("/get_card_name") # work
def get_card_name(id_card: int):
    return db.get_card_name(id_card)

@app.post("/update_voice")#work
def update_voice(id_card: int, file: UploadFile = File(...)):
    create_directory(id_card)
    main_folder = Path(f"save/{id_card}/voice_music_svg")
    type_file = Path(file.filename or "voice.webm").suffix
    new_name = f"voice{type_file}"
    new_file_path = main_folder / new_name

    voice_path_db = db.check_voice_path(id_card)
    voice_path = Path(voice_path_db) if voice_path_db else None
    if voice_path is not None and voice_path.is_file():
        voice_path.unlink()
    
    try:
        with open(new_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db.update_voice_path(id_card, rf"{new_file_path}")

        return True
    except:
        return False

@app.get("/get_voice") #work
def get_voice(id_card: int):
    path = db.check_voice_path(id_card)
    if not path == None:
        return FileResponse(path=path)
    return None

@app.post("/update_music")#work
def update_music(id_card: int, file: UploadFile = File(...)):
    create_directory(id_card)
    main_folder = Path(f"save/{id_card}/voice_music_svg")
    type_file = Path(file.filename).suffix
    new_name = f"music{type_file}"
    new_file_path = main_folder / new_name

    music_path_db = db.check_music_path(id_card)
    music_path = Path(music_path_db) if music_path_db else None
    if music_path is not None and music_path.is_file():
        music_path.unlink()
    
    try:
        with open(new_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db.update_music_path(id_card, rf"{new_file_path}")

        return True
    except:
        return False
    
@app.get("/get_music") #work
def get_music(id_card: int):
    path = db.check_music_path(id_card)
    if not path == None:
        return FileResponse(path=path)
    return None

@app.post("/update_svg")#work
def update_svg(id_card: int, file: UploadFile = File(...)):
    create_directory(id_card)
    main_folder = Path(f"save/{id_card}/voice_music_svg")
    type_file = Path(file.filename).suffix
    new_name = f"svg{type_file}"
    new_file_path = main_folder / new_name

    svg_path_db = db.check_svg_path(id_card)
    svg_path = Path(svg_path_db) if svg_path_db else None
    if svg_path is not None and svg_path.is_file():
        svg_path.unlink()
    
    try:
        with open(new_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db.update_svg_path(id_card, rf"{new_file_path}")

        return True
    except:
        return False

@app.get("/get_svg") #work
def get_svg(id_card: int):
    path = db.check_svg_path(id_card)
    if not path == None:
        return FileResponse(path=path)
    return None

@app.post("/create_text")
def create_text(id_card: int): #work
    return db.create_text(id_card)

@app.post("/update_text_by_text")
def update_text_by_text(id_text: int, text: str):#work
    return db.update_text_by_text(id_text, text)

@app.post("/update_position_x_by_text")
def update_text_by_text(id_text: int, x: int):#work
    return db.update_position_x_by_text(id_text, x)

@app.post("/update_position_y_by_text")
def update_text_by_text(id_text: int, y: int):#work
    return db.update_position_y_by_text(id_text, y)

@app.post("/update_position_z_by_text")
def update_text_by_text(id_text: int, z: int):#work
    return db.update_position_z_by_text(id_text, z)

@app.post("/update_position_w_by_text")
def update_text_by_text(id_text: int, w: int):#work
    return db.update_position_w_by_text(id_text, w)

@app.post("/update_size_by_text")#work
def update_size_by_text(id_text: int, size: int):
    return db.update_size_by_text(id_text, size)

@app.post("/update_font_by_text")#work
def update_font_by_text(id_text: int, font: str):
    return db.update_font_by_text(id_text, font)

@app.post("/update_color_by_text")#work
def update_color_by_text(id_text: int, color: str):
    return db.update_color_by_text(id_text, color)

@app.post("/update_align_by_text")#work
def update_color_by_text(id_text: int, align: str):
    return db.update_align_by_text(id_text, align)

@app.get("/get_text_by_text")#work
def get_text_by_text(id_text: int):
    return db.get_text_by_text(id_text)

@app.get("/get_position_x_by_text")#work
def get_position_x_by_text(id_text: int):
    return db.get_position_x_by_text(id_text)

@app.get("/get_position_y_by_text")#work
def get_position_y_by_text(id_text: int):
    return db.get_position_y_by_text(id_text)

@app.get("/get_position_w_by_text")#work
def get_position_w_by_text(id_text: int):
    return db.get_position_w_by_text(id_text)

@app.get("/get_position_z_by_text")#work
def get_position_z_by_text(id_text: int):
    return db.get_position_z_by_text(id_text)

@app.get("/get_size_by_text")#work
def get_size_by_text(id_text: int):
    return db.get_size_by_text(id_text)

@app.get("/get_font_by_text")#work
def get_font_by_text(id_text: int):
    return db.get_font_by_text(id_text)

@app.get("/get_color_by_text")#work
def get_color_by_text(id_text: int):
    return db.get_color_by_text(id_text)

@app.get("/get_align_by_text")#work
def get_align_text(id_text: int):
    return db.get_align_by_text(id_text)

@app.get("/get_all_texts_by_card")#work
def get_all_texts_by_card(id_card: int):
    return db.get_all_texts_by_card(id_card)

@app.post("/create_image")
def create_image(id_card: int):
    return db.create_image(id_card)

@app.post("/update_position_x_by_image")
def update_position_x_by_image( id_image: int, x: int):
    return db.update_position_x_by_image(id_image, x)

@app.post("/update_position_y_by_image")
def update_position_y_by_image(  id_image: int, y: int):
    return db.update_position_y_by_image(id_image, y)

@app.post("/update_position_w_by_image")
def update_position_w_by_image(  id_image: int, w: int):
    return db.update_position_w_by_image(id_image, w)

@app.post("/update_position_h_by_image")
def update_position_h_by_image(  id_image: int, h: int):
    return db.update_position_h_by_image(id_image, h)

@app.post("/update_position_z_by_image")
def update_position_z_by_image(  id_image: int, z: int):
    return db.update_position_z_by_image(id_image, z)

@app.post("/update_angle_by_image")
def update_angle_by_image(id_image: int, angle: int):
    return db.update_angle_by_image(id_image, angle)

@app.get("/get_position_x_by_image")
def get_position_x_by_image(id_image: int):
    return db.get_position_x_by_image(id_image)

@app.get("/get_position_y_by_image")
def get_position_y_by_image(id_image: int):
    return db.get_position_y_by_image(id_image)

@app.get("/get_position_w_by_image")
def get_position_w_by_image(id_image: int):
    return db.get_position_w_by_image(id_image)

@app.get("/get_position_h_by_image")
def get_position_h_by_image(id_image: int):
    return db.get_position_h_by_image(id_image)

@app.get("/get_position_z_by_image")
def get_position_z_by_image(id_image: int):
    return db.get_position_z_by_image(id_image)

@app.get("/get_angle_by_image")
def get_angle_by_image(id_image: int):
    return db.get_angle_by_image(id_image)

@app.get("/get_all_images_by_card")
def get_all_images_by_card(id_card: int):
    return db.get_all_images_by_card(id_card)

@app.get("/get_image")
def get_image(id_image:int):
    image_path =  db.check_image_path(id_image)
    if not image_path == None:
        return FileResponse(path=image_path)
    return None

@app.post("/update_image")#work
def update_image(id_image: int, file: UploadFile = File(...)):
    id_card = db.get_card_by_image(id_image)
    create_directory(id_card)
    main_folder = Path(f"save/{id_card}/images")
    type_file = Path(file.filename).suffix
    new_name = f"image_{len(db.get_all_images_by_card(id_card))+1}{type_file}"
    new_file_path = main_folder / new_name

    image_path_db = db.check_image_path(id_image)
    image_path = Path(image_path_db) if image_path_db else None
    if image_path is not None and image_path.is_file():
        image_path.unlink()
    
    try:
        with open(new_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db.update_image_path(id_image, rf"{new_file_path}")

        return True
    except:
        return False

@app.post("/delete_text") #work
def del_all_by_text(id_text: int):
    return db.del_all_by_text(id_text)

@app.post("/delete_image")#work
def delete_image_path(id_image: int):
    image_path_db = db.check_image_path(id_image)
    image_path = Path(image_path_db) if image_path_db else None

    if image_path is not None and image_path.is_file():
        image_path.unlink()
        
    try:
        db.del_all_by_image(id_image)
        return True
    except:
        return False


@app.post("/delete_svg")
def delete_svg_path(id_card: int):
    svg_path_db = db.check_svg_path(id_card)
    svg_path = Path(svg_path_db) if svg_path_db else None

    if svg_path is not None and svg_path.is_file():
        svg_path.unlink()
        
    try:
        db.update_svg_path(id_card, None)
        return True
    except:
        return False

@app.post("/delete_voice")
def delete_voice_path(id_card: int):
    voice_path_db = db.check_voice_path(id_card)
    voice_path = Path(voice_path_db) if voice_path_db else None

    if voice_path is not None and voice_path.is_file():
        voice_path.unlink()
        
    try:
        db.update_voice_path(id_card, None)
        return True
    except:
        return False

@app.post("/delete_music")
def delete_music_path(id_card: int):
    music_path_db = db.check_music_path(id_card)
    music_path = Path(music_path_db) if music_path_db else None

    if music_path is not None and music_path.is_file():
        music_path.unlink()
        
    try:
        db.update_music_path(id_card, None)
        return True
    except:
        return False
        
@app.post("/delete_card") #works
def delete_card(id_card: int):
    card_dir = Path(f"save/{id_card}") 
    
    if card_dir.exists() and card_dir.is_dir():
        shutil.rmtree(card_dir)
    return db.del_all_by_card(id_card)

@app.post("/get_profile") #work
def get_profile(login: str):
    return db.get_profile(login)

def _norm_date(s: str):
    """Приводит дату к UTC-строке вида 2026-10-16T12:00:00Z; None, если формат неверный."""
    try:
        d = datetime.fromisoformat(s.strip().replace("Z", "+00:00").replace(" ", "T"))
    except ValueError:
        return None
    if d.tzinfo is None:  # без часового пояса считаем UTC
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

@app.post("/update_start")
def update_start(id_card: int, date_start: str):
    norm = _norm_date(date_start)
    if norm is None:
        return False  # фронт воспринимает false как ошибку сохранения
    return db.update_date_start(id_card, norm)

@app.post("/update_end")
def update_end(id_card: int, date_end: str):
    return db.update_date_end(id_card, date_end)

@app.post("/del_date_start")
def del_date_start(id_card: int):
    return db.del_date_start(id_card)

@app.post("/del_date_end")
def del_date_end(id_card: int):
    return db.del_date_end(id_card)

@app.get("/get_date_start")
def get_date_start(id_card: int):
    return db.get_date_strat(id_card)

@app.get("/get_date_end")
def get_date_end(id_card: int):
    return db.get_date_end(id_card)

@app.get("/get_session")
def get_session(login: str, response: Response):
    session_data = db.get_session_cookies(login)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Сессия для данного пользователя не найдена")
    
    response.set_cookie(key="id_session", value=session_data["id_session"])
    response.set_cookie(key="csrftoken", value=session_data["csrftoken"])
    
    return {"status": "success", "message": f"{login}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

