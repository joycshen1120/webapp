const express = require("express");
const multer = require("multer");
const app = express();
const port = 3000;

// Set up storage engine
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), (req, res) => {
  if (req.file) {
    console.log("Received file with size:", req.file.size);
    const imageBuffer = req.file.buffer; // Your image is stored in this variable as a buffer
    res.json({
      message: "Image uploaded successfully",
      size: imageBuffer.length,
    });
  } else {
    console.log("No file uploaded");
    res.status(400).json({ message: "No file uploaded" });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
