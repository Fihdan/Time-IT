import sqlite3
from typing import List, Tuple, Optional




class DBManager:

    def __init__(self, db_path: str = "Hakaton_IT.db"):
        self.db_path = db_path

    def _execute_query(self, query: str, params: tuple = (), fetch: Optional[str] = None):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            
            if fetch == "one":
                return cursor.fetchone()
            if fetch == "all":
                return cursor.fetchall()
            if fetch == "lastrowid":
                conn.commit()
                return cursor.lastrowid
            
            conn.commit()
            return None

    def create_tables(self) -> None:
        query = """
        CREATE TABLE IF NOT EXISTS users (
            id_user INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT UNIQUE,
            first_name TEXT,
            last_name TEXT,
            id_session TEXT,
            csrftoken TEXT
        );
        
        CREATE TABLE IF NOT EXISTS cards (
            id_card INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL,
            card_name TEXT,    
            voice TEXT,  
            music TEXT,   
            voice_mix INT,  
            music_mix INT,
            svg TEXT,
            date_start TEXT,
            date_end TEXT,
            FOREIGN KEY (login) REFERENCES users (login) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS texts(
            id_text INTEGER PRIMARY KEY AUTOINCREMENT,
            id_card INTEGER,
            x INTEGER,
            y INTEGER,
            w INTEGER,
            z INTEGER,
            size INTEGER,
            text TEXT,
            font TEXT,
            color TEXT,
            align TEXT,
            FOREIGN KEY (id_card) REFERENCES cards (id_card) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS images(
            id_image INTEGER PRIMARY KEY AUTOINCREMENT,
            id_card INTEGER NOT NULL,
            x INTEGER,
            y INTEGER,
            w INTEGER,
            h INTEGER,
            z INTEGER,
            angle TEXT,
            image TEXT,
            FOREIGN KEY (id_card) REFERENCES cards (id_card) ON DELETE CASCADE
        );
        """
        conn = sqlite3.connect(self.db_path, isolation_level=None)
        try:
            conn.executescript(query)
        finally:
            conn.close()

    def add_user(self, login: str, password: str, email: Optional[str] = None, # work
                    first_name: Optional[str] = None, 
                    last_name:  Optional[str] = None,
                    ) -> bool:
            query = "INSERT INTO users (login, password, email, first_name, last_name) VALUES (?, ?, ?, ?, ?);"
            try:
                self._execute_query(query, (login, password, email, first_name, last_name))
                return True
            except sqlite3.IntegrityError:
                return False

    def auth(self, login: str): # work
        query = "SELECT password FROM users WHERE login = ?"
        result = self._execute_query(query, (login,), fetch="one")

        if result:
            return result[0]
        
        return None

    def get_email_by_users(self, login: str) -> str:
        query = "SELECT email FROM users WHERE login = ?"

        try:
            result = self._execute_query(query, (login,), fetch="one")
            return result[0]
        except:
            return None

##############################################################################################################################
        
    def add_card(self, login: Optional[str], #work
                card_name: Optional[str]) -> int:
        
        query = """
        INSERT INTO cards (login, card_name, voice, music, voice_mix, music_mix, svg, date_start, date_end) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """

        return self._execute_query(query, (login, card_name, None, None, None, None, None, None, None), fetch="lastrowid")

###############################################################################################################################
 
    def get_all_names_card_by_user(self, login: Optional[str]): #work
        query = "SELECT id_card, card_name FROM cards WHERE login = ?;"
        result = self._execute_query(query, (login,), fetch="all")
        return result

    def update_voice_mix(self, id_card: int, new_voice_mix: Optional[int]):#work
        query = "UPDATE cards SET voice_mix = ? WHERE id_card = ?;"
        try:
            result = self._execute_query(query, (new_voice_mix, id_card))
            return result
        except:
            return False

    def update_music_mix(self, id_card: int, new_music_mix: Optional[int]):#work
        query = "UPDATE cards SET music_mix = ? WHERE id_card = ?;"
        try:
            result = self._execute_query(query, (new_music_mix, id_card))
            return result
        except:
            return False    

    def get_music_mix(self, id_card: int):#work
        query = "SELECT music_mix FROM cards WHERE id_card = ?;"
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

    def get_voice_mix(self, id_card: int):#work
        query = "SELECT voice_mix FROM cards WHERE id_card = ?;"
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

    def update_card_name(self, id_card: int, new_card_name: str):#work
         query = "UPDATE cards SET card_name = ? WHERE id_card = ?;"
         try:
              result = self._execute_query(query, (new_card_name, id_card))
              return result
         except:
              return False

    def get_card_name(self, id_card: int) -> str: # work
         query = "SELECT card_name FROM cards WHERE id_card = ?;"
         try:
              result = self._execute_query(query, (id_card,), fetch="one")
              return result[0]
         except:
              return False

