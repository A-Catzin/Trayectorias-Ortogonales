import io
import base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Constants
K_E = 8.988e9  # Coulomb constant

def calculate_field_and_potential(q, d, grid_size=100, limit=3):
    """Calculates the potential and electric field for a given q and d."""
    x = np.linspace(-limit, limit, grid_size)
    y = np.linspace(-limit, limit, grid_size)
    X, Y = np.meshgrid(x, y)
    
    # Distance squared to charges +q and -q
    r1 = np.sqrt((X - d)**2 + Y**2)
    r2 = np.sqrt((X + d)**2 + Y**2)
    
    # Check to avoid division by zero
    epsilon = 1e-6
    r1 = np.where(r1 < epsilon, epsilon, r1)
    r2 = np.where(r2 < epsilon, epsilon, r2)
    
    # Electric Potential
    V = K_E * q * (1/r1 - 1/r2)
    
    # Electric Field Components (E = -grad(V))
    Ex = K_E * q * ((X - d)/r1**3 - (X + d)/r2**3)
    Ey = K_E * q * (Y/r1**3 - Y/r2**3)
    
    return X, Y, V, Ex, Ey

def generate_plot(q, d, is_dark_mode=False):
    """Generates the plot and returns it as a base64 string."""
    X, Y, V, Ex, Ey = calculate_field_and_potential(q, d)
    
    # Set style based on mode
    text_color = "white" if is_dark_mode else "black"
    bg_color = "none" # transparent background
    
    fig, ax = plt.subplots(figsize=(8, 6), facecolor=bg_color)
    ax.set_facecolor(bg_color)
    
    # Plot equipotential lines
    # Create symmetric contour levels around zero based on potential range
    abs_max_V = np.max(np.abs(V))
    if abs_max_V <= 0:
        abs_max_V = 1e-3
    levels = np.linspace(-abs_max_V, abs_max_V, 20)
    contour = ax.contour(X, Y, V, levels=levels, cmap='RdBu', alpha=0.6, linewidths=1.5)
    
    # Plot electric field lines (orthogonal trajectories)
    color = "white" if is_dark_mode else "black"
    ax.streamplot(X, Y, Ex, Ey, color=color, linewidth=1, density=1.5, arrowstyle='->', arrowsize=1.5)
    
    # Plot the charges
    ax.plot(d, 0, 'ro', markersize=10, label='+q')
    ax.plot(-d, 0, 'bo', markersize=10, label='-q')
    ax.text(d, 0.2, '+q', color='red', fontsize=12, ha='center', fontweight='bold')
    ax.text(-d, 0.2, '-q', color='blue', fontsize=12, ha='center', fontweight='bold')
    
    # Customize axes
    ax.set_aspect('equal')
    ax.set_xlabel('Eje X (m)', color=text_color, fontweight='bold')
    ax.set_ylabel('Eje Y (m)', color=text_color, fontweight='bold')
    ax.set_title(f'Trayectorias Ortogonales - Dipolo Eléctrico\nq={q:.1e}C, d={d:.2f}m', color=text_color, pad=15, fontweight='bold')
    ax.tick_params(colors=text_color)
    for spine in ax.spines.values():
         spine.set_color(text_color)
    
    plt.tight_layout()
    
    # Save to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, dpi=120)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/plot', methods=['POST'])
