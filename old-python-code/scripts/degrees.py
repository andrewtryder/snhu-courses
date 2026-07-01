import requests
import json
from bs4 import BeautifulSoup
import re

url = "https://snhu.kuali.co/api/v1/catalog/program/6349a3f9164d00001c6c80da/V1S14E8tg"

def fetch_and_parse_json(url):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for non-2xx status codes
        json_data = response.json()
        return json_data
    except requests.exceptions.RequestException as e:
        print("Error occurred while fetching JSON:", str(e))
        return None

# Fetch and parse the JSON data
json_data = fetch_and_parse_json(url)

if json_data:
    # JSON parsing logic goes here
    # You can access the data using json_data dictionary
    rr = json_data['rulesRequirements']
    soup = BeautifulSoup(rr, 'html.parser')
    headers = soup.find_all('header', {'data-test': re.compile(r'^grouping-\d+-header$')})

    # Iterate over the found headers and print their text
    for header in headers:
        span_elements = header.find_all('span')
        #[<span>General Education Courses</span>, <span>42</span>, <span>Total Credits</span>]
        #[<span>Major Courses</span>, <span>57</span>, <span>Total Credits</span>]
        #[<span>Major Electives or choose a Concentration</span>, <span>12</span>, <span>Total Credits</span>]
        #[<span>Free Electives</span>, <span>9</span>, <span>Total Credits</span>]
        print(span_elements)
        req_type = span_elements[0].text
        credits = span_elements[1].text
        tc = span_elements[2].text
        if req_type.startswith("Major Electives"):
            # Find the <div> element within the <li> element
            parent = header.parent

            div_element = parent.find('div', {'data-test': 'ruleView-A-result'})

            # Extract the text content within the <div> element
            div_text = div_element.get_text()
            print(div_text)

            # Use regex to extract the number of credits
            credits_match = re.search(r'(\d+)\s*credit', div_text)
            credits = credits_match.group(1) if credits_match else None

            # Use regex to extract the subjects
            # Use regex to extract the subjects
            subjects_match = re.findall(r'(\b[A-Z]{2,3}\b)', div_text)
            #print(subjects_match)
            subjects = subjects_match if subjects_match else None


            # Use regex to extract the course number range
            range_match = re.search(r'(\d+)\s*-\s*(\d+)', div_text)
            course_range = (range_match.group(1), range_match.group(2)) if range_match else None

            # Print the extracted values
            print(f"Credits: {credits}")
            print(f"Subjects: {subjects}")
            print(f"Course Range: {course_range}")