#####################################################################################################

    def update_date_start(self, id_card: int, new_date_start: str):
        query = "UPDATE cards SET date_start = ? WHERE id_card = ?"

        try:
            self._execute_query(query, (new_date_start, id_card))
            return True
        except:
            return False

    def update_date_end(self, id_card: int, new_date_end: str):
            query = "UPDATE cards SET date_end = ? WHERE id_card = ?"
    
            try:
                self._execute_query(query, (new_date_end, id_card))
                return True
            except:
                return False

    def del_date_start(self, id_card):
        query = "UPDATE cards SET date_start = ? WHERE id_card = ?"

        try:
            self._execute_query(query, (None, id_card))
            return True
        except:
            return False
    

    def del_date_end(self, id_card):
        query = "UPDATE cards SET date_end = ? WHERE id_card = ?"
    
        try:
            self._execute_query(query, (None, id_card))
            return True
        except:
            return False


    def del_date_end(self, id_card):
            query = "UPDATE cards SET date_end = ? WHERE id_card = ?"

            try:
                self._execute_query(query, (None, id_card))
                return True
            except:
                return False

    def get_date_strat(self, id_card):
        query = "SELECT date_start FROM cards WHERE id_card = ?"
    
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

    def get_date_end(self, id_card):
        query = "SELECT date_end FROM cards WHERE id_card = ?"
    
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

