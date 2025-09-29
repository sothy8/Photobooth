/**
 * PhotoBooth Studio - Professional Photo Application
 * Handles camera capture, file upload, and image processing
 */

class PhotoBoothApp {
    constructor() {
        // Core elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = null;
        
        // Application state
        this.stream = null;
        this.capturedPhotos = [];
        this.uploadedFiles = [];
        this.currentSection = 'camera';
        this.photoCount = 1;
        this.currentPhotoIndex = 0;
        this.isCapturing = false;
        this.isCameraStarted = false;
        
        // Settings
        this.selectedFrame = 'none';
        this.selectedStyle = 'normal';
        this.frames = [];
        this.currentImageId = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 PhotoBooth Studio initializing...');
        
        this.setupCanvas();
        this.setupEventListeners();
        await this.loadFrames();
        this.updateUI();
        
        console.log('✅ PhotoBooth Studio ready!');
    }

    setupCanvas() {
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = 640;
            this.canvas.height = 480;
            this.canvas.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.section;
                this.switchSection(section);
            });
        });

        // Camera controls
        const startBtn = document.getElementById('start-camera');
        const captureBtn = document.getElementById('capture-btn');
        const stopBtn = document.getElementById('stop-camera');

        if (startBtn) startBtn.addEventListener('click', () => this.startCamera());
        if (captureBtn) captureBtn.addEventListener('click', () => this.capturePhoto());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopCamera());

        // Photo count buttons
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(btn.dataset.count);
                this.setPhotoCount(count);
            });
        });

        // Style buttons
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedStyle = btn.dataset.style;
            });
        });

        // File upload
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Upload zone
        const uploadZone = document.getElementById('upload-zone');
        if (uploadZone) {
            uploadZone.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }

        // Gallery
        const refreshBtn = document.getElementById('refresh-gallery');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadGallery());
        }

        // Modal controls
        const modalClose = document.querySelector('.modal-close');
        const modal = document.getElementById('photo-modal');
        const downloadBtn = document.getElementById('download-btn');
        const printBtn = document.getElementById('print-btn');
        
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadCurrentImage());
        if (printBtn) printBtn.addEventListener('click', () => this.printCurrentImage());
    }

    switchSection(section) {
        console.log(`Switching to ${section} section`);
        this.currentSection = section;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });
        
        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `${section}-section`);
        });
        
        this.resetSession();
        
        if (section === 'gallery') {
            this.loadGallery();
        }
    }

    async startCamera() {
        console.log('📹 Starting camera...');
        
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = this.stream;
            await this.video.play();
            
            this.isCameraStarted = true;
            this.updateUI();
            this.showNotification('Camera started!', 'success');
            
        } catch (error) {
            console.error('Camera error:', error);
            this.showNotification('Cannot access camera. Check permissions.', 'error');
        }
    }

    async stopCamera() {
        console.log('⏹️ Stopping camera...');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
        }
        
        this.isCameraStarted = false;
        this.resetSession();
        this.updateUI();
        this.showNotification('Camera stopped', 'info');
    }

    setPhotoCount(count) {
        this.photoCount = count;
        this.resetSession();
        
        // Update buttons
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.count) === count);
        });
        
        // Update file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.multiple = count > 1;
        }
        
        // Update instruction
        const instruction = document.getElementById('upload-instruction');
        if (instruction) {
            instruction.textContent = `or click to browse (select ${count} photo${count > 1 ? 's' : ''})`;
        }
        
        this.updateUI();
    }

    async capturePhoto() {
        if (!this.isCameraStarted || this.isCapturing || this.currentPhotoIndex >= this.photoCount) {
            return;
        }

        this.isCapturing = true;
        console.log(`📸 Capturing photo ${this.currentPhotoIndex + 1} of ${this.photoCount}`);

        try {
            // Show countdown
            await this.showCountdown();
            
            // Capture image
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.canvas.toDataURL('image/png');
            
            this.capturedPhotos.push(imageData);
            this.currentPhotoIndex++;
            
            this.updateUI();
            this.showNotification(`Photo ${this.currentPhotoIndex} captured!`, 'success');
            
            // Auto-process if done
            if (this.currentPhotoIndex >= this.photoCount) {
                setTimeout(() => this.processImages(), 1000);
            }
            
        } catch (error) {
            console.error('Capture error:', error);
            this.showNotification('Failed to capture photo', 'error');
        } finally {
            this.isCapturing = false;
        }
    }

    async showCountdown() {
        const overlay = document.getElementById('countdown-overlay');
        const number = document.getElementById('countdown-number');
        
        if (!overlay || !number) return;
        
        overlay.style.display = 'flex';
        
        for (let i = 3; i > 0; i--) {
            number.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        number.textContent = '📸';
        await new Promise(resolve => setTimeout(resolve, 500));
        
        overlay.style.display = 'none';
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        console.log(`📁 Selected ${files.length} files`);
        
        if (files.length === 0) {
            this.uploadedFiles = [];
            return;
        }
        
        // Validate count
        if (files.length !== this.photoCount) {
            this.showNotification(`Please select exactly ${this.photoCount} file(s)`, 'warning');
            event.target.value = '';
            return;
        }
        
        // Validate types
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        const invalidFiles = files.filter(file => !validTypes.includes(file.type));
        
        if (invalidFiles.length > 0) {
            this.showNotification('Please select only image files', 'warning');
            event.target.value = '';
            return;
        }
        
        this.uploadedFiles = files;
        this.showNotification(`${files.length} file(s) ready!`, 'success');
        
        // Auto-process
        setTimeout(() => this.processImages(), 1000);
    }

    async processImages() {
        console.log('🔄 Processing images...');
        
        const hasCamera = this.capturedPhotos.length > 0;
        const hasUpload = this.uploadedFiles.length > 0;
        
        if (!hasCamera && !hasUpload) {
            this.showNotification('Please capture or select photos first', 'warning');
            return;
        }
        
        this.showProcessingOverlay(true);
        
        try {
            const formData = new FormData();
            formData.append('photoCount', this.photoCount);
            formData.append('frame', this.selectedFrame);
            formData.append('style', this.selectedStyle);
            
            if (hasCamera) {
                this.capturedPhotos.forEach((photoData, index) => {
                    const key = index === 0 ? 'imageData' : `imageData_${index}`;
                    formData.append(key, photoData);
                });
            } else {
                this.uploadedFiles.forEach((file, index) => {
                    const key = index === 0 ? 'image' : `image_${index}`;
                    formData.append(key, file);
                });
            }
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showResult(result);
                this.showNotification(`Successfully processed ${result.photo_count} photo(s)!`, 'success');
            } else {
                throw new Error(result.error || 'Processing failed');
            }
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showNotification(`Processing failed: ${error.message}`, 'error');
        } finally {
            this.showProcessingOverlay(false);
        }
    }

    showResult(result) {
        // Show success notification with action buttons
        this.showSuccessWithActions(result);
        
        // Also open modal
        this.openModal(result.processed_url, result.processed_id);
        
        // Refresh gallery if we're on gallery section
        if (this.currentSection === 'gallery') {
            setTimeout(() => this.loadGallery(), 1000);
        }
    }

    showSuccessWithActions(result) {
        // Create enhanced success notification with download/print buttons
        const notification = document.createElement('div');
        notification.className = 'notification notification-success notification-enhanced';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🎉</span>
                    <span style="font-weight: bold;">Photo processed successfully!</span>
                    <button onclick="this.closest('.notification').remove()" 
                            style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto;">×</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <button onclick="photoBoothApp.downloadImage('${result.processed_url}', 'photobooth_${Date.now()}.png')" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        📥 Download
                    </button>
                    <button onclick="photoBoothApp.printImage('${result.processed_id}')" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        🖨️ Print
                    </button>
                    <button onclick="photoBoothApp.shareImage('${result.processed_url}')" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        📤 Share
                    </button>
                    <button onclick="photoBoothApp.openModal('${result.processed_url}', '${result.processed_id}')" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        👁️ View
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds (longer for action buttons)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    openModal(imageUrl, imageId) {
        const modal = document.getElementById('photo-modal');
        const modalImage = document.getElementById('modal-image');
        
        if (modal && modalImage) {
            modalImage.src = imageUrl;
            this.currentImageId = imageId;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Add keyboard support
            this.modalKeyHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeModal();
                } else if (e.key === 'd' || e.key === 'D') {
                    this.downloadCurrentImage();
                } else if (e.key === 'p' || e.key === 'P') {
                    this.printCurrentImage();
                }
            };
            
            document.addEventListener('keydown', this.modalKeyHandler);
        }
    }

    closeModal() {
        const modal = document.getElementById('photo-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Remove keyboard handler
            if (this.modalKeyHandler) {
                document.removeEventListener('keydown', this.modalKeyHandler);
                this.modalKeyHandler = null;
            }
        }
    }

    downloadCurrentImage() {
        const modalImage = document.getElementById('modal-image');
        if (modalImage && modalImage.src) {
            this.downloadImage(modalImage.src, `photobooth_${Date.now()}.png`);
        }
    }

    downloadImage(url, filename = 'photobooth_image.png') {
        console.log('📥 Downloading image:', filename);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Download started! Check your Downloads folder.', 'success');
    }

    async printCurrentImage() {
        if (!this.currentImageId) {
            this.showNotification('No image selected for printing', 'warning');
            return;
        }
        
        await this.printImage(this.currentImageId);
    }

    async printImage(imageId) {
        console.log('🖨️ Preparing image for print:', imageId);
        
        try {
            // Get selected print size
            const printSizeSelect = document.getElementById('print-size');
            const printSize = printSizeSelect ? printSizeSelect.value : '4x6';
            
            this.showNotification('Preparing image for printing...', 'info');
            
            const response = await fetch(`/api/print/${imageId}?size=${printSize}`, {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Open print-ready image in new window
                window.open(result.print_url, '_blank');
                this.showNotification(`Print-ready ${printSize}" image opened in new tab!`, 'success');
            } else {
                throw new Error(result.error || 'Failed to prepare print');
            }
            
        } catch (error) {
            console.error('Print preparation error:', error);
            this.showNotification(`Print preparation failed: ${error.message}`, 'error');
        }
    }

    shareImage(imageUrl) {
        console.log('📤 Sharing image');
        
        if (navigator.share) {
            // Use native sharing if available
            fetch(imageUrl)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], 'photobooth_image.png', { type: 'image/png' });
                    navigator.share({
                        title: 'My PhotoBooth Picture',
                        text: 'Check out my awesome photo from PhotoBooth Studio!',
                        files: [file]
                    });
                })
                .catch(() => {
                    this.fallbackShare(imageUrl);
                });
        } else {
            this.fallbackShare(imageUrl);
        }
    }

    deleteImage(imageId, imageElement) {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        console.log('🗑️ Deleting image:', imageId);
        
        fetch(`/delete_image/${imageId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Remove from gallery with animation
                if (imageElement) {
                    imageElement.style.transform = 'scale(0)';
                    imageElement.style.opacity = '0';
                    setTimeout(() => {
                        imageElement.remove();
                    }, 300);
                }
                this.showNotification('🗑️ Image deleted successfully', 'success');
            } else {
                this.showNotification('❌ Failed to delete image', 'error');
            }
        })
        .catch(error => {
            console.error('Delete error:', error);
            this.showNotification('❌ Error deleting image', 'error');
        });
    }

    deleteCurrentImage() {
        if (this.currentImageId) {
            if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
                return;
            }
            
            console.log('🗑️ Deleting current image:', this.currentImageId);
            
            fetch(`/delete_image/${this.currentImageId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.closeModal();
                    this.loadGallery(); // Refresh gallery
                    this.showNotification('🗑️ Image deleted successfully', 'success');
                } else {
                    this.showNotification('❌ Failed to delete image', 'error');
                }
            })
            .catch(error => {
                console.error('Delete error:', error);
                this.showNotification('❌ Error deleting image', 'error');
            });
        }
    }

    fallbackShare(imageUrl) {
        // Fallback sharing options
        const shareModal = document.createElement('div');
        shareModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        shareModal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center;">
                <h3 style="margin-bottom: 20px;">Share Your Photo</h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button onclick="navigator.clipboard.writeText('${imageUrl}').then(() => {
                        photoBoothApp.showNotification('Link copied to clipboard!', 'success');
                        this.closest('[style*=position]').remove();
                    })" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
                        📋 Copy Link
                    </button>
                    <button onclick="photoBoothApp.downloadImage('${imageUrl}', 'photobooth_${Date.now()}.png'); this.closest('[style*=position]').remove();" 
                            style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer;">
                        📥 Download to Share
                    </button>
                    <button onclick="this.closest('[style*=position]').remove();" 
                            style="padding: 12px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(shareModal);
    }

    // Add quick action after processing
    addQuickActions(result) {
        // Add floating action buttons temporarily
        const actionContainer = document.createElement('div');
        actionContainer.id = 'quick-actions';
        actionContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 9999;
            animation: slideUp 0.3s ease;
        `;
        
        const downloadBtn = this.createActionButton('📥', 'Download', () => {
            this.downloadImage(result.processed_url, `photobooth_${Date.now()}.png`);
        });
        
        const printBtn = this.createActionButton('🖨️', 'Print', () => {
            this.printImage(result.processed_id);
        });
        
        const viewBtn = this.createActionButton('👁️', 'View', () => {
            this.openModal(result.processed_url, result.processed_id);
        });
        
        const closeBtn = this.createActionButton('✕', 'Close', () => {
            actionContainer.remove();
        });
        
        actionContainer.appendChild(downloadBtn);
        actionContainer.appendChild(printBtn);
        actionContainer.appendChild(viewBtn);
        actionContainer.appendChild(closeBtn);
        
        document.body.appendChild(actionContainer);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (actionContainer.parentElement) {
                actionContainer.remove();
            }
        }, 15000);
    }

    createActionButton(icon, label, onClick) {
        const button = document.createElement('button');
        button.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            min-width: 120px;
            transition: all 0.2s ease;
        `;
        
        button.innerHTML = `<span>${icon}</span><span>${label}</span>`;
        
        button.addEventListener('mouseover', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });
        
        button.addEventListener('click', onClick);
        
        return button;
    }

    resetSession() {
        this.capturedPhotos = [];
        this.uploadedFiles = [];
        this.currentPhotoIndex = 0;
        this.isCapturing = false;
        
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        
        this.updateUI();
    }

    updateUI() {
        this.updateCameraControls();
        this.updateProgressDisplay();
    }

    updateCameraControls() {
        const startBtn = document.getElementById('start-camera');
        const captureBtn = document.getElementById('capture-btn');
        const stopBtn = document.getElementById('stop-camera');
        
        if (startBtn) startBtn.style.display = this.isCameraStarted ? 'none' : 'block';
        if (captureBtn) captureBtn.style.display = this.isCameraStarted ? 'block' : 'none';
        if (stopBtn) stopBtn.style.display = this.isCameraStarted ? 'block' : 'none';
    }

    updateProgressDisplay() {
        const currentPhotoEl = document.getElementById('current-photo');
        const totalPhotosEl = document.getElementById('total-photos');
        const progressDots = document.getElementById('progress-dots');
        
        if (currentPhotoEl) currentPhotoEl.textContent = this.currentPhotoIndex + 1;
        if (totalPhotosEl) totalPhotosEl.textContent = this.photoCount;
        
        if (progressDots) {
            progressDots.innerHTML = '';
            for (let i = 0; i < this.photoCount; i++) {
                const dot = document.createElement('div');
                dot.className = 'progress-dot';
                if (i < this.currentPhotoIndex) {
                    dot.classList.add('completed');
                } else if (i === this.currentPhotoIndex) {
                    dot.classList.add('current');
                }
                progressDots.appendChild(dot);
            }
        }
    }

    async loadFrames() {
        console.log('🖼️ Loading frames...');
        
        try {
            const response = await fetch('/api/frames');
            this.frames = await response.json();
            
            this.populateFramesGrid('frames-grid');
            this.populateFramesGrid('upload-frames-grid');
            
            console.log(`✅ Loaded ${this.frames.length} frames`);
        } catch (error) {
            console.error('Frame loading error:', error);
            this.showNotification('Failed to load frames', 'error');
        }
    }

    populateFramesGrid(gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        
        // Keep "No Frame" option
        const noFrameOption = grid.querySelector('[data-frame="none"]');
        grid.innerHTML = '';
        if (noFrameOption) {
            grid.appendChild(noFrameOption);
            noFrameOption.addEventListener('click', () => {
                grid.querySelectorAll('.frame-option').forEach(opt => opt.classList.remove('active'));
                noFrameOption.classList.add('active');
                this.selectedFrame = 'none';
            });
        }
        
        // Add frame options
        this.frames.forEach(frame => {
            const frameOption = document.createElement('div');
            frameOption.className = 'frame-option';
            frameOption.dataset.frame = frame.id;
            
            frameOption.innerHTML = `
                <div class="frame-preview-mini">
                    <img src="${frame.url}" alt="${frame.name}" style="width: 100%; height: 50px; object-fit: cover; border-radius: 4px;">
                    <div class="frame-name">${frame.name}</div>
                </div>
            `;
            
            frameOption.addEventListener('click', () => {
                grid.querySelectorAll('.frame-option').forEach(opt => opt.classList.remove('active'));
                frameOption.classList.add('active');
                this.selectedFrame = frame.id;
                console.log('Frame selected:', frame.name);
            });
            
            grid.appendChild(frameOption);
        });
    }

    async loadGallery() {
        console.log('🖼️ Loading gallery...');
        
        try {
            const response = await fetch('/api/gallery');
            const gallery = await response.json();
            
            const galleryGrid = document.getElementById('gallery-grid');
            if (!galleryGrid) return;
            
            if (gallery.length === 0) {
                galleryGrid.innerHTML = `
                    <div class="gallery-empty">
                        <i class="fas fa-images"></i>
                        <h3>No photos yet</h3>
                        <p>Start taking photos to build your gallery!</p>
                    </div>
                `;
                return;
            }
            
            galleryGrid.innerHTML = gallery.map(item => `
                <div class="gallery-item" onclick="photoBoothApp.openModal('${item.url}', '${item.id}')">
                    <img src="${item.url}" alt="Gallery photo" style="width: 100%; height: 200px; object-fit: cover;">
                    <div class="gallery-actions">
                        <button onclick="event.stopPropagation(); photoBoothApp.downloadImage('${item.url}', 'photobooth_${item.id}.png')" 
                                class="btn-small" title="Download">
                            📥
                        </button>
                        <button onclick="event.stopPropagation(); photoBoothApp.printImage('${item.id}')" 
                                class="btn-small" title="Print">
                            🖨️
                        </button>
                        <button onclick="event.stopPropagation(); photoBoothApp.deleteImage('${item.id}', this.parentElement.parentElement)" 
                                class="btn-small btn-delete" title="Delete">
                            🗑️
                        </button>
                    </div>
                    <div class="gallery-item-info" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 8px;">
                        <div class="gallery-date" style="font-size: 12px;">${new Date(item.created).toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('');
            
            console.log(`✅ Loaded ${gallery.length} gallery items`);
        } catch (error) {
            console.error('Gallery loading error:', error);
            this.showNotification('Failed to load gallery', 'error');
        }
    }

    showProcessingOverlay(show) {
        const overlay = document.getElementById('processing-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto;">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 PhotoBooth Studio starting...');
    window.photoBoothApp = new PhotoBoothApp();
});

// Add animations and styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    .gallery-item {
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        transition: transform 0.2s ease;
    }
    
    .gallery-item:hover {
        transform: scale(1.05);
    }
    
    .gallery-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 5px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .gallery-item:hover .gallery-actions {
        opacity: 1;
    }
    
    .btn-small {
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .btn-small:hover {
        background: rgba(0,0,0,0.9);
    }
    
    .btn-delete {
        background: rgba(220,53,69,0.8) !important;
    }
    
    .btn-delete:hover {
        background: rgba(220,53,69,1) !important;
    }
`;
document.head.appendChild(style);