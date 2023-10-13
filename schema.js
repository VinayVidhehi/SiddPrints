const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    useremail:String,
    filename: String,
    path: String,
    // Add more fields as needed (e.g., user, date, description)
  },{collection:"File"});
  
const File = mongoose.model('File', fileSchema);
  
module.exports = File;
