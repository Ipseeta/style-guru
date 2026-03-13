# Style Genius 👔👗

An AI-powered fashion recommendation system that provides personalized style suggestions based on your selfie and chosen occasion.

## ✨ Features

### 📸 Image Analysis

- Take a selfie through your browser
- Upload an existing photo
- Real-time camera integration

### 🎯 Personalized Analysis

- Age range estimation
- Gender detection
- Hair color analysis
- Skin tone detection with hex color matching
- Custom color palette recommendations

### 👚 Style Recommendations

- Occasion-based outfit suggestions
  - Casual
  - Formal
  - Date
  - Party
- AI-generated outfit visualizations
- Personalized clothing combinations

### ⚡ Fast Response

- Immediate style analysis results
- Background loading of AI-generated outfits
- Responsive user interface

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python, Flask
- **AI/ML**:
  - Azure OpenAI GPT-5.4 (image analysis)
  - Azure OpenAI DALL-E 3 (outfit visualization)

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- OpenAI API key
- Web browser with camera access (for selfie feature)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/style-guru.git
cd style-guru
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Set up environment variables

```bash
# Create .env file and add your Azure OpenAI keys
echo "AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com" >> .env
echo "AZURE_OPENAI_API_KEY=your-azure-api-key" >> .env
echo "AZURE_OPENAI_API_VERSION=version" >> .env
```

4. Run the application

```bash
python3 api/index.py
```

5. Open your browser and navigate to `http://localhost:5000`

## 📝 Usage

1. **Start the App**

   - Open the application in your web browser
   - Allow camera access if you plan to take a selfie

2. **Capture Image**

   - Click "Take Selfie" to use your camera
   - Or use "Choose file" to upload an existing photo

3. **Select Occasion**

   - Choose from the dropdown menu:
     - Casual
     - Formal
     - Date
     - Party

4. **Get Recommendations**
   - Click "Style Me" to receive your analysis
   - View immediate style results
   - Wait for AI-generated outfit visualizations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 Vision and DALL-E 3 APIs
- Flask team for the web framework
- Tailwind CSS for color system inspiration
- Google Fonts for Playfair Display font

---

Made with ❤️ by Ipseeta
