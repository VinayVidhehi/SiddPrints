const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require('cors');
const multer = require("multer");
const path = require("path");
const File = require("./schema");
const User = require("./UserSchema");
const fs = require("fs"); // Added this line to use 'fs'

const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");

const accountName = "siddvinay";
const accountKey = "9Zct7vAKKhv4bgztNT+b7aU3FpXpEkkkKga9Kuvh9NbrtJXGg3Brzo79DXPlfRDOh47OmwGGOfRq+AStXGNVHw==";

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

const containerName = "uploads"; // Replace with your container name
const containerClient = blobServiceClient.getContainerClient(containerName);

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

mongoose
  .connect("mongodb+srv://alpha:P9UlObl4ugVQx8JF@cluster0.gbppnze.mongodb.net/3d", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

let filename;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    filename = Date.now() + '-' + file.originalname;
    cb(null, filename); // Define how the uploaded files should be named
  },
});

const upload = multer({ storage: storage });

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log(req.body.email);
    const useremail = req.body.email;
    const localFilePath = req.file.path;

    // Use the Azure Storage SDK to upload the file to Azure Blob Storage
    const blobName = Date.now() + "-" + req.file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(localFilePath);

    console.log(localFilePath);

    // Clean up the local file after uploading to Azure
    fs.unlinkSync(localFilePath);

    const fileUrl = blockBlobClient.url;
    
    // Save the file information (e.g., useremail, fileUrl) to your MongoDB database
    const uploadfile = new File({
      useremail: useremail,
      filename: blobName,
      path: fileUrl,
    });

    await uploadfile.save();
    res.json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(201).json({ message: "User not found. Please sign up." });
    }

    if (user.password === password) {
      return res.status(200).json({ message: "Login successful", user });
    } else {
      return res.status(202).json({ message: "Incorrect password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { username, email ,password } = req.body;

  const finduser = await User.findOne({ username });

  if(finduser){
    if(finduser.username === username) {
      console.log("here??");
      res.status(201).json({message:"user exists"});
    }
  } else {
    const updateUser = new User({
      username,
      email,
      password,
    });
 
    await updateUser.save();
    res.status(200).json({message:"user created successfully. Refresh the page and please login"});
  }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
