const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const File = require("./schema");
const User = require("./UserSchema");
const azure = require("azure-storage");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use your email provider here (e.g., 'Gmail', 'Outlook', etc.)
  auth: {
    user: "vinayvidhehi@gmail.com", // Your email address
    pass: "dzwh ckyj jfmt qgib ", // Your email password
  },
});

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const accountName = "siddvinay";
const accountKey =
  "9Zct7vAKKhv4bgztNT+b7aU3FpXpEkkkKga9Kuvh9NbrtJXGg3Brzo79DXPlfRDOh47OmwGGOfRq+AStXGNVHw==";

const sharedKeyCredential = new StorageSharedKeyCredential(
  accountName,
  accountKey
);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

const containerName = "uploads"; // Replace with your container name
const containerClient = blobServiceClient.getContainerClient(containerName);

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

mongoose.connect(
  "mongodb+srv://alpha:P9UlObl4ugVQx8JF@cluster0.gbppnze.mongodb.net/3d",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const blobService = azure.createBlobService(accountName, accountKey);

const storage = multer.memoryStorage(); // Use memory storage to store the file in memory

const upload = multer({ storage: storage });

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const useremail = req.body.email;

    // Generate blobName directly based on the current timestamp and the original file name
    const blobName = Date.now() + "-" + req.file.originalname;

    // Upload the file to Azure Blob Storage using a readable stream
    const readableStream = new require("stream").Readable();
    readableStream._read = () => {};
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    blobService.createBlockBlobFromStream(
      containerName,
      blobName,
      readableStream,
      req.file.size,
      async (error, result, response) => {
        if (error) {
          console.error(error);
          res.status(500).json({ message: "Internal server error" });
        } else {
          const fileUrl = blobService.getUrl(containerName, blobName);

          // Save the file information (e.g., useremail, fileUrl) to your MongoDB database
          const uploadfile = new File({
            useremail: useremail,
            filename: blobName,
            path: fileUrl,
          });

          await uploadfile.save(); // Use await to handle the promise

          res.json({ message: "File uploaded successfully" });
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

///////////////////////////////////////////////////////////////////////////////////

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(201)
        .json({ message: "User not found. Please sign up." });
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

/////////////////////////////////////////////////////////////////////////////////////
let verificationCode;

app.post("/api/signup/verification", async (req, res) => {
  try {
    const username = req.body.username;
    const email = req.body.email;

    const finduser = await User.findOne({ username });
    const findusermail = await User.findOne({ email });

    if (finduser || findusermail) {
      if (finduser && finduser.username === username) {
        res.status(201).json({ message: "user exists" });
      } else if (findusermail && findusermail.email === email) {
        res
          .status(201)
          .json({
            message:
              "email is already registered, use a different email or login",
          });
      }
    } else {
      verificationCode = generateVerificationCode();
      const mailOptions = {
        from: "vinayvidhehi@gmail.com",
        to: email, // The user's email address
        subject: "Email Verification Code",
        text: `Your verification code is: ${verificationCode}. We will communicate here further if required, thank you`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email: ", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      console.log(verificationCode);
      res
        .status(200)
        .json({ message: "verification code sent", code: verificationCode });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

///////////////////////////////////////////////////////////////////////////////api/signup/verification

app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const updateUser = new User({
      username,
      email,
      password,
    });

    await updateUser.save();
    res.status(200).json({
      message: "user created successfully. Refresh the page and please login",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/////////////////////////////////////////////////////////////////////////////api/signup/verification

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