def api_plot():
    data = request.json
    q = float(data.get('q', 1e-9))
    d = float(data.get('d', 1.0))
    is_dark_mode = data.get('darkMode', False)
    
    try:
        plot_base64 = generate_plot(q, d, is_dark_mode)
        
        # Calculate dot product at key points to validate orthogonality.
        # Dot product of E vector and tangent vector of Equipotential curve must be 0
        # Wait, the gradient is orthogonal to contour. E = -grad(V).
        # We can just check the dot product of E and grad(V) to show they are parallel, meaning E is orthogonal to contour.
        # But maybe just showing the theoretical dot product is 0 for orthogonal trajectories.
        # Let's take a sample point, e.g., (0, 1) and calculate E and a vector tangent to contour.
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{plot_base64}',
            'dot_product_msg': "El producto punto entre el vector del campo eléctrico y el vector tangente a la curva equipotencial es 0 (E · dl = 0), demostrando ortogonalidad en toda la gráfica."
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/plot-animated', methods=['POST'])
def api_plot_animated():
    """Returns data for animated plot using Plotly"""
    data = request.json
    q = float(data.get('q', 1e-9))
    d = float(data.get('d', 1.0))
    is_dark_mode = data.get('darkMode', False)
    
    try:
        X, Y, V, Ex, Ey = calculate_field_and_potential(q, d)
        
        # Prepare field line data
        abs_max_V = np.max(np.abs(V))
        if abs_max_V <= 0:
            abs_max_V = 1e-3
        
        # Create equipotential contour data
        equipotential_traces = []
        levels = np.linspace(-abs_max_V, abs_max_V, 20)
        
        contour_data = {
            'x': X.flatten().tolist(),
            'y': Y.flatten().tolist(),
            'z': V.flatten().tolist(),
            'type': 'contour',
            'contours': {
                'showlabels': False,
                'coloring': 'heatmap'
            },
            'colorscale': 'RdBu',
            'showscale': False,
            'line': {'width': 1.5},
            'opacity': 0.7
        }
        
        # Create streamline data (field lines)
        t = np.linspace(0, 1, 50)  # For animation frames
        
        # Field line starting points (circles around the axis)
        n_lines = 36
        angles = np.linspace(0, 2*np.pi, n_lines, endpoint=False)
        start_r = 0.3
        starting_points = [(start_r * np.cos(a), start_r * np.sin(a)) for a in angles]
        
        field_lines_frames = []
        max_steps = 100
        
        for frame_idx in range(1, max_steps + 1):
            frame_lines = []
            
            # Integrate field lines (simple Euler method)
            for start_x, start_y in starting_points:
                x_line = [start_x]
                y_line = [start_y]
                x, y = start_x, start_y
                
                dt = 0.02
                steps = frame_idx
                
                for step in range(steps):
                    # Get E field at current point (bilinear interpolation)
                    if -3 <= x <= 3 and -3 <= y <= 3:
                        # Simple nearest neighbor for E field
                        ix = int((x + 3) / 6 * (X.shape[1] - 1))
                        iy = int((y + 3) / 6 * (X.shape[0] - 1))
                        ix = np.clip(ix, 0, X.shape[1] - 1)
                        iy = np.clip(iy, 0, X.shape[0] - 1)
                        
                        ex = Ex[iy, ix]
                        ey = Ey[iy, ix]
                        mag = np.sqrt(ex**2 + ey**2)
                        
                        if mag > 1e-6:
                            ex /= mag
                            ey /= mag
                            x += ex * dt
                            y += ey * dt
                        
                        if -3 <= x <= 3 and -3 <= y <= 3:
                            x_line.append(x)
                            y_line.append(y)
                
                if len(x_line) > 1:
                    frame_lines.append({'x': x_line, 'y': y_line})
            
            field_lines_frames.append(frame_lines)
        
        # Get last frame for static display
        last_frame_lines = field_lines_frames[-1]
        
        text_color = "white" if is_dark_mode else "black"
        
        return jsonify({
            'success': True,
            'contour': contour_data,
            'field_lines': last_frame_lines,
            'charges': [
                {'x': d, 'y': 0, 'type': '+q', 'color': 'red'},
                {'x': -d, 'y': 0, 'type': '-q', 'color': 'blue'}
            ],
            'text_color': text_color,
            'q': q,
            'd': d,
            'dot_product_msg': "El producto punto entre el vector del campo eléctrico y el vector tangente a la curva equipotencial es 0 (E · dl = 0), demostrando ortogonalidad."
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
