const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const PDF_PATH = path.join(__dirname, '../../Pakistan Penal Code.pdf');
const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'ppc-chunks.json');

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

async function main() {
  console.log('📖 Reading Pakistan Penal Code PDF...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);

  console.log('🔍 Parsing PDF text...');
  const data = await pdfParse(pdfBuffer);

  const fullText = data.text;
  const totalPages = data.numpages;
  console.log(`✅ Extracted ${fullText.length} characters from ${totalPages} pages.`);

  if (fullText.length < 100) {
    throw new Error('❌ Could not extract text. The PDF may be image-based/scanned.');
  }

  console.log('\n✂️  Chunking text...');

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < fullText.length) {
    const end = Math.min(start + CHUNK_SIZE, fullText.length);
    const chunk = fullText.slice(start, end).trim();

    if (chunk.length > 50) {
      chunks.push({
        id: `ppc-chunk-${chunkIndex}`,
        text: chunk,
        page: Math.ceil((start / fullText.length) * totalPages),
        source: 'Pakistan Penal Code'
      });
      chunkIndex++;
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  console.log(`✅ Created ${chunks.length} chunks.`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\n🎉 Done! Saved ${chunks.length} chunks to:\n   ${OUTPUT_PATH}`);
  console.log('\n📊 Summary:');
  console.log(`   Source : Pakistan Penal Code PDF`);
  console.log(`   Pages  : ${totalPages}`);
  console.log(`   Chunks : ${chunks.length}`);
  console.log(`   File   : src/data/ppc-chunks.json`);
}

main().catch(console.error);
