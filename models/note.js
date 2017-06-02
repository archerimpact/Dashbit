var mongoose = require('mongoose');

var noteSchema = mongoose.Schema({
    text: String,
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Note", noteSchema);