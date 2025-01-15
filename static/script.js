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
    const attire = document.getElementById('attire-select').value;
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
                occasion: occasion,
                attire: attire
            })
        });

        const data = await response.json();

        if (data.success) {
            // Display initial results
            displayInitialResults(data.result);
            
            // If images need to be generated
            if (!data.result.error && data.needsImageGeneration) {
                // Generate images
                const imageResponse = await fetch('/generate-images', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        occasion: occasion,
                        attire: attire,
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
                            ${error}
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

    // Create skin tone swatch
    const skinSwatch = `
        <div class="skin-swatch" style="display: flex; align-items: center; gap: 8px;">
            <div class="color-preview" style="width: 30px; height: 30px; border-radius: 50%; background-color: ${result.skin.hex}; border: 2px solid var(--brown-200);"></div>
            <span class="color-name" style="color: var(--brown-700);">${result.skin.name}</span>
        </div>`;

    resultsDiv.innerHTML = `
        <div class="analysis-details" style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 4px rgba(124, 45, 18, 0.1);">
            <h3 style="color: var(--brown-700); font-size: 1.5rem; margin-bottom: 20px; font-weight: 600;">Style Analysis</h3>
            
            <div class="compliment" style="background: var(--brown-50); padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--brown-100);">
                <p style="color: var(--brown-700); font-size: 1.1rem; font-style: italic; text-align: center; margin: 0;">
                    ${result.compliment || "You have a unique style that we're excited to enhance!"}
                </p>
            </div>

            <div class="analysis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div class="analysis-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                    <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Age Range</div>
                    <div class="item-value" style="color: var(--brown-700); font-weight: 500;">${result.age_range}</div>
                </div>

                <div class="analysis-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                    <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Gender</div>
                    <div class="item-value" style="color: var(--brown-700); font-weight: 500;">${result.gender}</div>
                </div>

                <div class="analysis-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                    <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Hair</div>
                    <div class="item-value" style="color: var(--brown-700); font-weight: 500;">${result.hair}</div>
                </div>

                <div class="analysis-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                    <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Skin Tone</div>
                    <div class="item-value" style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        ${skinSwatch}
                    </div>
                </div>
            </div>
            <!-- Add Hair Suggestions Section -->
            <div class="hair-suggestions" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--brown-100);">
                <h4 style="color: var(--brown-700); font-size: 1.2rem; margin-bottom: 16px;">Hair Recommendations</h4>
                
                <div class="hair-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="hair-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                        <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Current Hair</div>
                        <div class="item-value" style="color: var(--brown-700);">${result.hair_suggestions.current_hair}</div>
                    </div>

                    <div class="hair-item" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                        <div class="item-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 4px;">Face Shape</div>
                        <div class="item-value" style="color: var(--brown-700);">${result.hair_suggestions.face_shape_comment}</div>
                    </div>
                </div>

                <div class="recommendations" style="margin-top: 16px;">
                    <div class="rec-section" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100); margin-bottom: 12px;">
                        <div class="section-label" style="color: var(--brown-700); font-size: 0.9rem; margin-bottom: 8px;">Recommended Lengths</div>
                        <ul style="list-style: none; margin: 0; padding: 0;">
                            ${result.hair_suggestions.recommended_hair_lengths.map(length => 
                                `<li style="color: var(--brown-700); margin-bottom: 4px;">• ${length}</li>`
                            ).join('')}
                        </ul>
                    </div>

                    <div class="rec-section" style="background: var(--brown-50); padding: 16px; border-radius: 8px; border: 1px solid var(--brown-100);">
                        <div class="section-label" style="color: var(--brown-500); font-size: 0.9rem; margin-bottom: 8px;">Recommended Styles</div>
                        <ul style="list-style: none; margin: 0; padding: 0;">
                            ${result.hair_suggestions.recommended_hair_styles.map(style => 
                                `<li style="color: var(--brown-700); margin-bottom: 4px;">• ${style}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        ${renderColorPalette(result.colors)}
        ${renderStyles(result.styles)}
    `;
}

// Helper function for color palette
function renderColorPalette(colors) {
    const colorSwatches = colors.map(color => `
        <div class="color-swatch" style="text-align: center;">
            <div class="color-preview" style="width: 50px; height: 50px; border-radius: 8px; background-color: ${color.hex}; margin: 0 auto 8px; border: 2px solid var(--brown-100);"></div>
            <span class="color-name" style="color: var(--brown-700); font-size: 0.9rem;">${color.name}</span>
        </div>
    `).join('');

    return `
        <div class="color-palette" style="background: white; border-radius: 12px; padding: 24px; margin-top: 20px; box-shadow: 0 2px 4px rgba(124, 45, 18, 0.1);">
            <h3 style="color: var(--brown-700); font-size: 1.5rem; margin-bottom: 20px; font-weight: 600;">Recommended Colors</h3>
            <div class="color-swatches" style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                ${colorSwatches}
            </div>
        </div>
    `;
}


// Helper function for styles section
function renderStyles(styles) {
    return `
        <div class="styles-section" style="background: white; border-radius: 12px; padding: 24px; margin-top: 20px; box-shadow: 0 2px 4px rgba(124, 45, 18, 0.1);">
            <h3 style="color: var(--brown-700); font-size: 1.5rem; margin-bottom: 20px; font-weight: 600;">Recommended Styles</h3>
            <div id="styles-grid" class="styles-grid" style="display: grid; gap: 20px;">
                ${styles.map(style => `
                    <div class="style-item" id="style-${style.name.replace(/\s+/g, '-')}" 
                         style="background: var(--brown-50); padding: 20px; border-radius: 8px; border: 1px solid var(--brown-100);">
                        <h4 style="color: var(--brown-700); font-size: 1.2rem; margin-bottom: 12px; font-weight: 600;">${style.name}</h4>
                        <p style="color: var(--brown-600); margin-bottom: 16px; line-height: 1.5;">${style.description}</p>
                        <div class="loading-indicator" style="text-align: center; color: var(--brown-600); padding: 20px;">
                            Generating style image...
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
// Update style image
function updateStyleImage(imageData) {
    const styleElement = document.getElementById(`style-${imageData.style_name.replace(/\s+/g, '-')}`);
    if (styleElement) {
        const loadingIndicator = styleElement.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.outerHTML = `
                <img src="${imageData.image_url}" 
                     alt="Generated Style" 
                     style="width: 100%; height: auto; border-radius: 8px; margin-top: 16px; cursor: pointer;"
                     onclick="window.open('${imageData.image_url}', '_blank')">
            `;
        }
    }
}

// Add this function to check if an image is selected
function updateAnalyzeButton() {
    const capturedImage = document.getElementById('captured-image');
    const analyzeBtn = document.getElementById('analyze-btn');
    const occasionSelect = document.getElementById('occasion-select');
    const attireSelect = document.getElementById('attire-select');
    
    // More strict image presence check
    const hasValidImage = capturedImage && 
                         capturedImage.src && 
                         capturedImage.src !== '' &&
                         capturedImage.src !== 'data:,' &&
                         !capturedImage.src.endsWith('#') && 
                         !capturedImage.src.endsWith('undefined') &&
                         capturedImage.src !== window.location.href &&
                         capturedImage.complete &&  // Check if image is loaded
                         capturedImage.naturalWidth > 0;  // Check if image has content
    
    // Disable button if no valid image
    if (!hasValidImage) {
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('disabled');
        return;
    }
    
    // Enable button only if valid image and both dropdowns have values
    const hasSelections = occasionSelect.value && attireSelect.value;
    analyzeBtn.disabled = !hasSelections;
    analyzeBtn.classList.toggle('disabled', !hasSelections);
}

// Update file input handler
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const capturedImage = document.getElementById('captured-image');
            capturedImage.src = e.target.result;
            
            // Show preview and hide video
            document.getElementById('video-container').classList.add('hidden');
            document.getElementById('preview-container').classList.remove('hidden');
            
            // Wait for image to load before updating button
            capturedImage.onload = function() {
                updateAnalyzeButton();
            };
        };
        reader.readAsDataURL(file);
    }
}

// Update capture function
function capture() {
    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const capturedImage = document.getElementById('captured-image');
    capturedImage.src = canvas.toDataURL('image/jpeg');
    
    // Show preview and hide video
    document.getElementById('video-container').classList.add('hidden');
    document.getElementById('preview-container').classList.remove('hidden');
    
    // Wait for image to load before updating button
    capturedImage.onload = function() {
        updateAnalyzeButton();
    };
}

// Move initialization into a function
function initializeApp() {
    // Check if elements exist before adding listeners
    const fileInput = document.getElementById('file-input');
    const occasionSelect = document.getElementById('occasion-select');
    const attireSelect = document.getElementById('attire-select');
    const capturedImage = document.getElementById('captured-image');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (occasionSelect) {
        occasionSelect.addEventListener('change', updateAnalyzeButton);
    }
    
    if (attireSelect) {
        attireSelect.addEventListener('change', updateAnalyzeButton);
    }
    
    if (capturedImage) {
        capturedImage.addEventListener('load', updateAnalyzeButton);
    }
    
    // Initial button state
    updateAnalyzeButton();
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Add reset function
function resetAnalysis() {
    const capturedImage = document.getElementById('captured-image');
    capturedImage.src = '';  // Clear the image
    updateAnalyzeButton();   // Update button state
    
    // Reset other elements as needed
    document.getElementById('results').innerHTML = '';
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('video-container').classList.remove('hidden');
}
