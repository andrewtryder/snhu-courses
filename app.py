from flask import Flask, jsonify, request, render_template, redirect, url_for
from course_tree_generator import create_course_tree
from database import get_course_info, get_courses_info
from typing import Union, Tuple, Dict
from flask_cors import CORS
import requests
import json

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

def format_data(data):
    nodes = []
    edges = []

    def traverse(node, parent=None):
        nodes.append({
            'id': node['course_id'],
            'label': node['course_id'],
            'title': node['name']
        })
        if parent:
            edges.append({'from': parent, 'to': node['course_id']})
        if 'prerequisites' in node:
            for child in node['prerequisites']:
                traverse(child, node['course_id'])

    traverse(data)
    return {'nodes': nodes, 'edges': edges}


@app.route('/', methods=['GET', 'POST'])
def course_graph():
    if request.method == 'POST':
        # Get course name from form data
        course_name = request.form['course_name']
        # Validate course name against database
        course_info = get_course_info(course_name)
        if course_info:
            # Make API call to get latest data
            data = create_course_tree(course_name)
            # Format data for vis.js consumption
            vis_data = format_data(data)

            # Render graph onto webpage
            return render_template('index.html', course_name=course_name, graph=render_template('course-graph.html', data=json.dumps(vis_data)))
        else:
            # Invalid course name, render error page
            return render_template('index.html', error='Invalid course name.')
    else:
        # Show form to ask for course name
        return render_template('index.html')

@app.route('/course-trees/<course_ids>')
def get_course_trees(course_ids):
    ids = course_ids.split(",")
    course_trees = []
    for course_id in ids:
        course_tree = create_course_tree(course_id)
        if course_tree:
            course_trees.append(course_tree)
    if not course_trees:
        response = {"error": "No course trees found."}
        return jsonify(response), 404
    else:
        return jsonify(course_trees)

@app.route('/course-tree/<course_id>')
def get_course_tree(course_id):
    course_tree = create_course_tree(course_id)
    if not course_tree:
        response = {"error": f"Class ID '{course_id}' not found."}
        return jsonify(response), 404
    else:
        return jsonify(course_tree)

@app.route('/course/<course_id>')
def get_course_info_route(course_id):
    result = get_course_info(course_id)
    if not result:
        return error_response(course_id)
    else:
        # Return course information as a dictionary
        columns = ['title', 'pid', 'catalog_course_id', 'description', 'academic_level',
                   'credits', 'date_start', 'online_offering', 'campus_offering', 'subject_code']
        response = dict(zip(columns, result))
        return jsonify(response)

@app.route('/courses')
def get_courses_info_route():
    course_ids = request.args.get('ids').split(',')
    course_info = get_courses_info(course_ids)
    if not course_info:
        return error_response(course_ids)
    else:
        return jsonify(course_info)

def error_response(course_id: str) -> Tuple[Union[Dict[str, str], str], int]:
    return jsonify({"error": f"Class ID '{course_id}' not found."}), 404

if __name__ == '__main__':
    app.run(debug=True)
