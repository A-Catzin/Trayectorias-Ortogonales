document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const sliderQ = document.getElementById('sliderQ');
    const sliderD = document.getElementById('sliderD');
    const valQ = document.getElementById('valQ');
    const valD = document.getElementById('valD');
    const plotImage = document.getElementById('plotImage');
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

    // Function to fetch plot from server
    const updatePlot = () => {
        // Show loader, hide image
        loader.classList.remove('hidden');
        plotImage.classList.remove('fade-in');

        const q = parseFloat(sliderQ.value) * 1e-9;
        const d = parseFloat(sliderD.value);

        fetch('/api/plot', {
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
                // Preload image before showing to ensure smooth transition
                const img = new Image();
                img.onload = () => {
                    plotImage.src = data.image;
                    loader.classList.add('hidden');
                    plotImage.classList.add('fade-in');
                    dotProductMsg.textContent = data.dot_product_msg;
                };
                img.src = data.image;
            } else {
                console.error("Error generating plot:", data.error);
                alert("Hubo un error al generar la gráfica.");
                loader.classList.add('hidden');
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            loader.classList.add('hidden');
        });
    };

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
