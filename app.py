from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import io
import base64
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'photobooth_secret_key_2025'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['PROCESSED_FOLDER'] = 'processed_images'
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size

# Ensure upload directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Main photobooth interface"""
    return render_template('index.html')

@app.route('/api/frames')
def get_frames():
    """Get list of available frames"""
    frames_dir = 'static/frames'
    frames = []
    
    if os.path.exists(frames_dir):
        for filename in os.listdir(frames_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')) and not filename.endswith('.md'):
                frames.append({
                    'id': filename.split('.')[0],
                    'name': filename.split('.')[0].replace('_', ' ').title(),
                    'url': f'/static/frames/{filename}'
                })
    
    return jsonify(frames)

@app.route('/api/upload', methods=['POST'])
def upload_images():
    """Upload and process single or multiple images"""
    try:
        # Get form parameters
        photo_count = int(request.form.get('photoCount', 1))
        frame_id = request.form.get('frame', 'none')
        style = request.form.get('style', 'normal')
        
        print(f"Processing {photo_count} photos with frame '{frame_id}' and style '{style}'")
        
        # Collect all images
        images = []
        
        # Handle camera data (base64 encoded)
        for i in range(photo_count):
            image_key = 'imageData' if i == 0 else f'imageData_{i}'
            if image_key in request.form:
                image_data = request.form[image_key]
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                
                try:
                    image_bytes = base64.b64decode(image_data)
                    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                    images.append(image)
                    print(f"Added camera image {i+1}")
                except Exception as e:
                    print(f"Error decoding camera image {i}: {e}")
        
        # Handle file uploads
        for i in range(photo_count):
            file_key = 'image' if i == 0 else f'image_{i}'
            if file_key in request.files:
                file = request.files[file_key]
                if file and file.filename and allowed_file(file.filename):
                    try:
                        image = Image.open(file.stream).convert('RGB')
                        images.append(image)
                        print(f"Added uploaded file {i+1}: {file.filename}")
                    except Exception as e:
                        print(f"Error opening uploaded file {i}: {e}")
        
        # Validate we have the right number of images
        if len(images) == 0:
            return jsonify({'error': 'No valid images provided'}), 400
        
        if photo_count > 1 and len(images) < photo_count:
            return jsonify({'error': f'Expected {photo_count} images, got {len(images)}. Please upload all required images.'}), 400
        
        # Process images
        if photo_count == 1:
            result_image = process_single_image(images[0], frame_id, style)
        else:
            # Take only the number we need (in case more were uploaded)
            result_image = process_collage(images[:photo_count], frame_id, style, photo_count)
        
        # Save result
        result_filename = f"processed_{uuid.uuid4().hex}.png"
        result_path = os.path.join(app.config['PROCESSED_FOLDER'], result_filename)
        result_image.save(result_path, 'PNG', quality=95)
        
        print(f"Saved processed image: {result_filename}")
        
        return jsonify({
            'success': True,
            'processed_url': f'/processed_images/{result_filename}',
            'processed_id': result_filename.split('.')[0],
            'photo_count': len(images)
        })
        
    except Exception as e:
        print(f"Error in upload_images: {str(e)}")
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

def process_single_image(image, frame_id, style):
    """Process a single image with effects and frame"""
    # Resize to standard size
    image.thumbnail((800, 600), Image.Resampling.LANCZOS)
    
    # Apply style effects
    image = apply_style_effect(image, style)
    
    # Apply frame if selected
    if frame_id != 'none':
        image = apply_frame_to_image(image, frame_id)
    
    return image

def process_collage(images, frame_id, style, photo_count):
    """Create a collage from multiple images"""
    # Check if we have a specific collage frame template
    if frame_id != 'none' and 'collage' in frame_id:
        return create_collage_with_template(images, frame_id, style, photo_count)
    else:
        # Standard collage creation
        processed_images = []
        for image in images:
            image.thumbnail((400, 300), Image.Resampling.LANCZOS)
            image = apply_style_effect(image, style)
            processed_images.append(image)
        
        # Create collage layout
        collage = create_collage_layout(processed_images, photo_count)
        
        # Apply frame if selected
        if frame_id != 'none':
            collage = apply_frame_to_image(collage, frame_id)
        
        return collage

def create_collage_with_template(images, frame_id, style, photo_count):
    """Create collage using frame template with predefined photo slots"""
    try:
        # Try to load collage frame template
        frame_path = os.path.join('static', 'frames', f'{frame_id}.png')
        if not os.path.exists(frame_path):
            frame_path = os.path.join('static', 'frames', f'{frame_id}.jpg')
        
        if os.path.exists(frame_path):
            # Load frame template
            frame_template = Image.open(frame_path).convert('RGBA')
            
            # Determine canvas size based on frame type
            if '2' in frame_id:
                canvas_size = (800, 400)
                photo_slots = get_2_photo_slots(canvas_size)
            elif '4' in frame_id:
                canvas_size = (800, 800)
                photo_slots = get_4_photo_slots(canvas_size)
            elif '6' in frame_id:
                canvas_size = (1200, 800)
                photo_slots = get_6_photo_slots(canvas_size)
            elif '8' in frame_id:
                canvas_size = (1600, 800)
                photo_slots = get_8_photo_slots(canvas_size)
            else:
                canvas_size = (800, 800)
                photo_slots = get_4_photo_slots(canvas_size)
            
            # Resize frame template
            frame_template = frame_template.resize(canvas_size, Image.Resampling.LANCZOS)
            
            # Create base canvas
            result = Image.new('RGB', canvas_size, (255, 255, 255))
            
            # Process and place each image in its slot
            for i, image in enumerate(images[:len(photo_slots)]):
                if i < len(photo_slots):
                    # Apply style effects
                    styled_image = apply_style_effect(image, style)
                    
                    # Fit image to slot
                    slot = photo_slots[i]
                    fitted_image = fit_image_to_slot(styled_image, slot)
                    
                    # Paste image into slot
                    result.paste(fitted_image, (slot[0], slot[1]))
            
            # Apply frame template on top
            if frame_template.mode == 'RGBA':
                result.paste(frame_template, (0, 0), frame_template)
            else:
                # Create mask for frame
                mask = create_collage_frame_mask(frame_template, photo_slots)
                result.paste(frame_template, (0, 0), mask)
            
            return result
        
        else:
            # Fallback to standard collage
            return process_collage_standard(images, frame_id, style, photo_count)
            
    except Exception as e:
        print(f"Error creating collage with template: {e}")
        return process_collage_standard(images, frame_id, style, photo_count)

def get_2_photo_slots(canvas_size):
    """Get photo slot positions for 2-photo layout"""
    width, height = canvas_size
    margin = 40
    slot_width = (width - 3 * margin) // 2
    slot_height = height - 2 * margin
    
    return [
        (margin, margin, slot_width, slot_height),
        (margin + slot_width + margin, margin, slot_width, slot_height)
    ]

def get_4_photo_slots(canvas_size):
    """Get photo slot positions for 4-photo layout"""
    width, height = canvas_size
    margin = 30
    slot_width = (width - 3 * margin) // 2
    slot_height = (height - 3 * margin) // 2
    
    return [
        (margin, margin, slot_width, slot_height),
        (margin + slot_width + margin, margin, slot_width, slot_height),
        (margin, margin + slot_height + margin, slot_width, slot_height),
        (margin + slot_width + margin, margin + slot_height + margin, slot_width, slot_height)
    ]

def get_6_photo_slots(canvas_size):
    """Get photo slot positions for 6-photo layout"""
    width, height = canvas_size
    margin = 25
    slot_width = (width - 4 * margin) // 3
    slot_height = (height - 3 * margin) // 2
    
    slots = []
    for row in range(2):
        for col in range(3):
            x = margin + col * (slot_width + margin)
            y = margin + row * (slot_height + margin)
            slots.append((x, y, slot_width, slot_height))
    
    return slots

def get_8_photo_slots(canvas_size):
    """Get photo slot positions for 8-photo layout"""
    width, height = canvas_size
    margin = 20
    slot_width = (width - 5 * margin) // 4
    slot_height = (height - 3 * margin) // 2
    
    slots = []
    for row in range(2):
        for col in range(4):
            x = margin + col * (slot_width + margin)
            y = margin + row * (slot_height + margin)
            slots.append((x, y, slot_width, slot_height))
    
    return slots

def fit_image_to_slot(image, slot):
    """Fit image to specified slot dimensions"""
    slot_x, slot_y, slot_width, slot_height = slot
    
    # Calculate scaling to fit within slot
    scale_x = slot_width / image.width
    scale_y = slot_height / image.height
    scale = min(scale_x, scale_y)
    
    # Resize image
    new_width = int(image.width * scale)
    new_height = int(image.height * scale)
    
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

def create_collage_frame_mask(frame_template, photo_slots):
    """Create mask for collage frame template"""
    mask = Image.new('L', frame_template.size, 255)  # Start with full frame
    draw = ImageDraw.Draw(mask)
    
    # Cut out photo slot areas
    for slot in photo_slots:
        x, y, width, height = slot
        draw.rectangle([x, y, x + width, y + height], fill=0)
    
    return mask

def process_collage_standard(images, frame_id, style, photo_count):
    """Standard collage processing (fallback)"""
    processed_images = []
    for image in images:
        image.thumbnail((400, 300), Image.Resampling.LANCZOS)
        image = apply_style_effect(image, style)
        processed_images.append(image)
    
    collage = create_collage_layout(processed_images, photo_count)
    
    if frame_id != 'none':
        collage = apply_frame_to_image(collage, frame_id)
    
    return collage

def apply_style_effect(image, style):
    """Apply visual effects to image"""
    if style == 'vintage':
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(0.7)
        image = image.filter(ImageFilter.GaussianBlur(0.3))
        brightness = ImageEnhance.Brightness(image)
        image = brightness.enhance(0.9)
        
    elif style == 'sepia':
        pixels = np.array(image)
        sepia_filter = np.array([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131]
        ])
        sepia_img = pixels.dot(sepia_filter.T)
        sepia_img = np.clip(sepia_img, 0, 255).astype(np.uint8)
        image = Image.fromarray(sepia_img)
        
    elif style == 'bw':
        image = image.convert('L').convert('RGB')
        
    elif style == 'pop':
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.5)
        contrast = ImageEnhance.Contrast(image)
        image = contrast.enhance(1.3)
    
    return image

