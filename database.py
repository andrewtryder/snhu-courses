import sqlite3
from typing import List, Tuple, Dict, Any

def get_course_info(course_id: str) -> Tuple:
    with sqlite3.connect('db/snhu_courses.db') as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT *
            FROM courses_data
            WHERE catalog_course_id = ?
        """, (course_id,))
        result = cursor.fetchone()
        print("FETCHONE: {0}".format(result))
    return result

def get_courses_info(course_ids: List[str]) -> List[Dict[str, Any]]:
    with sqlite3.connect('db/snhu_courses.db') as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        pid_placeholders = ','.join(['?'] * len(course_ids))
        cursor.execute(f"""
            SELECT *
            FROM courses_data
            WHERE catalog_course_id IN ({pid_placeholders})
        """, course_ids)
        result = cursor.fetchall()
        return [dict(row) for row in result]


def get_course_name(pid: str) -> str:
    with sqlite3.connect('db/snhu_courses.db') as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT title
            FROM courses_data
            WHERE catalog_course_id = ?
        """, (pid,))
        result = cursor.fetchone()
    return result[0] if result else "Unknown"

def get_prerequisites(course_id: str) -> List[str]:
    with sqlite3.connect('db/snhu_courses.db') as conn:
        cursor = conn.cursor()
        prerequisites = []
        cursor.execute("""
            SELECT prerequisites.course_id
            FROM prerequisites
            JOIN courses_data ON prerequisites.class_id = courses_data.pid 
            WHERE prerequisites.class_id IN (
                SELECT pid 
                FROM courses_data 
                WHERE catalog_course_id = ?
            )
        """, (course_id,))
        for prerequisite in cursor.fetchall():
            prerequisites.append(prerequisite[0])
        prerequisites.append(course_id)
        prerequisites.sort()
    return prerequisites
