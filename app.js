const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require('cors');
const multer = require("multer");
const path = require("path");
const File = require("./schema");
const User = require("./UserSchema")

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

mongoose
  .connect("mongodb+srv://alpha:P9UlObl4ugVQx8JF@cluster0.gbppnze.mongodb.net/3d", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

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

   const uploadfile = new File({
    useremail : req.body.email,
    filename : filename,
    path : req.file.path,
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
      console.log("here??")
      res.status(201).json({message:"user exists"});
    }
  }

  else {
    const updateUser = new User ({
      username,
      email,
      password,
   })
 
   await updateUser.save();
   res.status(200).json({message:"user created successfully. refresh page and please login"})
  }
  }catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port);