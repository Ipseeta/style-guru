let stream;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const capturedImage = document.getElementById('captured-image');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Error accessing camera. Please make sure you've granted camera permissions.");
    }
}

document.getElementById('capture-btn').addEventListener('click', async () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    const capturedImage = document.getElementById('captured-image');
    const captureBtn = document.getElementById('capture-btn');
    
    if (video.style.display !== 'none') {
        // Taking a photo
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage.src = canvas.toDataURL('image/jpeg');
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        captureBtn.textContent = 'Retake Photo';
        document.getElementById('analyze-btn').disabled = false;
        
        // Stop all video tracks to turn off the camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    } else {
        // Retaking a photo - reinitialize the camera
        video.style.display = 'block';
        capturedImage.style.display = 'none';
        captureBtn.textContent = 'Take Selfie';
        await initCamera(); // Restart the camera
    }
});

// Add file upload handling
document.getElementById('file-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const capturedImage = document.getElementById('captured-image');
            capturedImage.src = e.target.result;
            capturedImage.style.display = 'block';
            document.getElementById('video').style.display = 'none';
            document.getElementById('analyze-btn').disabled = false;
            
            // Stop the camera if it's running
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        reader.readAsDataURL(file);
    }
});

// Modify the analyze function to include occasion
async function analyzeImage() {
    const capturedImage = document.getElementById('captured-image');
    const occasion = document.getElementById('occasion-select').value;
    const resultsDiv = document.getElementById('results');
    
    if (!occasion) {
        alert('Please select an occasion');
        return;
    }

    try {
        document.getElementById('analyze-btn').disabled = true;
        resultsDiv.innerHTML = 'Analyzing...';
        resultsDiv.style.display = 'block';

        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: capturedImage.src,
                occasion: occasion
            })
        });

        const data = await response.json();
        
        if (data.success) {
            try {
                const result = JSON.parse(data.result);

                if (result.error) {
                    resultsDiv.innerHTML = `<p class="error">${result.error}</p>`;
                } else {
                    const skinTone = result.skin.name;
                    const skinSwatch = result.skin.hex;
                    const colorSwatches = result.colors.map(color => 
                        `<div class="color-swatch" style="display: inline-block; margin: 10px;">
                            <div style="text-align: center;">
                                <div class="color-preview" style="background-color: ${color.hex}; width: 100px; height: 30px; margin-bottom: 5px; border-radius: 4px;"></div>
                                <span class="color-name" style="display: block;">${color.name}</span>
                            </div>
                        </div>`
                    ).join('');

                    resultsDiv.innerHTML = `
                        <h3>Style Analysis:</h3>
                        <div class="analysis-details">
                            <p><strong>Age Range:</strong> ${result.age_range}</p>
                            <p><strong>Gender:</strong> ${result.gender}</p>
                            <p><strong>Hair:</strong> ${result.hair}</p>
                            <p><strong>Skin Tone:</strong> ${skinTone}</p>
                            <div class="skin-preview" style="background-color: ${skinSwatch}; width: 100px; height: 30px; margin-bottom: 5px; border-radius: 4px;"></div>
                        </div>
                        <p><strong>Recommended Styles:</strong> ${result.styles}</p>
                        <div class="color-palette">
                            <strong>Color Palette:</strong>
                            <div class="color-swatches" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 15px;">
                                ${colorSwatches}
                            </div>
                        </div>
                        <p><strong>Best Combination:</strong> ${result.combination}</p>
                    `;
                
                }
            } catch (parseError) {
                console.error('Parse Error:', parseError);
                console.log('Raw result:', data.result);
                resultsDiv.innerHTML = `<p class="error">Error parsing response: ${parseError.message}</p>`;
            }
        } else {
            resultsDiv.innerHTML = `<p class="error">API Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        resultsDiv.innerHTML = `<p class="error">Network Error: ${error.message}</p>`;
    } finally {
        document.getElementById('analyze-btn').disabled = false;
    }
}

analyzeBtn.addEventListener('click', analyzeImage);

// Initialize camera when page loads
initCamera();

// Add this to your existing JavaScript
document.getElementById('file-upload').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || '';
    document.getElementById('file-name').textContent = fileName;
});
