from flask import Flask, jsonify, request, render_template, redirect, url_for
from course_tree_generator import create_course_tree
from database import get_course_info, get_courses_info
from typing import Union, Tuple, Dict
from flask_cors import CORS
import plotly.graph_objs as go
import requests
import networkx as nx
import json

app = Flask(__name__)
CORS(app)

def format_data(data):
    nodes = []
    edges = []

    def traverse(node, parent=None):
        nodes.append({
            'id': node['course_id'],
            'label': node['course_id'] + ': ' + node['name']
        })
        if parent:
            edges.append({'from': parent, 'to': node['course_id']})
        if 'prerequisites' in node:
            for child in node['prerequisites']:
                traverse(child, node['course_id'])

    traverse(data)
    return {'nodes': nodes, 'edges': edges}

@app.route('/course-graph', methods=['GET', 'POST'])
def course_graph():
    if request.method == 'POST':
        # Get course name from form data
        course_name = request.form['course_name']
        print(course_name)
        # Validate course name against database
        course_info = get_course_info(course_name)
        print(course_info)
        if course_info:
            # Make API call to get latest data
            response = requests.get(f'http://localhost:5000/course-tree/{course_name}')
            data = response.json()

            # Format data for vis.js consumption
            vis_data = format_data(data)

            # Render graph onto webpage
            return render_template('course-graph.html', data=json.dumps(vis_data))

        else:
            # Invalid course name, render error page
            return redirect(url_for('course_graph'))
    else:
        # Show form to ask for course name
        return '''
                <form method="post">
                    <label for="course_name">Course Name:</label>
                    <input type="text" id="course_name" name="course_name">
                    <button type="submit">Submit</button>
                </form>
            '''

@app.route('/network-graph2')
def network_graph2():
    response = requests.get('http://localhost:5000/course-tree/CS499')
    data = response.json()

    graph = nx.DiGraph()

    def create_graph(course, graph):
        node = {"id": course["course_id"], "name": course["name"], "title": course["course_id"]}
        graph.add_node(node["id"], name=node["name"], title=node["title"])
        if "prerequisites" in course:
            for prereq in course["prerequisites"]:
                prereq_node = {"id": prereq["course_id"], "name": prereq["name"], "title": prereq["course_id"]}
                graph.add_node(prereq_node["id"], name=prereq_node["name"], title=prereq_node["title"])
                graph.add_edge(prereq_node["id"], node["id"])
                create_graph(prereq, graph)

    create_graph(data, graph)

    # Compute the positions of each node
    pos = nx.layout.kamada_kawai_layout(graph, scale=2, center=(0,0))

    edge_x = []
    edge_y = []
    for edge in graph.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    node_x = []
    node_y = []
    node_names = []
    node_titles = []
    for node in graph.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        node_names.append(graph.nodes[node]['name'])
        node_titles.append(graph.nodes[node]['title'])

    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode='markers+text',
        text=node_names,
        hoverinfo='text',
        textposition='bottom center',
        marker=dict(
            showscale=False,
            color=[],
            size=20,
            symbol='circle',
            line_width=2))

    node_trace.text = node_titles

    fig = go.Figure(data=[node_trace, go.Scatter(x=edge_x, y=edge_y, line=dict(width=0.5, color='#888'), hoverinfo='none', mode='lines')],
                layout=go.Layout(
                    title='Course Prerequisites',
                    showlegend=False,
                    hovermode='closest',
                    margin=dict(b=20,l=5,r=5,t=40),
                    annotations=[ dict(
                        text="Course Prerequisites",
                        showarrow=False,
                        xref="paper", yref="paper",
                        x=0.005, y=-0.002 ) ],
                    xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                    yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)))

    fig.update_layout(plot_bgcolor='white')

    # Convert the plotly graph to HTML
    fig.write_html("courses_graph.html")
    plot_html = fig.to_html(full_html=False)

    # Render the HTML template with the graph
    return render_template('network-graph.html', plot_html=plot_html)

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
