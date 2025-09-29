# 📸 PhotoBooth Studio Web Application

A beautiful, modern web-based photobooth application that allows users to capture single photos or create stunning **multi-photo collages** with various frames and effects. Features sequential photo capture, countdown timers, and professional print output.

![PhotoBooth Studio](https://img.shields.io/badge/PhotoBooth-Studio-blue?style=for-the-badge)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square)
![Multi-Photo](https://img.shields.io/badge/Multi--Photo-Collage-purple?style=flat-square)

## ✨ Features

### 📷 **Camera Capture**
- Live camera preview with real-time frame overlay
- **Multi-photo collage sequences** (1, 2, 4, 6, or 8 photos)
- Countdown timer for each photo in sequence
- Progress tracking with visual indicators
- Flash effects and smooth transitions

### 🖼️ **Frame Collection**
#### Single Photo Frames:
- Classic Gold - Traditional elegant frame
- Hearts Love - Romantic with heart decorations  
- Rainbow Party - Colorful gradient design

#### Multi-Photo Collage Frames:
- **2-Photo Layout** - Side-by-side with gold styling
- **4-Photo Grid** - 2x2 arrangement with hearts theme
- **6-Photo Display** - 3x2 grid with rainbow design
- **8-Photo Strip** - 4x2 vintage photo booth style

### 🎨 **Style Effects**
- Normal, Vintage, Sepia, Black & White, Pop Art

### 📷 Camera Integration
- **Live camera preview** with real-time frame overlay
- **Webcam capture** with high-quality image processing
- **Real-time frame preview** to see how your photo will look

### 🖼️ Photo Frames & Effects
- **Multiple frame styles**: Classic Gold, Hearts Love, Rainbow Party, and more
- **Style effects**: Normal, Vintage, Sepia, Black & White, Pop Art
- **Real-time preview** of frames and effects
- **Easy frame switching** with instant updates

### 🎨 Image Processing
- **Professional image filters** and enhancements
- **High-quality image processing** using Pillow and OpenCV
- **Automatic image optimization** for web and print
- **Multiple output formats** supported

### 🖨️ Printing Features
- **Print-ready image preparation** at 300 DPI
- **Multiple print sizes**: 4x6, 5x7, 8x10 inches
- **Automatic image centering** and sizing
- **High-quality JPEG output** for printing

### 📱 User Interface
- **Responsive design** that works on desktop, tablet, and mobile
- **Modern gradient design** with smooth animations
- **Intuitive navigation** between Camera, Upload, and Gallery sections
- **Real-time notifications** for user feedback

### 🏪 Gallery Management
- **Photo gallery** to view all processed images
- **Instant download** of any processed photo
- **Print preparation** directly from gallery
- **Automatic thumbnail generation**

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- A computer with a webcam (for camera features)
- Modern web browser with camera permissions

### Installation

1. **Clone or download** the project to your local machine

2. **Navigate to the project directory**:
   ```bash
   cd "Photobooth Web"
   ```

3. **Create a virtual environment** (recommended):
   ```bash
   python -m venv photobooth_env
   
   # On macOS/Linux:
   source photobooth_env/bin/activate
   
   # On Windows:
   photobooth_env\Scripts\activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Open your web browser** and go to:
   ```
   http://localhost:5000
   ```

## 🎯 How to Use

### Taking Photos with Camera
1. Click on the **"Camera"** tab
2. Click **"Start Camera"** and allow camera permissions
3. Select your desired **frame** and **style effect**
4. Click **"Take Photo"** or press the spacebar
5. Your photo will be automatically processed and displayed

### Uploading Photos
1. Click on the **"Upload"** tab
2. **Drag and drop** images or click to browse
3. Select your desired **frame** and **style effect**
4. Photos will be automatically processed

### Viewing and Printing
1. Click on the **"Gallery"** tab to see all your photos
2. Click **"View"** to see a photo in full size
3. Use the **"Download"** button to save the image
4. Use **"Prepare for Print"** to create print-ready versions
5. Select your print size (4x6, 5x7, or 8x10 inches)

## 🖼️ Adding Custom Frames

### Frame Requirements
- **Format**: PNG with transparent background (or SVG)
- **Size**: 800x600 pixels minimum (1200x900 recommended)
- **Design**: Leave a rectangular area in the center transparent for the photo
- **Border**: Recommend 50-100px decorative border

### Adding Frames
1. Create or obtain frame images meeting the requirements above
2. Save them in the `static/frames/` directory
3. Restart the Flask application
4. Frames will automatically appear in the interface

### Sample Frame Names
- `classic_gold.png` - Elegant gold frame
- `party_balloons.png` - Fun party theme
- `wedding_flowers.png` - Romantic floral design
- `birthday_cake.png` - Birthday celebration theme

## 🛠️ Technical Details

### Backend (Flask)
- **Image processing** with Pillow and OpenCV
- **RESTful API** for frontend communication
- **File upload handling** with security validation
- **Image optimization** for web and print
- **Error handling** and logging

### Frontend (Vanilla JavaScript)
- **Camera API integration** for live video capture
- **Canvas manipulation** for image processing
- **Responsive UI** with CSS Grid and Flexbox
- **Real-time updates** and user feedback
- **Mobile-friendly** touch interactions

### File Structure
```
Photobooth Web/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This documentation
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   ├── js/
│   │   └── main.js       # Frontend JavaScript
│   ├── frames/           # Photo frame assets
│   └── uploads/          # Uploaded images
└── processed_images/     # Processed output images
```

## 📐 Configuration Options

### Image Processing Settings
You can modify these settings in `app.py`:

```python
# Maximum file size (default: 16MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Image processing dimensions
max_size = (800, 600)  # Thumbnail size for web display

# Print dimensions (300 DPI)
print_sizes = {
    '4x6': (1200, 1800),    # 4x6 inches at 300 DPI
    '5x7': (1500, 2100),    # 5x7 inches at 300 DPI
    '8x10': (2400, 3000)    # 8x10 inches at 300 DPI
}
```

### Style Effects
Current style effects available:
- **Normal**: No effects applied
- **Vintage**: Reduced saturation with slight blur
- **Sepia**: Classic brown-tone effect
- **Black & White**: Monochrome conversion
- **Pop Art**: Enhanced saturation and contrast

## 🔧 Troubleshooting

### Camera Not Working
1. **Check permissions**: Ensure your browser has camera access
2. **HTTPS required**: Some browsers require HTTPS for camera access
3. **Check camera usage**: Close other applications using the camera
4. **Browser compatibility**: Use Chrome, Firefox, Safari, or Edge

### Upload Issues
1. **File size**: Ensure images are under 16MB
2. **File format**: Use JPG, PNG, or GIF files
3. **Browser storage**: Clear browser cache if needed

### Print Quality
1. **High resolution**: Use high-resolution source images for best print quality
2. **Print settings**: Ensure printer is set to highest quality
3. **Paper type**: Use photo paper for best results

## 🚀 Deployment

### Local Network Access
To make the app accessible on your local network:

```bash
python app.py
# App will be available at http://your-ip-address:5000
```

### Production Deployment
For production deployment, consider:
1. **Use a production WSGI server** (gunicorn, uWSGI)
2. **Set up HTTPS** for camera access
3. **Configure proper security settings**
4. **Set up automatic backups** for processed images

## 🤝 Contributing

Feel free to contribute to this project by:
1. Adding new frame designs
2. Implementing additional image effects
3. Improving the user interface
4. Adding new features
5. Reporting bugs or issues

## 📜 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Flask** - Web framework
- **Pillow** - Image processing library
- **OpenCV** - Computer vision library
- **Font Awesome** - Beautiful icons
- **Google Fonts** - Typography

---

**Enjoy creating beautiful memories with PhotoBooth Studio!** 📸✨# Photobooth
