from typing import Set, Optional
from database import get_course_name, get_prerequisites

def create_course_tree(course_id: str) -> dict:
    seen_courses = set()
    course_dict = _create_course_tree(course_id, seen_courses)
    if not course_dict:
        return
    return course_dict

def _create_course_tree(course_id: str, seen_courses: Set[str]) -> Optional[dict]:
    if course_id in seen_courses:
        return None
    seen_courses.add(course_id)
    
    course_name = get_course_name(course_id)
    if not course_name:
        course_dict = {"name": "Unknown", "course_id": course_id}
    else:
        title = course_name
        course_dict = {"name": title, "course_id": course_id}

    prerequisites = get_prerequisites(course_id)
    if not prerequisites:
        return None
    
    course_dict["prerequisites"] = []
    for prerequisite_id in prerequisites:
        child_dict = _create_course_tree(prerequisite_id, seen_courses)
        if child_dict is not None:
            course_dict["prerequisites"].append(child_dict)
    
    if not course_dict["prerequisites"]:
        del course_dict["prerequisites"]
    
    return course_dict






