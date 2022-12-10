var mongoose = require("mongoose");

var postSchema = new mongoose.Schema({
    title: String,
    images:[String],
    description: String,
});

module.exports = mongoose.model("Post", postSchema);