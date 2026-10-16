from pathlib import Path

def create_directory(id_card:int):

    main_folder = Path(f"save/{id_card}")


    if not main_folder.exists():
        sub1 = main_folder / "voice_music_svg"
        sub2 = main_folder / "images"
        
        sub1.mkdir(parents=True)
        sub2.mkdir(parents=True)