def create_collage_layout(images, photo_count):
    """Create a grid layout collage"""
    layouts = {
        2: (2, 1, 800, 400),  # cols, rows, width, height
        4: (2, 2, 800, 800),
        6: (3, 2, 1200, 800),
        8: (4, 2, 1600, 800)
    }
    
    cols, rows, canvas_width, canvas_height = layouts.get(photo_count, (2, 2, 800, 800))
    
    # Create canvas
    canvas = Image.new('RGB', (canvas_width, canvas_height), (255, 255, 255))
    
    # Calculate cell dimensions
    cell_width = canvas_width // cols
    cell_height = canvas_height // rows
    margin = 10
    
    # Place images
    for i, image in enumerate(images):
        if i >= photo_count:
            break
            
        row = i // cols
        col = i % cols
        
        # Resize image to fit cell with margin
        target_width = cell_width - (2 * margin)
        target_height = cell_height - (2 * margin)
        
        # Maintain aspect ratio
        image_ratio = image.width / image.height
        target_ratio = target_width / target_height
        
        if image_ratio > target_ratio:
            # Image is wider, fit to width
            new_width = target_width
            new_height = int(target_width / image_ratio)
        else:
            # Image is taller, fit to height
            new_height = target_height
            new_width = int(target_height * image_ratio)
        
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Calculate position
        x = col * cell_width + (cell_width - new_width) // 2
        y = row * cell_height + (cell_height - new_height) // 2
        
        canvas.paste(image, (x, y))
    
    return canvas

