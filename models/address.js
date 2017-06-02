var mongoose = require('mongoose');

var addressSchema = mongoose.Schema({
    addr: String,
    label: String,
    desc: String,
    notes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Note"
        }
    ],
    num: Number,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Address", addressSchema);