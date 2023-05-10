import json
import sqlite3
import requests

# Connect to the SQLite database
conn = sqlite3.connect('transfers.db')
cursor = conn.cursor()

# Create the table if it doesn't exist
cursor.execute('''CREATE TABLE IF NOT EXISTS courses
                  (code TEXT, dateStart TEXT, groupId TEXT, groupName TEXT, groupCustomFields TEXT, pid TEXT, courseId TEXT, title TEXT, activationDate TEXT, score REAL)''')

# URL to retrieve the JSON array
url = 'https://snhu.kuali.co/api/v1/catalog/experiences/62d0386e064ce7001cec61d1?q='

# Retrieve the JSON array from the URL
response = requests.get(url)
json_array = response.json()

# Parse the JSON array and insert data into the database
for entry in json_array:
    code = entry.get('code')
    date_start = entry.get('dateStart')
    group_filter = entry.get('groupFilter2', {})
    group_id = group_filter.get('id')
    group_name = group_filter.get('name')
    group_custom_fields = json.dumps(group_filter.get('customFields', {}))
    pid = entry.get('pid')
    course_id = entry.get('id')
    title = entry.get('title')
    activation_date = entry.get('catalogActivationDate')
    score = entry.get('_score')

    # Insert the data into the database
    cursor.execute('''INSERT INTO courses
                      (code, dateStart, groupId, groupName, groupCustomFields, pid, courseId, title, activationDate, score)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                   (code, date_start, group_id, group_name, group_custom_fields, pid, course_id, title, activation_date, score))

# Commit the changes and close the connection
conn.commit()
conn.close()