########################################################################################################

    def check_voice_path(self, id_card: int):#work
        query = "SELECT voice FROM cards WHERE id_card = ?;"
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

    def update_voice_path(self, id_card: int, new_voice_path):#work
        query = "UPDATE cards SET voice = ? WHERE id_card = ?"
        try:
            if(self._execute_query(query, (new_voice_path, id_card))):
                return True
        except:
            False

    def check_music_path(self, id_card: int):#work
        query = "SELECT music FROM cards WHERE id_card = ?"
        try:
            result = self._execute_query(query, (id_card,), fetch="one")
            return result[0]
        except:
            return False

    def update_music_path(self, id_card: int, new_music_path: str) -> bool: #work
        query = "UPDATE cards SET music = ? WHERE id_card = ?"
        try:
           if((self._execute_query(query, (new_music_path, id_card)))):
               return True
        except:
           return False

    def check_svg_path(self, id_card: int):#work
            query = "SELECT svg FROM cards WHERE id_card = ?"
            try:
                result = self._execute_query(query, (id_card,), fetch="one")
                return result[0]
            except:
                return False
    
    def update_svg_path(self, id_card: int, new_svg_path: str) -> bool: #work
        query = "UPDATE cards SET svg = ? WHERE id_card = ?"
        try:
           if((self._execute_query(query, (new_svg_path, id_card)))):
               return True
        except:
           return False

    def create_text(self, id_card: int, #work
                    x: int = None,
                    y: int = None,
                    w: int = None,
                    z: int = None,
                    size: int = None,
                    text: str = None,
                    font: str = None,
                    color: str = None):
        query = "INSERT INTO texts (id_card, x, y, w, z, size, text, font, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
                
        return self._execute_query(query, (id_card, None, None, None, None, None, None, None, None), fetch="lastrowid")
    
    def update_text_by_text(self, id_text: int, text: str) -> bool: #work
        query = "UPDATE texts SET text = ? WHERE id_text = ?"
        if(self._execute_query(query, (text, id_text))):
            return True
        return False

    def update_position_x_by_text(self, id_text: int, position_x: int) -> bool: #work
        query = "UPDATE texts SET x = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (position_x, id_text))
            return True
        except:
            return False

    def update_position_y_by_text(self, id_text: int, position_y: int) -> bool: #work
        query = "UPDATE texts SET y = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (position_y, id_text))
            return True
        except:
            return False

    def update_position_w_by_text(self, id_text: int, position_w: int) -> bool: #work
        query = "UPDATE texts SET w= ? WHERE id_text = ?"
        try:
            self._execute_query(query, (position_w, id_text))
            return True
        except:
            return False

    def update_position_z_by_text(self, id_text: int, position_z: int) -> bool: #work
        query = "UPDATE texts SET z = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (position_z, id_text))
            return True
        except:
            return False 
    
    def update_size_by_text(self, id_text: int, size: int) -> bool:
        query = "UPDATE texts SET size = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (size, id_text))
            return True
        except:
            return False

    def update_font_by_text(self, id_text: int, font: str) -> bool:
        query = "UPDATE texts SET font = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (font, id_text))
            return True
        except:
            return False

    def update_color_by_text(self, id_text: int, color: str) -> bool:
        query = "UPDATE texts SET color = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (color, id_text))
            return True
        except:
            return False

    def update_align_by_text(self, id_text: int, align: str) -> bool:
        query = "UPDATE texts SET align = ? WHERE id_text = ?"
        try:
            self._execute_query(query, (align, id_text))
            return True
        except:
            return False


    def get_text_by_text(self, id_text) -> str: #work
        query = "SELECT text FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]

    
    def get_position_x_by_text(self, id_text) -> int: #work
        query = "SELECT x FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]

    def get_position_y_by_text(self, id_text) -> int: #work
        query = "SELECT y FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]

    def get_position_w_by_text(self, id_text) -> int: #work
        query = "SELECT w FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]

    def get_position_z_by_text(self, id_text) -> int: #work
        query = "SELECT z FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]


    def get_size_by_text(self, id_text: int) -> str:
        query = "SELECT size FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]
    
    def get_font_by_text(self, id_text: int) -> str:
        query = "SELECT font FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]

    def get_color_by_text(self, id_text: int) -> str:
        query = "SELECT color FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]
    
    def get_align_by_text(self, id_text: int) -> str:#work
        query = "SELECT align FROM texts WHERE id_text = ?"
        result = self._execute_query(query, (id_text,), fetch="one")
        return result[0]


    def get_all_texts_by_card(self, id_card: int): 
        query = "SELECT id_text FROM texts WHERE id_card = ?;"
        result = self._execute_query(query, (id_card,), fetch="all")
        return result

    def create_image(self, id_card: int, #work
                        x: int = None,
                        y: int = None,
                        w: int = None,
                        h: int = None,
                        z: int = None,
                        angle: int = None,
                        image: str = None):
        query = "INSERT INTO images (id_card, x, y, w, h, z, angle, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
                    
        result = self._execute_query(query, (id_card, None, None, None, None, None, None, None), fetch="lastrowid")
        return result


        
    def update_position_x_by_image(self, id_image: int, x: int) -> bool:
        query = "UPDATE images SET x = ? WHERE id_image = ?"

        try:
            self._execute_query(query, (x, id_image))
            return True
        except:
            return False

    def update_position_y_by_image(self, id_image: int, y: int) -> bool:
            query = "UPDATE images SET y = ? WHERE id_image = ?"
    
            try:
                self._execute_query(query, (y, id_image))
                return True
            except:
                return False

    def update_position_w_by_image(self, id_image: int, w: int) -> bool:
        query = "UPDATE images SET w = ? WHERE id_image = ?"

        try:
            self._execute_query(query, (w, id_image))
            return True
        except:
            return False

    def update_position_h_by_image(self, id_image: int, h: int) -> bool:
        query = "UPDATE images SET h = ? WHERE id_image = ?"

        try:
            self._execute_query(query, (h, id_image))
            return True
        except:
            return False

    def update_position_z_by_image(self, id_image: int, z: int) -> bool:
        query = "UPDATE images SET z = ? WHERE id_image = ?"

        try:
            self._execute_query(query, (z, id_image))
            return True
        except:
            return False

    def update_angle_by_image(self, id_image: int, angle: int) -> bool:
        query = "UPDATE images SET angle = ? WHERE id_image = ?"

        try:
            self._execute_query(query, (angle, id_image))
            return True
        except:
            return False

    def get_position_x_by_image(self, id_image: int) -> int:
        query = "SELECT x FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return result[0]
        except:
            return None

    def get_position_y_by_image(self, id_image: int) -> int:
        query = "SELECT y FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return result[0]
        except:
            return None       

    def get_position_w_by_image(self, id_image: int) -> int:
        query = "SELECT w FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return result[0]
        except:
            return None

    def get_position_h_by_image(self, id_image: int) -> int:
        query = "SELECT h FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return result[0]
        except:
            return None

    def get_position_z_by_image(self, id_image: int) -> int:
        query = "SELECT z FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return result[0]
        except:
            return None

    def get_angle_by_image(self, id_image: int) -> int:
        query = "SELECT angle FROM images WHERE id_image = ?"

        try:
            result = self._execute_query(query, (id_image,), fetch="one")
            return int(result[0])
        except:
            return None    

    def get_all_images_by_card(self, id_card: int): #work
            query = "SELECT id_image FROM images WHERE id_card = ?;"
            result = self._execute_query(query, (id_card,), fetch="all")
            return result

    def check_image_path(self, id_image: int):#work
            query = "SELECT image FROM images WHERE id_image = ?;"
            try:
                result = self._execute_query(query, (id_image,), fetch="one")
                return result[0]
            except:
                return False
            
    def update_image_path(self, id_image: int, new_image_path: str) -> bool: #work
        query = "UPDATE images SET image = ? WHERE id_image = ?"
        try:
           if((self._execute_query(query, (new_image_path, id_image)))):
               return True
        except:
           return False

    def get_card_by_image(self, image_id) -> int:
        query = "SELECT id_card FROM images WHERE id_image = ?"
        
        try:
            result = self._execute_query(query, (image_id,), fetch="one")
            #result = self._execute_query(query, (image_id,), fetch="one")
            return result[0]
        except:
            return None

