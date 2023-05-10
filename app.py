from flask import Flask, jsonify, request, render_template
from course_tree_generator import create_course_tree
from database import get_course_info, get_courses_info
from typing import Union, Tuple, Dict
from flask_cors import CORS
import requests
import json

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

def format_data(data, node_ids, edge_ids):
    nodes = []
    edges = []

    def traverse(node, parent=None):
        node_id = node['course_id']
        if node_id not in node_ids:
            # Add node to list of nodes if it hasn't been added already
            nodes.append({
                'id': node_id,
                'label': node_id,
                'title': node['name']
            })
            node_ids.add(node_id)

        if parent and (parent, node_id) not in edge_ids:
            # Add edge to list of edges if it hasn't been added already
            edges.append({'from': parent, 'to': node_id})
            edge_ids.add((parent, node_id))

        if 'prerequisites' in node:
            for child in node['prerequisites']:
                traverse(child, node_id)

    traverse(data)
    return {'nodes': nodes, 'edges': edges}


@app.route('/', methods=['GET', 'POST'])
def course_graphs():
    if request.method == 'POST':
        # Get course names from form data
        course_input = request.form['course_name']
        course_names = [course.strip().upper() for course in course_input.split(',')]
        courses_data = []
        node_ids = set()
        edge_ids = set()

        # Validate course names and get course data
        for course_name in course_names:
            course_info = get_course_info(course_name)
            if course_info:
                data = create_course_tree(course_name)
                course_data = format_data(data, node_ids, edge_ids)
                courses_data.append(course_data)
            else:
                # Invalid course name, render error page
                return render_template('index.html', error='{0} Invalid course name.'.format(course_name))

        # Combine nodes and edges from all courses
        nodes = []
        edges = []

        for course_data in courses_data:
            nodes += course_data['nodes']
            edges += course_data['edges']

        vis_data = {'nodes': nodes, 'edges': edges}
        #print("VISDATA :: {0}".format(vis_data))
        # Render graph onto webpage
        return render_template('index.html', course_names=course_names, graph=render_template('course-graph.html', data=json.dumps(vis_data)))
    else:
        # Show form to ask for course names
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
