const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises; // Use promises for better async handling

const app = express();
const PORT = 3000;

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

// Serve a simple form to upload files
app.get('/', (req, res) => {
  res.send(`
    <h1>Upload Audio File for Separation</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="audioFile" accept="audio/*" required>
      <button type="submit">Upload and Process</button>
    </form>
  `);
});

// Handle file upload and processing
app.post('/upload', upload.single('audioFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Extract the original extension from the uploaded file
  const fileExtension = path.extname(req.file.originalname);
  const inputFilePath = path.join(req.file.path); // Original uploaded file path

  // Rename the file to include the correct extension
  const newInputFilePath = inputFilePath + fileExtension; // Append the extension
  try {
    await fs.rename(inputFilePath, newInputFilePath); // Use async rename
  } catch (error) {
    console.error('Error renaming file:', error);
    return res.status(500).send('Error renaming uploaded file.');
  }

  const outputDir = path.join('output', req.file.filename);
  try {
    await fs.mkdir(outputDir, { recursive: true }); // Ensure output directory exists
  } catch (error) {
    console.error('Error creating output directory:', error);
    return res.status(500).send('Error creating output directory.');
  }

  // Log the file path to verify it
  console.log("Input file path:", newInputFilePath);
  
  // Print the command to verify the file path and command
  const command = `spleeter separate -i "${newInputFilePath}" -p spleeter:2stems -o "${outputDir}"`;
  console.log("Running command:", command); // Log the command

  // Run Spleeter (using the corrected file path)
  exec(command, async (err) => {
    if (err) {
      console.error('Error running Spleeter:', err);
      return res.status(500).send('Error processing audio file.');
    }

    // Prepare download links for the separated files
    const vocalFilePath = path.join(outputDir, 'vocals', 'vocals.wav');
    const instrumentalFilePath = path.join(outputDir, 'accompaniment', 'accompaniment.wav');

    // Check if the processed files exist
    const filesToSend = [];
    if (await fs.access(vocalFilePath).then(() => true).catch(() => false)) {
      filesToSend.push({ path: vocalFilePath, name: 'vocals.wav' });
    }
    if (await fs.access(instrumentalFilePath).then(() => true).catch(() => false)) {
      filesToSend.push({ path: instrumentalFilePath, name: 'accompaniment.wav' });
    }

    if (filesToSend.length > 0) {
      // Send the files back to the user
      res.send(`
        <h1>Download Processed Files</h1>
        ${filesToSend.map(file => `<a href="/download/${encodeURIComponent(file.name)}" target="_blank">${file.name}</a>`).join('<br/>')}
      `);
    } else {
      return res.status(500).send('Processed files not found.');
    }
  });
});

// Serve downloaded files
app.get('/download/:filename', (req, res) => {
  const filePath = path.join('output', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error('Error sending the file:', err);
      return res.status(500).send('Error sending the file.');
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
