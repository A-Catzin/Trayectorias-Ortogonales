document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sliderQ = document.getElementById('sliderQ');
    const sliderD = document.getElementById('sliderD');
    const valQ = document.getElementById('valQ');
    const valD = document.getElementById('valD');
    const plotImage = document.getElementById('plotImage');
    const chartWrapper = document.getElementById('chartWrapper');
    const animationOverlay = document.getElementById('animationOverlay');
    const loader = document.getElementById('loader');
    const dotProductMsg = document.getElementById('dotProductMsg');
    const themeToggleBtn = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    // Storage for animation data
    let animationData = null;
    let imageWidth = 0;
    let imageHeight = 0;

    // Theme Management
    let isDarkMode = false;
    
    // Check local storage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlElement.classList.add('dark');
        isDarkMode = true;
    } else {
        htmlElement.classList.remove('dark');
        isDarkMode = false;
    }

    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            htmlElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            htmlElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
        updatePlot(); // Re-render plot with new theme colors
    });

    // Debounce function to prevent too many requests when sliding
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Function to fetch plot from server
    const updatePlot = () => {
        // Show loader
        loader.classList.remove('hidden');
        chartWrapper.style.display = 'none';

        const q = parseFloat(sliderQ.value) * 1e-9;
        const d = parseFloat(sliderD.value);

        // Fetch both static image and animation data
        Promise.all([
            fetch('/api/plot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: q, d: d, darkMode: isDarkMode })
            }).then(r => r.json()),
            fetch('/api/plot-animated', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: q, d: d, darkMode: isDarkMode })
            }).then(r => r.json())
        ])
        .then(([plotData, animData]) => {
            if(plotData.success && animData.success) {
                // Store animation data
                animationData = animData;

                // Preload image before showing
                const img = new Image();
                img.onload = () => {
                    plotImage.src = plotData.image;
                    imageWidth = img.width;
                    imageHeight = img.height;
                    
                    // Update SVG dimensions
                    animationOverlay.setAttribute('viewBox', `0 0 ${imageWidth} ${imageHeight}`);
                    
                    // Draw animated field lines overlay
                    drawAnimatedFieldLinesOverlay();
                    
                    loader.classList.add('hidden');
                    chartWrapper.style.display = 'block';
                    dotProductMsg.textContent = animData.dot_product_msg;
                };
                img.src = plotData.image;
            } else {
                console.error("Error generating plot");
                alert("Hubo un error al generar la gráfica.");
                loader.classList.add('hidden');
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            loader.classList.add('hidden');
            alert("Error al conectar con el servidor.");
        });
    };

    // Function to draw animated field line overlay with dashed flowing effect
    function drawAnimatedFieldLinesOverlay() {
        if (!animationData || !animationData.field_lines) return;

        // Clear previous paths
        animationOverlay.innerHTML = '';

        // Create unique style for this animation
        const animId = `anim-${Date.now()}`;
        const styleSheet = document.createElement('style');
        const lineColor = isDarkMode ? '#ffffff' : '#000000';
        
        styleSheet.textContent = `
            @keyframes ${animId} {
                0% {
                    stroke-dashoffset: 0;
                }
                100% {
                    stroke-dashoffset: -20;
                }
            }
            
            .animated-line {
                stroke: ${lineColor};
                stroke-width: 1.5;
                fill: none;
                stroke-dasharray: 6, 8;
                stroke-linecap: round;
                stroke-linejoin: round;
                opacity: 0.4;
                animation: ${animId} 1.5s linear infinite;
            }
        `;
        document.head.appendChild(styleSheet);

        // Sample field lines (not all) to avoid overcrowding
        const sampleRate = Math.max(1, Math.floor(animationData.field_lines.length / 50));
        
        // Add animated lines for field
        animationData.field_lines.forEach((line, idx) => {
            // Only draw every Nth line to avoid duplication
            if (idx % sampleRate !== 0) return;
            
            if (line.x && line.y && line.x.length > 2) {
                // Scale coordinates to SVG space (-3 to 3 range to pixels)
                const scaledPoints = line.x.map((xi, i) => {
                    // Map from [-3, 3] to [0, imageWidth] and [0, imageHeight]
                    const px = ((xi + 3) / 6) * imageWidth;
                    const py = ((3 - line.y[i]) / 6) * imageHeight; // Inverted Y for SVG
                    return [px, py];
                });

                // Create SVG path
                if (scaledPoints.length > 1) {
                    const pathData = scaledPoints
                        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
                        .join(' ');

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', pathData);
                    path.setAttribute('class', 'animated-line');
                    
                    animationOverlay.appendChild(path);
                }
            }
        });
    }

    const debouncedUpdatePlot = debounce(updatePlot, 300);

    // Event Listeners for Sliders
    sliderQ.addEventListener('input', (e) => {
        valQ.textContent = parseFloat(e.target.value).toFixed(1);
        debouncedUpdatePlot();
    });

    sliderD.addEventListener('input', (e) => {
        valD.textContent = parseFloat(e.target.value).toFixed(1);
        debouncedUpdatePlot();
    });

    // Initial load
    updatePlot();
});

