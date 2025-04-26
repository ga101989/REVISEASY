const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const { createWorker } = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const sizeOf = require('image-size');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Store revision sheets in memory (in production, use a database)
const revisionSheets = [];

// Helper function to extract images from PDF
async function extractImagesFromPDF(filePath, outputDir) {
  try {
    const options = {
      density: 300,
      saveFilename: "page",
      savePath: outputDir,
      format: "png",
      width: 1200
    };
    
    const convert = fromPath(filePath, options);
    const pageToConvertAsImage = 1;
    
    const images = [];
    const pdfInfo = await pdfParse(fs.readFileSync(filePath));
    const numPages = pdfInfo.numpages;
    
    for (let i = 1; i <= numPages; i++) {
      const result = await convert(i);
      if (result.size > 0) {
        const imagePath = result.path;
        images.push({
          path: path.relative(path.join(__dirname, 'uploads'), imagePath),
          page: i
        });
      }
    }
    
    return images;
  } catch (error) {
    console.error('Error extracting images from PDF:', error);
    return [];
  }
}

// Helper function to extract text from images
async function extractTextFromImage(imagePath) {
  try {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return '';
  }
}

// Helper function to analyze document structure
function analyzeDocumentStructure(text) {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { title: '', content: [], type: 'text' };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if line looks like a heading
    if (line.length < 100 && (line.toUpperCase() === line || /^[0-9]+[.)]\s/.test(line))) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: line, content: [], type: 'text' };
    } else {
      // Check if line contains common diagram indicators
      if (line.toLowerCase().includes('figure') || 
          line.toLowerCase().includes('diagram') ||
          line.toLowerCase().includes('illustration')) {
        currentSection.type = 'diagram';
      }
      
      // Check if line contains example indicators
      if (line.toLowerCase().includes('example') ||
          line.toLowerCase().includes('e.g.') ||
          /^[0-9]+[.)]\s.*/.test(line)) {
        currentSection.type = 'example';
      }
      
      currentSection.content.push(line);
    }
  }
  
  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Helper function to generate enhanced summary
function generateEnhancedSummary(text, images = [], extractedImageText = '') {
  try {
    const tokenizer = new natural.SentenceTokenizer();
    const sections = analyzeDocumentStructure(text + '\n' + extractedImageText);
    
    let summary = {
      mainPoints: [],
      examples: [],
      diagrams: [],
      imageContent: []
    };
    
    // Process each section
    sections.forEach(section => {
      const sectionText = section.content.join(' ');
      const sentences = tokenizer.tokenize(sectionText);
      
      if (section.type === 'example') {
        summary.examples.push({
          title: section.title,
          content: sectionText
        });
      } else if (section.type === 'diagram') {
        summary.diagrams.push({
          title: section.title,
          content: sectionText
        });
      } else {
        // Score sentences for main points
        const scores = sentences.map((sentence, index) => {
          const words = sentence.split(' ').length;
          const positionScore = 1 - (index / sentences.length);
          const lengthScore = Math.min(words / 20, 1);
          const keywordScore = (sentence.toLowerCase().includes('important') ||
                              sentence.toLowerCase().includes('key') ||
                              sentence.toLowerCase().includes('main')) ? 0.5 : 0;
          return { sentence, score: positionScore * 0.4 + lengthScore * 0.3 + keywordScore };
        });
        
        // Get top sentences
        const topSentences = scores
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(item => item.sentence);
        
        summary.mainPoints.push(...topSentences);
      }
    });
    
    // Process image content
    if (images.length > 0) {
      summary.imageContent = images.map(img => ({
        path: img.path,
        page: img.page,
        description: `Image found on page ${img.page}`
      }));
    }
    
    return summary;
  } catch (error) {
    console.error('Error generating enhanced summary:', error);
    return {
      mainPoints: [text.slice(0, 500) + '...'],
      examples: [],
      diagrams: [],
      imageContent: []
    };
  }
}

// Create folders to organize revision sheets
app.post('/api/folders', (req, res) => {
  const { name } = req.body;
  const folderPath = path.join(__dirname, 'uploads', name);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    res.json({ message: 'Folder created successfully' });
  } else {
    res.status(400).json({ error: 'Folder already exists' });
  }
});

// Get all folders
app.get('/api/folders', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  
  const folders = fs.readdirSync(uploadsPath)
    .filter(item => fs.statSync(path.join(uploadsPath, item)).isDirectory());
  res.json(folders);
});

// Upload and process file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { folderId } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let content = '';
    let images = [];
    let extractedImageText = '';
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const outputDir = path.join(__dirname, 'uploads', folderId);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Extract content and images based on file type
    if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      content = data.text;
      images = await extractImagesFromPDF(file.path, outputDir);
      
      // Extract text from images
      for (const image of images) {
        const imageText = await extractTextFromImage(path.join(__dirname, 'uploads', image.path));
        if (imageText) {
          extractedImageText += '\n' + imageText;
        }
      }
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: file.path });
      content = result.value;
      
      // Extract images from DOCX (if available)
      const docxImages = await mammoth.images({ path: file.path });
      let imageIndex = 0;
      await docxImages.toArray().then(images => {
        images.forEach(image => {
          const imagePath = path.join(outputDir, `image-${++imageIndex}${image.extension}`);
          fs.writeFileSync(imagePath, image.buffer);
          images.push({
            path: path.relative(path.join(__dirname, 'uploads'), imagePath),
            page: 1
          });
        });
      });
    } else if (fileExtension === '.txt') {
      content = fs.readFileSync(file.path, 'utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Generate enhanced summary
    const summary = generateEnhancedSummary(content, images, extractedImageText);

    // Generate revision sheet
    const revisionSheet = {
      id: Date.now().toString(),
      title: file.originalname,
      content,
      summary,
      images: images.map(img => ({
        url: `/uploads/${img.path}`,
        page: img.page
      })),
      folderId,
      createdAt: new Date(),
      originalFile: file.filename
    };

    revisionSheets.push(revisionSheet);
    res.json(revisionSheet);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

// Get revision sheets by folder
app.get('/api/revision-sheets/:folderId', (req, res) => {
  const { folderId } = req.params;
  const folderSheets = revisionSheets.filter(sheet => sheet.folderId === folderId);
  res.json(folderSheets);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 