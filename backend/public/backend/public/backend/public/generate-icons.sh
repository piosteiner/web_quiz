#!/bin/bash

# PWA Icon Generator for QuizMaster
# Creates all required PWA icons from a base SVG or PNG

echo "🎨 Generating PWA icons for QuizMaster..."

# Create icon directory if it doesn't exist
mkdir -p css/icons

# Define icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

# Check if ImageMagick is available
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing..."
    
    # Try to install ImageMagick
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    elif command -v yum &> /dev/null; then
        sudo yum install -y ImageMagick
    elif command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "❌ Could not install ImageMagick automatically."
        echo "Please install ImageMagick manually and run this script again."
        exit 1
    fi
fi

# Create base icon if it doesn't exist
if [ ! -f "css/icons/base-icon.png" ]; then
    echo "🔧 Creating base QuizMaster icon..."
    
    # Use ImageMagick to create a base icon
    CONVERT_CMD="convert"
    if command -v magick &> /dev/null; then
        CONVERT_CMD="magick"
    fi
    
    # Create a modern, colorful quiz icon
    $CONVERT_CMD -size 512x512 xc:none \
        -fill "#6c5ce7" \
        -draw "roundrectangle 50,50 462,462 80,80" \
        -fill "white" \
        -font "Arial-Bold" -pointsize 200 \
        -gravity center \
        -annotate +0-20 "🧠" \
        -font "Arial-Bold" -pointsize 60 \
        -annotate +0+100 "Quiz" \
        css/icons/base-icon.png
    
    echo "✅ Base icon created: css/icons/base-icon.png"
fi

# Generate all PWA icon sizes
echo "🔄 Generating PWA icons..."

for size in "${SIZES[@]}"; do
    OUTPUT_FILE="css/icons/icon-${size}x${size}.png"
    
    if command -v magick &> /dev/null; then
        magick css/icons/base-icon.png -resize ${size}x${size} "$OUTPUT_FILE"
    else
        convert css/icons/base-icon.png -resize ${size}x${size} "$OUTPUT_FILE"
    fi
    
    echo "  ✅ Generated: $OUTPUT_FILE"
done

# Create favicon
echo "🔄 Creating favicon..."
if command -v magick &> /dev/null; then
    magick css/icons/base-icon.png -resize 32x32 favicon.ico
else
    convert css/icons/base-icon.png -resize 32x32 favicon.ico
fi
echo "  ✅ Generated: favicon.ico"

# Create Apple touch icon
echo "🔄 Creating Apple touch icon..."
if command -v magick &> /dev/null; then
    magick css/icons/base-icon.png -resize 180x180 css/icons/apple-touch-icon.png
else
    convert css/icons/base-icon.png -resize 180x180 css/icons/apple-touch-icon.png
fi
echo "  ✅ Generated: css/icons/apple-touch-icon.png"

echo ""
echo "🎉 PWA Icon generation complete!"
echo ""
echo "Generated files:"
echo "  📁 css/icons/ - All PWA icons (72x72 to 512x512)"
echo "  🌐 favicon.ico - Website favicon"
echo "  🍎 css/icons/apple-touch-icon.png - iOS touch icon"
echo ""
echo "📱 Your QuizMaster app is now ready for PWA installation!"
echo "   Users can install it as a native app on their devices."
echo ""

# Optional: Display file sizes
echo "📊 Icon file sizes:"
for size in "${SIZES[@]}"; do
    FILE="css/icons/icon-${size}x${size}.png"
    if [ -f "$FILE" ]; then
        SIZE_KB=$(du -k "$FILE" | cut -f1)
        echo "  🖼️  ${size}x${size}: ${SIZE_KB}KB"
    fi
done

echo ""
echo "🚀 To test PWA functionality:"
echo "  1. Open your app in Chrome/Edge"
echo "  2. Look for 'Install app' button in address bar"
echo "  3. Install and test offline functionality"
echo ""
