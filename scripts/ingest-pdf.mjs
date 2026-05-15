import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamically import pdf-parse (CommonJS module)
const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

const PDF_PATH = join(__dirname, '../../Pakistan Penal Code.pdf');
const OUTPUT_DIR = join(__dirname, '../src/data');
const OUTPUT_PATH = join(OUTPUT_DIR, 'ppc-chunks.json');

const CHUNK_SIZE = 1500;   // characters per chunk
const CHUNK_OVERLAP = 200; // overlap to avoid cutting mid-sentence

console.log('📖 Reading Pakistan Penal Code PDF...');
const pdfBuffer = readFileSync(PDF_PATH);

console.log('🔍 Parsing PDF text...');
const data = await pdfParse(pdfBuffer);

const fullText = data.text;
const totalPages = data.numpages;
console.log(`✅ Extracted ${fullText.length} characters from ${totalPages} pages.`);

// --- Chunking ---
console.log('\n✂️  Chunking text...');

function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  // Split by section headers like "Chapter X" or digits followed by a period
  // to try to create meaningful boundaries
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.slice(start, end).trim();

    if (chunkText.length > 50) { // ignore tiny fragments
      chunks.push({
        id: `ppc-chunk-${chunkIndex}`,
        text: chunkText,
        // Approximate page number
        page: Math.ceil((start / text.length) * totalPages),
        source: 'Pakistan Penal Code'
      });
      chunkIndex++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

const chunks = chunkText(fullText, CHUNK_SIZE, CHUNK_OVERLAP);
console.log(`✅ Created ${chunks.length} chunks.`);

// --- Save Output ---
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const output = {
  metadata: {
    source: 'Pakistan Penal Code',
    totalPages,
    totalChunks: chunks.length,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    processedAt: new Date().toISOString()
  },
  chunks
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log(`\n🎉 Done! Saved ${chunks.length} chunks to:\n   ${OUTPUT_PATH}`);
console.log('\n📊 Summary:');
console.log(`   Source: Pakistan Penal Code PDF`);
console.log(`   Pages:  ${totalPages}`);
console.log(`   Chunks: ${chunks.length}`);
console.log(`   Ready to use in API!`);
