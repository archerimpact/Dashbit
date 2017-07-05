var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var Address = require('./address');

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    addresses: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Address"
        }
    ],
    folders: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder"
        }
    ],
    views: [
        {
            addr: String,
            num: Number
        }    
    ],
    lastOpen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder"
    }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);