def apply_frame_to_image(image, frame_id):
    """Composite image inside frame template"""
    try:
        # Try to load actual frame file first
        frame_path = os.path.join('static', 'frames', f'{frame_id}.png')
        if not os.path.exists(frame_path):
            frame_path = os.path.join('static', 'frames', f'{frame_id}.jpg')
        if not os.path.exists(frame_path):
            frame_path = os.path.join('static', 'frames', f'{frame_id}.svg')
            
        if os.path.exists(frame_path) and not frame_path.endswith('.svg'):
            return composite_image_in_frame(image, frame_path, frame_id)
        else:
            # Fallback to procedural frame generation
            return create_procedural_frame(image, frame_id)
            
    except Exception as e:
        print(f"Error applying frame {frame_id}: {e}")
        return create_procedural_frame(image, frame_id)

def composite_image_in_frame(image, frame_path, frame_id):
    """Composite user image inside a frame template"""
    try:
        # Load frame template
        frame_template = Image.open(frame_path).convert('RGBA')
        
        # Determine target size based on frame type
        if 'collage' in frame_id:
            # For collage frames, use larger canvas
            target_size = (1200, 800) if '6' in frame_id or '8' in frame_id else (800, 800)
        else:
            # For single photo frames
            target_size = (800, 600)
        
        # Resize frame template to target size
        frame_template = frame_template.resize(target_size, Image.Resampling.LANCZOS)
        
        # Create base canvas
        result = Image.new('RGB', target_size, (255, 255, 255))
        
        # Calculate photo placement area (inside frame border)
        frame_border = get_frame_border_size(frame_id)
        photo_area = (
            frame_border,
            frame_border,
            target_size[0] - frame_border,
            target_size[1] - frame_border
        )
        
        # Resize and position the user image
        user_image = fit_image_to_area(image, photo_area)
        
        # Calculate position to center the image in photo area
        img_x = frame_border + (photo_area[2] - photo_area[0] - user_image.width) // 2
        img_y = frame_border + (photo_area[3] - photo_area[1] - user_image.height) // 2
        
        # Paste user image onto canvas
        result.paste(user_image, (img_x, img_y))
        
        # Apply frame template on top
        if frame_template.mode == 'RGBA':
            result.paste(frame_template, (0, 0), frame_template)
        else:
            # Create mask for non-transparent frames
            mask = create_frame_mask(frame_template, photo_area)
            result.paste(frame_template, (0, 0), mask)
        
        return result
        
    except Exception as e:
        print(f"Error in composite_image_in_frame: {e}")
        return create_procedural_frame(image, frame_id)