#################################################


    def del_all_by_text(self, id_text: int) -> bool:#work
        query = "DELETE FROM texts WHERE id_text = ?"

        try:
            self._execute_query(query, (id_text,))
            return True
        except Exception as ex:
            print("Error: ", ex)
            return False


    def del_all_by_image(self, id_image: int) -> bool:#work
        query = "DELETE FROM images WHERE id_image = ?"

        try:
            self._execute_query(query, (id_image,))
            return True
        except Exception as ex:
            print("Error: ", ex)
            return False

    def del_all_by_card(self, id_card: int):#work
        query = "DELETE FROM cards WHERE id_card = ?"
        
        try:
            self._execute_query(query, (id_card,))
            return True
        except Exception as ex:
            print("Error: ", ex)
            return False


    def get_profile(self, login:str):
        query = "SELECT first_name, last_name, email FROM users WHERE login = ?"
        result = self._execute_query(query, (login,), fetch="one")
        return result


    #всё что выше всё work

    def get_session_cookies(self, login: str) -> dict | None:
        query = "SELECT id_session, csrftoken FROM users WHERE login = ?"
        result = self._execute_query(query, (login,), fetch="one")
        
        if result and (result[0] or result[1]):
            return {
                "id_session": result[0],
                "csrftoken": result[1]
            }
        return None


    def save_session_cookies(self, login: str, id_session: str, csrftoken: str):
        query = "UPDATE users SET id_session = ?, csrftoken = ? WHERE login = ?"
        try:
            self._execute_query(query, (id_session, csrftoken, login), fetch="none")
            return True
        except:
            return False
        
    def update_id_session(self, login: str, new_id_session: str):
        query = "UPDATE users SET id_session = ? WHERE login = ?"
        try:
            self._execute_query(query, (new_id_session, login), fetch="none")
            return True
        except:
            return False

        
    def update_csrftoken(self, login: str, new_csrftoken: str):
        query = "UPDATE users SET csrftoken = ? WHERE login = ?"
        try:
            self._execute_query(query, (new_csrftoken, login), fetch="none")
            return True
        except:
            return False
