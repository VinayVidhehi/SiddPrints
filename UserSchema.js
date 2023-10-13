const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true, // Ensures that usernames are unique
    required: true, // Requires a username to be provided
  },
  email: {
    type: String,
    unique: true, // Ensures that email addresses are unique
    required: true, // Requires an email address to be provided
  },
  password: {
    type: String,
    required: true, // Requires a password to be provided
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
