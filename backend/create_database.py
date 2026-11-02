
import os
import MySQLdb
from dotenv import load_dotenv

load_dotenv()

connection = MySQLdb.connect(
    host=os.environ["DB_HOST"],
    port=int(os.environ["DB_PORT"]),
    user=os.environ["DB_USER"],
    passwd=os.environ["DB_PASSWORD"],
    ssl={"ca": os.environ["DB_SSL_CA"]},
)

cursor = connection.cursor()

cursor.execute("""
    CREATE DATABASE IF NOT EXISTS ecommerce_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci
""")

print("ecommerce_db created successfully!")

cursor.close()
connection.close()
