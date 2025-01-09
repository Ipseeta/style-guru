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
    const analyzeBtn = document.getElementById('analyze-btn');
    
    if (!occasion) {
        alert('Please select an occasion');
        return;
    }

    try {
        // Disable button and show initial loading
        analyzeBtn.disabled = true;
        resultsDiv.innerHTML = '<div class="loading-indicator">Analyzing your style...</div>';
        resultsDiv.style.display = 'block';

        // Step 1: Get initial analysis
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
            // Display initial results
            displayInitialResults(data.result);
            
            // If images need to be generated
            if (data.needsImageGeneration) {
                // Generate images
                const imageResponse = await fetch('/generate-images', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        occasion: occasion,
                        styles: data.result.styles,
                        gender: data.result.gender,
                        age_range: data.result.age_range,
                    })
                });
                
                const imageData = await imageResponse.json();
                
                if (imageData.success) {
                    // Update each style with its generated image
                    imageData.images.forEach(img => {
                        const styleElement = document.getElementById(`style-${img.style_name.replace(/\s+/g, '-')}`);
                        if (styleElement) {
                            const loadingIndicator = styleElement.querySelector('.loading-indicator');
                            if (loadingIndicator) {
                                loadingIndicator.remove();
                            }
                            if (img.image_url) {
                                styleElement.innerHTML += `<img src="${img.image_url}" alt="${img.style_name}" class="style-image">`;
                            }
                        }
                    });
                }
            }
        } else {
            resultsDiv.innerHTML = `<div class="error">${data.error}</div>`;
        }
    } catch (error) {
            resultsDiv.innerHTML = `
                <div class="analysis-details">
                    <div class="error-message">
                        <p class="error" style="color: var(--brown-700); background-color: var(--brown-100); padding: 1rem; border-radius: 8px; border: 1px solid var(--brown-200); text-align: center; margin: 1rem 0;">
                            ${error.message}
                        </p>
                    </div>
                </div>`;
    } finally {
        analyzeBtn.disabled = false;
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

function displayInitialResults(result) {
    const resultsDiv = document.getElementById('results');
    
    // Check if result contains an error
    if (result.error) {
        resultsDiv.innerHTML = `
            <div class="analysis-details">
                <div class="error-message">
                    <p class="error" style="color: var(--brown-700); background-color: var(--brown-100); padding: 1rem; border-radius: 8px; border: 1px solid var(--brown-200); text-align: center; margin: 1rem 0;">
                        ${result.error}
                    </p>
                </div>
            </div>`;
        return;
    }

    // If no error, continue with the normal display
    // Create color swatches HTML
    const colorSwatches = result.colors.map(color => 
        `<div class="color-swatch" style="display: inline-block; margin: 10px;">
            <div style="text-align: center;">
                <div class="color-preview" style="background-color: ${color.hex}; width: 100px; height: 30px; margin-bottom: 5px; border-radius: 4px;"></div>
                <span class="color-name" style="display: block;">${color.name}</span>
            </div>
        </div>`
    ).join('');

    // Create skin tone swatch
    const skinSwatch = `
        <div class="skin-swatch">
            <div class="color-preview" style="background-color: ${result.skin.hex}; width: 100px; height: 30px; margin-bottom: 5px; border-radius: 4px;"></div>
            <span class="color-name">${result.skin.name}</span>
        </div>`;

    resultsDiv.innerHTML = `
        <div class="analysis-details">
            <h3>Style Analysis</h3>
            <p>${result.compliment}</p>
            <p><strong>Age Range:</strong> ${result.age_range}</p>
            <p><strong>Gender:</strong> ${result.gender}</p>
            <p><strong>Hair:</strong> ${result.hair}</p>
            <p><strong>Skin Tone:</strong></p>
            ${skinSwatch}
        </div>

        <div class="color-palette">
            <h3>Recommended Colors</h3>
            <div class="color-swatches">
                ${colorSwatches}
            </div>
        </div>
        <div class="styles-section">
            <h3>Recommended Styles</h3>
            <div id="styles-grid" class="styles-grid">
                ${result.styles.map(style => `
                    <div class="style-item" id="style-${style.name.replace(/\s+/g, '-')}">
                        <h4>${style.name}</h4>
                        <p>${style.description}</p>
                        <div class="loading-indicator">Generating style image...</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}
