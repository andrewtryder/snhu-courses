import json
import sqlite3
import requests
from time import sleep
import re

# Connect to the SQLite database
conn = sqlite3.connect('transfers.db')
cursor = conn.cursor()

# Create the table if it doesn't exist
cursor.execute('''CREATE TABLE IF NOT EXISTS courses_data
                  (code TEXT, dateStart TEXT, pid TEXT UNIQUE, id TEXT, title TEXT, catalogActivationDate TEXT, score REAL,
                  rulesAchievementCriteria TEXT, eligibilityTimeframe TEXT, groupFilter1Name TEXT, groupFilter1Id TEXT, groupFilter1CustomFields TEXT,
                  groupFilter2Name TEXT, groupFilter2Id TEXT, groupFilter2CustomFields TEXT, academicLevel TEXT, coursePID TEXT, courseName TEXT)''')


# Query the database for unique pid values
cursor.execute('SELECT DISTINCT pid FROM courses')
existing_pids = set([row[0] for row in cursor.fetchall()])

# URL pattern to retrieve additional JSON data
url_pattern = 'https://snhu.kuali.co/api/v1/catalog/experience/62d0386e064ce7001cec61d1/{}'

# Iterate over each pid value
for pid in existing_pids:
    # Check if the entry already exists in the database
    if pid is None:
        continue

    # Construct the URL
    url = url_pattern.format(pid)

    # Retrieve the JSON data from the URL
    response = requests.get(url)
    print("Working on URL: {0}".format(url))
    json_data = response.json()

    # Parse the JSON data and extract the required information
    rules_achievement_criteria = json_data.get('rulesAchievementCriteria')
    eligibility_timeframe = json_data.get('eligibilityTimeframe')
    code = json_data.get('code')
    group_filter1 = json_data.get('groupFilter1', {})
    group_filter2 = json_data.get('groupFilter2', {})
    title = json_data.get('title')
    academic_level = json_data.get('academicLevel', {}).get('name')
    date_start = json_data.get('dateStart')
    id = json_data.get('id')
    catalog_activation_date = json_data.get('catalogActivationDate')
    score = json_data.get('_score')

    # Extract values from groupFilter1 and groupFilter2
    group_filter1_name = group_filter1.get('name')
    group_filter1_id = group_filter1.get('id')
    group_filter1_custom_fields = json.dumps(group_filter1.get('customFields', {}))
    group_filter2_name = group_filter2.get('name')
    group_filter2_id = group_filter2.get('id')
    group_filter2_custom_fields = json.dumps(group_filter2.get('customFields', {}))
    # Extract course PID and name from rulesAchievementCriteria using regex
    course_pid_match = re.search(r'<a href="#/courses/view/([A-Za-z0-9-]+)"', rules_achievement_criteria)
    course_pid = course_pid_match.group(1) if course_pid_match else None
    course_name_match = re.search(r'<a href="#/courses/view/.*>(.*?)<\/a>', rules_achievement_criteria)
    course_name = course_name_match.group(1) if course_name_match else None

    # Insert the parsed data into the database, ignoring duplicates
    cursor.execute('''INSERT OR IGNORE INTO courses_data
                      (code, dateStart, pid, id, title, catalogActivationDate, score,
                      rulesAchievementCriteria, eligibilityTimeframe,
                      groupFilter1Name, groupFilter1Id, groupFilter1CustomFields,
                      groupFilter2Name, groupFilter2Id, groupFilter2CustomFields,
                      academicLevel, coursePID, courseName)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                   (code, date_start, pid, id, title, catalog_activation_date, score,
                    rules_achievement_criteria, eligibility_timeframe,
                    group_filter1_name, group_filter1_id, group_filter1_custom_fields,
                    group_filter2_name, group_filter2_id, group_filter2_custom_fields,
                    academic_level, course_pid, course_name))
    conn.commit()
    sleep(10)

conn.close()
