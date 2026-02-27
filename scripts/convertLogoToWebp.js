const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertLogo() {
    try {
        const inputPath = path.join(__dirname, '../src/assets/logo.png');
        const outputPath = path.join(__dirname, '../public/logo.webp');

        await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath);

        console.log('Successfully converted logo.png to logo.webp');
    } catch (err) {
        console.error('Error converting logo:', err);
    }
}

convertLogo();
