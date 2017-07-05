var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var User = require('../models/user');
var Folder = require('../models/folder');
var Address = require('../models/address');
var blockexplorer = require('blockchain.info/blockexplorer');
var exchange = require('blockchain.info/exchange');
var _ = require('underscore-node');
var Note = require('../models/note');


//GET /folders/
//GET /folders/:folderid
//GET /folders/new
//POST /folders/
//GET /folders/:folderid/edit
//PUT /folders/:folderid
//DELETE /folders/:folderid
//GET /folders/:folderid/contributors/new
//POST /folders/:folderid/contributors


//Shows default folder page.
router.get('/folders', middleware.isLoggedIn, function(req, res) {
    if (res.locals.success.length > 0) {
        req.flash("success", res.locals.success[0]);
    }
    if (res.locals.error.length > 0) {
        req.flash("error", res.locals.error[0]);
    }
    var folderID = '';
    User.findById(req.user._id).populate('folders lastOpen').exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data.lastOpen) {
                folderID = data.lastOpen._id;
            } else {
                data.folders.forEach(function(f) {
                    if (f.name === 'General') {
                        folderID = f._id;
                    }
                });
            }
            res.redirect('/folders/' + folderID);
        }
    });
});

//Shows form to add new folder.
router.get('/folders/new', middleware.isLoggedIn, function(req, res) {
    res.render('folders/new');
});


// Shows folder page of specific folder. If folder ID isn't valid, goes to default (/folders).
router.get('/folders/:folderid', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    var balances = {};
    var addresses = "";
    var folders = "";
    var addedBy = "";
    var folderID = req.params.folderid;
    var viewData = {};
    req.user.views.forEach(function(view) {
        viewData[view.addr] = view.num;
    });
    User.findById(req.user._id, function(err, user) {
        if (err) {
            console.log(err);
        }
        Folder.findById(folderID).populate('addresses admin contributors').exec(function(err, folderData) {
            if (err) {
                console.log(err);
            }
            if (folderData) {
                user.lastOpen = folderData._id;
                user.save();
                addresses = [];
                folders = req.folders;
                if (folderData.addresses.length == 0) {
                    doRender();
                }
                var finished = _.after(folderData.addresses.length, doRender);
                folderData.addresses.forEach(function(address) {
                    Address.findById(address._id).populate('folder user').exec(function(err, addr) {
                        addresses.push(addr);
                        blockexplorer.getAddress(address.addr).then(function(obj) {
                            var b = (obj.final_balance / 100000000);
                            var n = obj.n_tx;
                            exchange.fromBTC(obj.final_balance, "USD").then(function(dollars) {
                                balances[obj.address] = {
                                    btc: b,
                                    usd: dollars,
                                    ntx: n
                                };
                                finished();
                            });
                        });
                    });
                });
            } else {
                res.redirect('/folders');
            }
            function doRender() {
                res.render('folders/index', {data: addresses, balances: balances, folders: folders, currentFolder: folderData, viewData: viewData});
            }
        });
    });
});


//Create new folder - current user is admin.
router.post('/folders', middleware.isLoggedIn, function(req, res) {
    User.findById(req.user._id, function(err, user) {
       if (err) {
           console.log(err);
           res.redirect('/folders');
       } else {
           Folder.create(req.body.folder, function(err, folder) {
               if (err) {
                   console.log(err);
               } else {
                    folder.admin = req.user._id;
                    folder.addresses = [];
                    folder.save();
                    user.folders.push(folder);
                    user.save();
                    req.flash("success", "Created folder: " + folder.name);
                    res.redirect("/folders/" + folder._id);
               }
           }); 
       }
   });
});

//Shows form to edit folder information.
router.get('/folders/:folderid/edit', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
    Folder.findById(req.params.folderid, function(err, folderData) {
        if (err) {
            console.log(err);
        } else {
            res.render('folders/edit', {folderData: folderData});
        }
    })
});

//Edit folder information.
router.put('/folders/:folderid', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
    Folder.findById(req.params.folderid, function(err, folder) {
        if (err) {
            req.flash("error", "Error updating comment.");
            res.redirect("back");
        } else {
            folder.name = req.body.folder.name;
            folder.desc = req.body.folder.desc;
            folder.save();
            req.flash("success", "Folder " + folder.name + " updated!");
            res.redirect('/folders/' + req.params.folderid);
        }
    })
});

//Shows form to add contributors to a folder. Only admin can access.
router.get('/folders/:folderid/contributors/new', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
    Folder.findById(req.params.folderid, function(err, folderData) {
        if (err) {
            console.log(err);
        }
        res.render('folders/contributors', {folder: folderData});
    })
   
});

//Adds contributor to folder. Only admin can do.
router.post('/folders/:folderid/contributors', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
   User.findOne({'username':req.body.email}, function(err, user){
       if (err) {
           console.log(err);
       }
       if (user) {
           Folder.findById(req.params.folderid).populate('addresses').exec(function(err, folder) {
               if (err) {
                   console.log(err);
               }
               user.folders.push(folder);
               user.save();
               folder.contributors.push(user);
               folder.save();
               req.flash('success', "Contributor added: " + req.body.email);
               res.redirect('/folders/' + req.params.folderid);
           });
       } else {
           req.flash('error', 'User not found.');
           res.redirect('back');
       }
   });
});

router.delete('/folders/:folderid/contributors/:contribID', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
    User.findById(req.params.contribID, function(err, user) {
        if (err) {
            console.log(err);
        }
        Folder.findById(req.params.folderid).populate('addresses').exec(function(err, folder) {
            if (err) {
                console.log(err);
            }
            var index = user.folders.indexOf(folder._id);
            if (index > -1) {
                user.folders.splice(index, 1);
            }
            user.lastOpen = null;
            user.save();
            index = folder.contributors.indexOf(user._id);
            if (index > -1) {
                folder.contributors.splice(index, 1);
            }
            folder.save();
            req.flash("error", "Contributor removed: " + user.username);
            res.redirect("back");
        });
    });
})

//Deletes folder. Only admin can do.
router.delete('/folders/:folderid', [middleware.isLoggedIn, middleware.isFolderAdmin], function(req, res) {
    var addresses = '';
    var notes = '';
    var addrToDelete = '';
    Folder.findById(req.params.folderid).populate('addresses').exec(function(err, folder) {
        if (err) {
            console.log(err);
        } else {
            addresses = folder.addresses;
            removeAddresses();
        }
    });
    
    function removeAddresses() {
        if (addresses.length > 0) {
            addrToDelete = addresses.pop();
            Address.findById(addrToDelete._id).populate('notes').exec(function(err, address) {
                if (err) {
                    console.log(err);
                }
                notes = address.notes;
                if (notes.length > 0) {
                    removeNotes();
                } else {
                    Address.findByIdAndRemove(addrToDelete._id, function(err, address) {
                        removeAddresses();
                    });
                }
            });
        } else {
            Folder.findByIdAndRemove(req.params.folderid, function(err) {
                if (err) {
                    console.log(err);
                }
                req.flash("error", "Folder removed!");
                res.redirect('/folders');
            });
        }
    }
    
    function removeNotes() {
        var note = notes.pop();
        Note.findByIdAndRemove(note._id, function(err) {
           if (err) {
               console.log(err);
           } else {
               if (notes.length > 0) {
                   removeNotes();
               } else {
                   Address.findByIdAndRemove(addrToDelete._id, function(err) {
                        if (err) {
                            console.log(err);
                        }
                        removeAddresses();
                    });
               }
           }
        });
    }
})

module.exports = router;