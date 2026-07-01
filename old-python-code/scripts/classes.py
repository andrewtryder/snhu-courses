import requests
import json
import re
import sqlite3

courselist = []

def get_courses(q):
    url = f"https://snhu.kuali.co/api/v1/catalog/courses/6349a3f9164d00001c6c80da?q={q}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        return None

conn = sqlite3.connect('../db/snhu_courses.db') # Replace with your database name
c = conn.cursor()

# Create courses table if it doesn't exist
c.execute('''CREATE TABLE IF NOT EXISTS courses
             (course_id TEXT, academic_level TEXT, translated_level TEXT, passed_catalog_query TEXT, start_date TEXT, online_offering BOOLEAN, campus_offering BOOLEAN, pid TEXT, course_uuid TEXT, title TEXT, subject_code TEXT, subject_description TEXT, translated_subject TEXT, subject_id TEXT, activation_date TEXT, score REAL)''')


courses = get_courses("")
for data in courses:
    print(data)
    course_id = data['__catalogCourseId']
    academic_level = data['academicLevel']['name']
    translated_level = data['academicLevel']['translatedNames'].get('es', '')
    passed_catalog_query = data['__passedCatalogQuery']
    start_date = data['dateStart']
    if 'offering' in data:
        online_offering = True if data['offering'].get('online') else False
        campus_offering = True if data['offering'].get('campus') else False
    else:
        online_offering = False
        campus_offering = False
    pid = data['pid']
    courselist.append(pid)
    course_uuid = data['id']
    title = data['title']
    subject_code = data['subjectCode']['name']
    subject_description = data['subjectCode']['description']
    translated_subject = data['subjectCode']['translatedNames'].get('es', '')
    subject_id = data['subjectCode']['id']
    activation_date = data['catalogActivationDate']
    score = data['_score']
     # Prepare and execute the INSERT statement
    c.execute("INSERT INTO courses (course_id, academic_level, translated_level, passed_catalog_query, start_date, online_offering, campus_offering, pid, course_uuid, title, subject_code, subject_description, translated_subject, subject_id, activation_date, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (course_id, academic_level, translated_level, passed_catalog_query, start_date, online_offering, campus_offering, pid, course_uuid, title, subject_code, subject_description, translated_subject, subject_id, activation_date, score))
    print("Processed {0}".format(data))
# Commit changes and close connection
conn.commit()
conn.close()