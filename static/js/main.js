document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sliderQ = document.getElementById('sliderQ');
    const sliderD = document.getElementById('sliderD');
    const valQ = document.getElementById('valQ');
    const valD = document.getElementById('valD');
    const plotContainer = document.getElementById('plotContainer');
    const loader = document.getElementById('loader');
    const dotProductMsg = document.getElementById('dotProductMsg');
    const themeToggleBtn = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

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

    // Function to fetch and display animated plot using Plotly
    const updatePlot = () => {
        // Show loader
        loader.classList.remove('hidden');

        const q = parseFloat(sliderQ.value) * 1e-9;
        const d = parseFloat(sliderD.value);

        fetch('/api/plot-animated', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: q,
                d: d,
                darkMode: isDarkMode
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                // Create Plotly traces
                const textColor = data.text_color;
                const gridColor = isDarkMode ? '#444444' : '#e5e7eb';
                const paperBgColor = isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)';
                const plotBgColor = isDarkMode ? '#111827' : '#ffffff';
                
                // Equipotential contours trace
                const contourTrace = {
                    type: 'contour',
                    x: data.contour.x.slice(0, 10000), // Sample for performance
                    y: data.contour.y.slice(0, 10000),
                    z: data.contour.z.slice(0, 10000),
                    colorscale: 'RdBu',
                    contours: {
                        showlabels: false,
                        coloring: 'heatmap'
                    },
                    colorbar: {
                        title: 'V (Voltios)',
                        tickcolor: textColor,
                        tickfont: { color: textColor }
                    },
                    hoverinfo: 'skip',
                    showscale: true,
                    line: { width: 0.5 },
                    opacity: 0.7
                };
                
                // Field lines (orthogonal trajectories) traces
                const fieldLineTraces = data.field_lines.map((line, idx) => ({
                    x: line.x,
                    y: line.y,
                    mode: 'lines',
                    line: {
                        color: isDarkMode ? '#ffffff' : '#000000',
                        width: 1.5
                    },
                    hoverinfo: 'skip',
                    showlegend: false
                }));

                // Charge markers traces
                const chargeTraces = data.charges.map(charge => ({
                    x: [charge.x],
                    y: [charge.y],
                    mode: 'markers+text',
                    marker: {
                        size: 15,
                        color: charge.color,
                        symbol: 'circle',
                        line: { color: 'white', width: 2 }
                    },
                    text: [charge.type],
                    textposition: 'top center',
                    textfont: { size: 14, color: textColor, family: 'Arial Black' },
                    hoverinfo: `${charge.type}`,
                    showlegend: false
                }));

                // Combine all traces
                const traces = [contourTrace, ...fieldLineTraces, ...chargeTraces];

                // Layout configuration
                const layout = {
                    title: {
                        text: `Trayectorias Ortogonales - Dipolo Eléctrico<br><sub>q=${(data.q).toExponential(2)}C, d=${data.d.toFixed(2)}m</sub>`,
                        font: { color: textColor, size: 18 },
                        x: 0.5,
                        xanchor: 'center'
                    },
                    xaxis: {
                        title: 'Eje X (m)',
                        titlefont: { color: textColor },
                        showgrid: true,
                        gridwidth: 1,
                        gridcolor: gridColor,
                        zeroline: true,
                        zerolinewidth: 2,
                        zerolinecolor: gridColor,
                        color: textColor,
                        range: [-3, 3]
                    },
                    yaxis: {
                        title: 'Eje Y (m)',
                        titlefont: { color: textColor },
                        showgrid: true,
                        gridwidth: 1,
                        gridcolor: gridColor,
                        zeroline: true,
                        zerolinewidth: 2,
                        zerolinecolor: gridColor,
                        color: textColor,
                        range: [-3, 3],
                        scaleanchor: 'x',
                        scaleratio: 1
                    },
                    paper_bgcolor: paperBgColor,
                    plot_bgcolor: plotBgColor,
                    margin: { l: 80, r: 80, t: 100, b: 80 },
                    hovermode: 'closest',
                    width: null,
                    height: null,
                    autosize: true
                };

                const config = {
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d']
                };

                // Draw plot
                Plotly.newPlot(plotContainer, traces, layout, config);

                // Add animation
                animateFieldLines(plotContainer, data, isDarkMode);

                loader.classList.add('hidden');
                dotProductMsg.textContent = data.dot_product_msg;

            } else {
                console.error("Error generating plot:", data.error);
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

    // Animate field lines (orthogonal trajectories)
    function animateFieldLines(container, plotData, isDarkMode) {
        let frameNum = 0;
        const maxFrames = 60; // Animation frames
        const isAnimating = true;

        function animate() {
            if (!isAnimating || frameNum >= maxFrames) return;
            
            frameNum++;
            
            // Update field line traces with animation effect
            const animationTraces = plotData.field_lines.map((line, idx) => {
                const progress = Math.min(frameNum / maxFrames, 1);
                const point_count = Math.floor(line.x.length * progress);
                
                return {
                    x: line.x.slice(0, Math.max(1, point_count)),
                    y: line.y.slice(0, Math.max(1, point_count)),
                    mode: 'lines',
                    line: {
                        color: isDarkMode ? '#ffffff' : '#000000',
                        width: 1.5
                    },
                    hoverinfo: 'skip',
                    showlegend: false
                };
            });

            // Restyle field lines
            Plotly.restyle(container, {
                x: animationTraces.map(t => t.x),
                y: animationTraces.map(t => t.y)
            }, Array.from({length: animationTraces.length}, (_, i) => i + 1)); // Skip contour trace (index 0)

            requestAnimationFrame(animate);
        }

        animate();
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

