from flask import Flask, request, jsonify, render_template
import base64
from openai import OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path
import json

# Load environment variables from .env file
load_dotenv()

# Get the current directory
current_dir = Path(__file__).parent.parent

# Initialize Flask app with correct template and static folders
app = Flask(__name__,
            template_folder=str(current_dir / 'templates'),
            static_folder=str(current_dir / 'static'))

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_selfie():
    try:
        # Get the image data and occasion from the request
        image_data = request.json['image']
        occasion = request.json.get('occasion', '')
        
        # Properly handle the base64 image data
        if 'data:image' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # First get the style analysis
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=500,
            messages=[
                {
                    "role": "system",
                    "content": """You are a precise style and fashion analyzer. Analyze the image and return your response in JSON format only.
                    When suggesting colors, include their hex codes."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this image and return ONLY a JSON response in this exact format:
                                For non-portrait images:
                                {{"error": "This image does not contain a clear view of a person. Please upload a clear selfie."}}

                                For valid selfies:
                                {{
                                    "age_range": "estimated age range (e.g., '20-25')",
                                    "gender": "person's apparent gender",
                                    "hair": "hair color",
                                    "skin": {{"name": "skin tone", "hex": "#hexcode"}},
                                    "styles": [
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                    ],
                                    "colors": [
                                        {{"name": "color name", "hex": "#hexcode"}},
                                        {{"name": "color name", "hex": "#hexcode"}},
                                        {{"name": "color name", "hex": "#hexcode"}},
                                        {{"name": "color name", "hex": "#hexcode"}},
                                        {{"name": "color name", "hex": "#hexcode"}}
                                    ]
                                }}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            response_format={ "type": "json_object" }
        )
        
        result = json.loads(response.choices[0].message.content)
        print("API Response:", result)
        # Generate images for each style
        if 'styles' in result:
            for style in result['styles']:
                try:
                    image_response = client.images.generate(
                        model="dall-e-3",
                        prompt=f"Fashion photograph of {style['description']} style outfit for {style['occasion']} occasion for a {result['gender']} {result['age_range']} year old. Full outfit on plain background, no human face.",
                        size="1024x1024",
                        quality="standard",
                        n=1,
                    )
                    style['image_url'] = image_response.data[0].url
                except Exception as img_error:
                    style['image_url'] = None
                    print(f"Error generating image: {str(img_error)}")
        print("API Response:", result)
        return jsonify({"success": True, "result": result})
        
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
