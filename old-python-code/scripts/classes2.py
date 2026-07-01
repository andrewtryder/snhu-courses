import sqlite3
import re
import requests
from time import sleep

# Create a connection to the database
conn = sqlite3.connect('snhu_courses.db') # Replace with your database name
c = conn.cursor()

# Create courses_data table
c.execute('''CREATE TABLE IF NOT EXISTS courses_data
             (pid TEXT PRIMARY KEY,
              title TEXT,
              catalog_course_id TEXT,
              description TEXT,
              academic_level TEXT,
              credits INTEGER,
              date_start TEXT,
              online_offering INTEGER,
              campus_offering INTEGER,
              subject_code TEXT)''')

# Create prerequisites table
c.execute('''CREATE TABLE IF NOT EXISTS prerequisites
             (class_id TEXT,
              course_id TEXT,
              course_title TEXT,
              course_credits TEXT,
              FOREIGN KEY (class_id) REFERENCES courses_data (pid))''')

# Define a function to insert class data into the courses_data table
def insert_class_data(class_data):
    c.execute('''INSERT OR IGNORE INTO courses_data
                 (pid, title, catalog_course_id, description, academic_level, credits, date_start, online_offering, campus_offering, subject_code)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (class_data['pid'], class_data['title'], class_data['catalog_course_id'], class_data['description'], class_data['academic_level'], class_data['credits'], class_data['date_start'], class_data['online_offering'], class_data['campus_offering'], class_data['subject_code']))
    
    conn.commit()

# Define a function to insert prerequisites data into the prerequisites table
def insert_prerequisites_data(class_id, prerequisites):
    for prereq in prerequisites:
        c.execute('''INSERT OR IGNORE INTO prerequisites
                     (class_id, course_id)
                     VALUES (?, ?)''', (class_id, prereq['course_id']))
    
    conn.commit()

conn = sqlite3.connect('snhu_courses.db') # Replace with your database name
c = conn.cursor()

def parse_class_data(json_data):
    # Extract the prerequisite information using regex
    prerequisites = []
    if 'rulesPrerequisites' in json_data:
        print("WE FOUND PREREQS")
        print(json_data['rulesPrerequisites'])
        pattern = r'<a href=".*?">(\w+)</a>'
        matches = re.findall(pattern, json_data['rulesPrerequisites'])
        if matches:
            for match in matches:
                print("FOUND A PREREQ: {0}".format(match))
                prerequisites.append({'course_id': match})  
    
    # handle credits being funky.
    credits_data = json_data['credits']
    credits_value = credits_data.get('value')
    if credits_value:
        if 'min' in credits_value:
            credits = credits_value['min']
        else:
            credits = credits_value
    else:
        if 'credits' in credits_data:
            credits = credits_data['credits']['min']
        else:
            credits = credits_data['min']
    
    class_data = {
        'pid': json_data['pid'],
        'title': json_data['title'],
        'catalog_course_id': json_data['__catalogCourseId'],
        'description': json_data['description'] if 'description' in json_data else '',
        'academic_level': json_data['academicLevel']['name'],
        'credits': credits,
        'date_start': json_data['dateStart'],
        'online_offering': json_data['offering']['online'] if 'online' in json_data['offering'] else False,
        'campus_offering': json_data['offering']['campus'] if 'campus' in json_data['offering'] else False,
        'subject_code': json_data['subjectCode']['name']
    }
    
    return prerequisites, class_data

# Select all pid values from courses_data table
c.execute('''SELECT pid FROM courses''')
rows = c.fetchall()
courselist = [row[0] for row in rows]

for i in courselist:
    c.execute("SELECT pid FROM courses_data WHERE pid=?", (i,))
    result = c.fetchone()
    if result: # The course already exists in the database
        print(f"Course {i} already exists in the database. Skipping.")
    else: # The course doesn't exist in the database    
        url2 = "https://snhu.kuali.co/api/v1/catalog/course/6349a3f9164d00001c6c80da/{0}".format(i)
        print("Working on {0}".format(url2))
        response2 = requests.get(url2)
        json_data = response2.json()
        print(json_data)
        prerequisites, class_data = parse_class_data(json_data)
        insert_class_data(class_data)
        insert_prerequisites_data(class_data['pid'], prerequisites)
        sleep(5)
        print("\n\n")