def get_frame_border_size(frame_id):
    """Get the border size for different frame types"""
    if 'classic' in frame_id:
        return 60
    elif 'elegant' in frame_id:
        return 80
    elif 'vintage' in frame_id:
        return 70
    elif 'modern' in frame_id:
        return 40
    elif 'fun' in frame_id:
        return 50
    else:
        return 60

def fit_image_to_area(image, area):
    """Fit image to specified area while maintaining aspect ratio"""
    area_width = area[2] - area[0]
    area_height = area[3] - area[1]
    
    # Calculate scaling to fit within area
    scale_x = area_width / image.width
    scale_y = area_height / image.height
    scale = min(scale_x, scale_y)
    
    # Resize image
    new_width = int(image.width * scale)
    new_height = int(image.height * scale)
    
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

def create_frame_mask(frame_template, photo_area):
    """Create mask for frame template"""
    mask = Image.new('L', frame_template.size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw frame area (everything except photo area)
    draw.rectangle([0, 0, frame_template.width, photo_area[1]], fill=255)  # Top
    draw.rectangle([0, photo_area[3], frame_template.width, frame_template.height], fill=255)  # Bottom
    draw.rectangle([0, photo_area[1], photo_area[0], photo_area[3]], fill=255)  # Left
    draw.rectangle([photo_area[2], photo_area[1], frame_template.width, photo_area[3]], fill=255)  # Right
    
    return mask

def create_procedural_frame(image, frame_id):
    """Create procedural frame when template not available"""
    # Enhanced procedural frame with better photo integration
    border_size = get_frame_border_size(frame_id)
    new_width = image.width + (2 * border_size)
    new_height = image.height + (2 * border_size)
    
    # Create background
    if 'vintage' in frame_id:
        bg_color = (139, 115, 85)  # Warm brown
    elif 'classic' in frame_id:
        bg_color = (240, 240, 240)  # Light gray
    elif 'elegant' in frame_id:
        bg_color = (25, 25, 112)  # Midnight blue
    elif 'fun' in frame_id:
        bg_color = (255, 105, 180)  # Hot pink
    elif 'modern' in frame_id:
        bg_color = (64, 64, 64)  # Dark gray
    else:
        bg_color = (255, 255, 255)
    
    framed_image = Image.new('RGB', (new_width, new_height), bg_color)
    
    # Create inner area for photo with slight inset
    inner_border = 10
    photo_x = border_size + inner_border
    photo_y = border_size + inner_border
    photo_width = image.width - (2 * inner_border)
    photo_height = image.height - (2 * inner_border)
    
    # Resize image to fit inner area
    fitted_image = image.resize((photo_width, photo_height), Image.Resampling.LANCZOS)
    
    # Paste image with white mat border
    mat_color = (255, 255, 255)
    mat_thickness = 8
    
    # Draw white mat
    draw = ImageDraw.Draw(framed_image)
    mat_rect = [
        photo_x - mat_thickness,
        photo_y - mat_thickness,
        photo_x + photo_width + mat_thickness,
        photo_y + photo_height + mat_thickness
    ]
    draw.rectangle(mat_rect, fill=mat_color)
    
    # Paste the fitted image
    framed_image.paste(fitted_image, (photo_x, photo_y))
    
    # Add decorative frame elements
    draw = ImageDraw.Draw(framed_image)
    
    if 'vintage' in frame_id:
        # Ornate vintage border
        for i in range(3):
            thickness = 4 - i
            color = (101 + i*20, 67 + i*15, 33 + i*10)
            draw.rectangle([i*thickness, i*thickness, new_width-1-i*thickness, new_height-1-i*thickness], 
                         outline=color, width=thickness)
    
    elif 'classic' in frame_id:
        # Simple elegant border
        draw.rectangle([0, 0, new_width-1, new_height-1], outline=(0, 0, 0), width=8)
        draw.rectangle([12, 12, new_width-13, new_height-13], outline=(128, 128, 128), width=2)
    
    elif 'elegant' in frame_id:
        # Gold accent border
        draw.rectangle([0, 0, new_width-1, new_height-1], outline=(218, 165, 32), width=12)
        draw.rectangle([16, 16, new_width-17, new_height-17], outline=(255, 215, 0), width=4)
    
    elif 'fun' in frame_id:
        # Colorful multi-border
        colors = [(255, 20, 147), (0, 191, 255), (50, 205, 50), (255, 165, 0), (138, 43, 226)]
        for i, color in enumerate(colors):
            thickness = len(colors) - i
            draw.rectangle([i*4, i*4, new_width-1-i*4, new_height-1-i*4], outline=color, width=thickness)
    
    elif 'modern' in frame_id:
        # Minimalist border
        draw.rectangle([0, 0, new_width-1, new_height-1], outline=(32, 32, 32), width=6)
        draw.rectangle([10, 10, new_width-11, new_height-11], outline=(96, 96, 96), width=2)
    
    return framed_image

@app.route('/processed_images/<filename>')
def processed_image(filename):
    """Serve processed images"""
    return send_file(os.path.join(app.config['PROCESSED_FOLDER'], filename))

@app.route('/api/gallery')
def get_gallery():
    """Get gallery of processed images"""
    gallery = []
    
    if os.path.exists(app.config['PROCESSED_FOLDER']):
        for filename in os.listdir(app.config['PROCESSED_FOLDER']):
            if filename.lower().endswith('.png') and not filename.startswith('.'):
                file_path = os.path.join(app.config['PROCESSED_FOLDER'], filename)
                try:
                    stat = os.stat(file_path)
                    gallery.append({
                        'id': filename.split('.')[0],
                        'url': f'/processed_images/{filename}',
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'size': stat.st_size
                    })
                except OSError:
                    continue
    
    # Sort by creation time (newest first)
    gallery.sort(key=lambda x: x['created'], reverse=True)
    
    return jsonify(gallery)

@app.route('/api/print/<image_id>')
def print_image(image_id):
    """Prepare image for printing"""
    try:
        processed_filepath = os.path.join(app.config['PROCESSED_FOLDER'], f"{image_id}.png")
        
        if not os.path.exists(processed_filepath):
            return jsonify({'error': 'Image not found'}), 404
        
        image = Image.open(processed_filepath).convert('RGB')
        
        # Print sizes at 300 DPI
        print_sizes = {
            '4x6': (1200, 1800),
            '5x7': (1500, 2100),
            '8x10': (2400, 3000)
        }
        
        print_size = request.args.get('size', '4x6')
        if print_size not in print_sizes:
            return jsonify({'error': 'Invalid print size'}), 400
        
        target_size = print_sizes[print_size]
        
        # Resize maintaining aspect ratio
        image.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        # Create new image with exact print dimensions
        print_image = Image.new('RGB', target_size, (255, 255, 255))
        
        # Center the image
        x = (target_size[0] - image.size[0]) // 2
        y = (target_size[1] - image.size[1]) // 2
        print_image.paste(image, (x, y))
        
        # Save print version
        print_filename = f"print_{image_id}_{print_size}.jpg"
        print_filepath = os.path.join(app.config['PROCESSED_FOLDER'], print_filename)
        print_image.save(print_filepath, 'JPEG', quality=95, dpi=(300, 300))
        
        return jsonify({
            'success': True,
            'print_url': f'/processed_images/{print_filename}',
            'message': f'Image prepared for {print_size} printing at 300 DPI'
        })
        
    except Exception as e:
        print(f"Error preparing print: {str(e)}")
        return jsonify({'error': f'Print preparation failed: {str(e)}'}), 500

@app.route('/delete_image/<image_id>', methods=['DELETE'])
def delete_image(image_id):
    """Delete a processed image"""
    try:
        processed_filepath = os.path.join(app.config['PROCESSED_FOLDER'], f"{image_id}.png")
        
        if not os.path.exists(processed_filepath):
            return jsonify({'error': 'Image not found'}), 404
        
        # Delete the processed image file
        os.remove(processed_filepath)
        
        # Also delete any print versions if they exist
        for print_size in ['4x6', '5x7', '8x10']:
            print_filepath = os.path.join(app.config['PROCESSED_FOLDER'], f"print_{image_id}_{print_size}.jpg")
            if os.path.exists(print_filepath):
                os.remove(print_filepath)
        
        return jsonify({
            'success': True,
            'message': 'Image deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting image: {str(e)}")
        return jsonify({'error': f'Failed to delete image: {str(e)}'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 32MB.'}), 413

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5004)
