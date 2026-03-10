import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.resolve(__dirname, '../attached_assets');
const OUTPUT_DIR = path.resolve(__dirname, '../attached_assets/optimized');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function optimizeImages() {
    const files = fs.readdirSync(ASSETS_DIR);

    for (const file of files) {
        if (file.match(/\.(png|jpg|jpeg)$/i)) {
            const inputPath = path.join(ASSETS_DIR, file);
            const outputFileName = `${path.parse(file).name}.webp`;
            const outputPath = path.join(OUTPUT_DIR, outputFileName);

            console.log(`Optimizing ${file}...`);

            try {
                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPath);

                const oldSize = fs.statSync(inputPath).size / 1024 / 1024;
                const newSize = fs.statSync(outputPath).size / 1024 / 1024;

                console.log(`✓ ${file} optimized: ${oldSize.toFixed(2)}MB -> ${newSize.toFixed(2)}MB`);
            } catch (err) {
                console.error(`✗ Failed to optimize ${file}:`, err);
            }
        }
    }
}

optimizeImages();
