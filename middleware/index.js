var blockexplorer = require('blockchain.info/blockexplorer')
var middlewareObj = {};
var User = require('../models/user');
var Folder = require('../models/folder');
var Note = require('../models/note');
var Address = require('../models/address');

middlewareObj.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
}

middlewareObj.isValidAddr = function(req, res, next) {
    blockexplorer.getAddress(req.params.addr).then(function(obj) {
        return next();
    }, function(rejection) {
        req.flash('error', 'Please enter a valid address.');
        res.redirect('/folders');
    });
}

middlewareObj.ownsFolder = function(req, res, next) {
    var valid = false;
    User.findById(req.user._id).populate('folders').exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            data.folders.forEach(function(f) {
                if (f._id.equals(req.params.folderid)) {
                    valid = true;
                }
            });
        }
        if (!valid) {
            res.redirect('/folders');
        } else {
            req.folders = data.folders;
            return next();
        }
    });
}

middlewareObj.isFolderAdmin = function(req, res, next) {
    Folder.findById(req.params.folderid).populate('admin').exec(function(err, folder) {
        if (err || !folder || !folder.admin._id.equals(req.user._id)) {
            res.redirect('back');
        } else {
            return next();
        }
    });
}

middlewareObj.canDeleteNote = function(req, res, next) {
    Note.findById(req.params.note_id, function(err, note) {
        if (err) {
            res.redirect('back');
        } else {
            Folder.findById(req.params.folderid, function(err, folder) {
                if (err) {
                    res.redirect('back');
                } else {
                    if (req.user._id.equals(note.author.id) || req.user._id.equals(folder.admin._id)) {
                        next();
                    } else {
                        res.redirect('back');
                    }
                }
            });
        }
    });
}

middlewareObj.canUpdateAddr = function(req, res, next) {
    Folder.findById(req.params.folderid, function(err, folder) {
       if (err) {
           res.redirect('back');
       } else {
           Address.findOne({folder:req.params.folderid, addr:req.params.addr}, function(err, addr) {
               if (err) {
                   res.redirect('back');
               } else if (req.user._id.equals(folder.admin._id) || req.user._id.equals(addr.user._id)) {
                   next();
               } else {
                   res.redirect('back');
               }
           })
       }
    });
}

middlewareObj.canViewFolder = function(req, res, next) {
    Folder.findById(req.params.folderid, function(err, folder) {
        if (err) {
            res.redirect('back');
        } else {
            if (req.user._id.equals(folder.admin)) {
                next();
            } else {
                folder.contributors.forEach(function(contrib) {
                   if (req.user._id.equals(contrib)) {
                       next();
                   } 
                });
                res.redirect('back');
            }
        }
    });
}

module.exports = middlewareObj;