var mongoose = require('mongoose');

var folderSchema = mongoose.Schema({
    name: String,
    desc: String,
    addresses: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Address"
        }
    ],
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    contributors: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

module.exports = mongoose.model("Folder", folderSchema);