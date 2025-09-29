# Frame Assets

This directory contains photo frame overlays for the PhotoBooth application.

## Current Frames

Due to the text-based nature of this setup, I've created placeholder files. To add real frames:

1. Create PNG images with transparent backgrounds
2. The frames should have a cutout area in the center where the photo will be placed
3. Recommended size: 800x600 pixels or larger
4. Use transparent PNG format for best results

## Frame Types to Add:

### Classic Frames
- classic_gold.png - Elegant gold frame
- classic_silver.png - Classic silver frame
- classic_wood.png - Wooden frame texture

### Fun Frames  
- party_balloon.png - Colorful balloon border
- birthday_cake.png - Birthday theme with cake elements
- hearts_love.png - Romantic heart decorations

### Seasonal Frames
- winter_snow.png - Winter/Christmas theme
- spring_flowers.png - Spring floral design
- summer_beach.png - Summer beach theme
- autumn_leaves.png - Fall/autumn leaves

### Modern Frames
- minimalist_black.png - Clean black border
- geometric_pattern.png - Modern geometric design
- gradient_rainbow.png - Colorful gradient border

## Frame Design Guidelines:

1. **Center Area**: Leave a rectangular area in the center transparent for the photo
2. **Border Width**: Recommend 50-100px border width
3. **Resolution**: High resolution (at least 800x600, preferably 1200x900)
4. **Format**: PNG with alpha channel for transparency
5. **Style**: Make frames visually appealing but not overwhelming

## Adding New Frames:

1. Save frame PNG files to this directory
2. The backend will automatically detect them
3. Restart the Flask application to load new frames
4. Frames will appear in both camera and upload sections

## Sample Frame Creation Tips:

- Use design software like Photoshop, GIMP, or Canva
- Create a solid background with a transparent rectangular cutout
- Add decorative elements around the border
- Test with sample photos to ensure proper positioning
- Consider different photo orientations (portrait/landscape)