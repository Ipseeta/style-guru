from flask import Flask, request, jsonify, render_template
import base64
from openai import AzureOpenAI, OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Load environment variables from .env file
load_dotenv()

# Get the current directory
current_dir = Path(__file__).parent.parent

# Initialize Flask app with correct template and static folders
app = Flask(__name__,
            template_folder=str(current_dir / 'templates'),
            static_folder=str(current_dir / 'static'))

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

azure_client = AzureOpenAI(
    api_key=os.environ.get('AZURE_OPENAI_API_KEY'),  
    api_version="2024-02-01" ,
    azure_endpoint=os.environ.get('AZURE_OPENAI_ENDPOINT')
)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_selfie():
    try:
        # Get data from request
        data = request.get_json()
        image_data = data['image'].split(',')[1]
        occasion = data['occasion']
        
        # Get initial analysis without images
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
                                    "compliment": "compliment for the person in two sentences.",
                                    "age_range": "estimated age range (e.g., '20-25')",
                                    "gender": "person's apparent gender",
                                    "hair": "hair color",
                                    "skin": {{"name": "skin tone", "hex": "#hexcode"}},
                                    "styles": [
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}},
                                        {{"name": "style name", "description": "brief description for {occasion}", "occasion": "{occasion}"}}
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
        return jsonify({
            "success": True,
            "result": result,
            "message": "Analysis complete. Loading style images...",
            "phase": "analysis_complete",
            "needsImageGeneration": True
        })

            
    except Exception as e:
        print(f"General Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Server Error: {str(e)}"
        })
@app.route('/generate-images', methods=['POST'])
def generate_images():
    try:
        data = request.get_json()
        styles = data['styles']
        occasion = data['occasion']
        gender = data['gender']
        age_range = data['age_range']
        
        # Create a thread pool for parallel processing
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Map each style to a future task
            future_to_style = {
                executor.submit(
                    generate_single_image, 
                    style, 
                    occasion,
                    gender,
                    age_range
                ): style['name'] 
                for style in styles
            }
            
            generated_images = []
            
            # Process completed images as they finish
            for future in future_to_style:
                style_name = future_to_style[future]
                try:
                    image_url = future.result()
                    generated_images.append({
                        "style_name": style_name,
                        "image_url": image_url
                    })
                except Exception as e:
                    print(f"Error generating image for {style_name}: {str(e)}")
                    generated_images.append({
                        "style_name": style_name,
                        "error": str(e)
                    })
        
        return jsonify({
            "success": True,
            "images": generated_images
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

def generate_single_image(style, occasion, gender, age_range):
    prompt = f"""Create a fashion outfit photo for {occasion} occasion.
    Style description: {style['description']} for {gender} and age range between {age_range}
    
    Requirements:
    - Professional fashion photography style
    - Clean white or light gray background
    - Full outfit displayed on invisible mannequin
    - High-quality, detailed clothing
    - No human faces or models
    - Focus on the outfit combination
    - Show accessories if mentioned
    - Ensure all items are clearly visible
    - Professional studio lighting
    - Strictly follow the style description and occasion
    - Sharp, clear details of fabrics and textures"""

    image_response = azure_client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )
    
    return image_response.data[0].url

if __name__ == '__main__':
    app.run(debug=True)
