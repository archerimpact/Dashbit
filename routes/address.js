var express = require('express');
var router = express.Router();
var blockexplorer = require('blockchain.info/blockexplorer');
var exchange = require('blockchain.info/exchange');
var _ = require('underscore-node');
var Address = require('../models/address');
var User = require('../models/user');
var Note = require('../models/note');
var Folder = require('../models/folder');
var middleware = require('../middleware');

//GET /folders/:folderid/addresses/:addr
//GET /folders/:folderid/addresses/new
//POST /folders/:folderid/addresses
//GET /folders/:folderid/addresses/:addr/edit
//PUT /folders/:folderid/addresses/:addr
//DELETE /folders/:folderid/addresses/:addr
//POST /folders/:folderid/addresses/:addr/notes
//DELETE /folders/:folderid/addresses/:addr/notes/:noteid
//POST /folders/:folderid/addresses/search


//Shows add page to add an address to folder (folderid folder is default).
router.get('/folders/:folderid/addresses/new', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    var addr = '';
    if (req.query.addr) {
        addr = req.query.addr;
    }
    User.findById(req.user._id).populate('folders').exec(function(err, user) {
        if (err) {
            console.log(err);
        }
        res.render('addresses/new', {addr: addr, currentID: req.params.folderid, folders: user.folders});
    });
});

//Shows individual address page. Includes labels from the current folder.
router.get('/folders/:folderid/addresses/:addr', [middleware.isLoggedIn, middleware.ownsFolder, middleware.isValidAddr], function(req, res) {
    var note = 0;
    if (req.query.note == 'show') {
        note = 1;
    }
    var dbData = "";
    var offset = 0
    if (req.query.offset) {
        offset = Number(req.query.offset)
    }
    Folder.findById(req.params.folderid).populate('addresses').exec(function(err, folderData) {
        if (err) {
            console.log(err);
            res.redirect('/addresses');
        }
        var labels = {}
        
        folderData.addresses.forEach(function(address) {
            labels[address.addr] = address.label;
        });
        var userAddressFilter = folderData.addresses.filter(function(address) { 
            return address.addr === req.params.addr 
        });
        var temp = "";
        if (userAddressFilter.length > 0) {
            temp = userAddressFilter[0];
        }
        Address.findById(temp._id).populate("notes").exec(function(err, d) {
            if (err) {
                console.log(err);
            }
            if (d) {
                dbData = d;
            }
            var options = {
                limit: 1000,
                offset: offset
            }
            blockexplorer.getAddress(req.params.addr, options).then(function(data) {
                if (dbData != "") {
                    var elem = {
                        addr: req.params.addr,
                        num: data.n_tx
                    };
                    User.findById(req.user._id, function(err, user) {
                        if (err) {
                            res.redirect('back');
                        }
                        var b = false;
                        user.views.forEach(function(view) {
                          if (view.addr == req.params.addr) {
                              view.num = data.n_tx;
                              b = true;
                          }
                        });
                        if (!b) {
                            user.views.push(elem);
                        }
                        user.save();
                        res.render('addresses/individual', {btcData: data, dbData: dbData, labels: labels, offset: offset, currentFolder: folderData, note: note});
                    });
                } else {
                    res.render('addresses/individual', {btcData: data, dbData: dbData, labels: labels, offset: offset, currentFolder: folderData, note: note});
                }
            });
        });
    });
});

//Adds address to intended folder and general folder for user.
router.post('/folders/:folderid/addresses', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    User.findById(req.user._id).populate('folders').exec(function(err, user) {
      if (err) {
          console.log(err);
          res.redirect('back');
      } else {
          blockexplorer.getAddress(req.body.address.addr).then(function(obj) {
             var generalFolder = '';
              var specifiedFolder = '';
              user.folders.forEach(function(f) {
                  if (f.name == 'General') {
                      generalFolder = f;
                      if (f._id.equals(req.params.folderid)) {
                          specifiedFolder = f;
                      }
                  } else if (f._id.equals(req.params.folderid)) {
                      specifiedFolder = f;
                  }
              });
              Address.create(req.body.address, function(err, address) {
                  if (err) {
                      console.log(err);
                  } else {
                      address.user = req.user._id;
                      blockexplorer.getAddress(req.body.address.addr).then(function(btcData) {
                          address.folder = specifiedFolder;
                          user.views.push({
                              addr: req.body.address.addr,
                              num: btcData.n_tx
                          });
                          address.num = btcData.n_tx;
                          address.save();
                          user.save();
                          specifiedFolder.addresses.push(address._id);
                          specifiedFolder.save();
                          if (specifiedFolder != generalFolder) {
                              generalFolder.addresses.push(address);
                              generalFolder.save();
                          }
                          req.flash("success", "Address " + address.label + " added to folder " + specifiedFolder.name);
                          res.redirect("/folders/" + specifiedFolder._id);
                      });
                  }
              });
          }, function(rejection) {
              req.flash('error', 'Please enter a valid address.');
              res.redirect('back');
          });
      }
  });
});

//Shows form to edit address information.
router.get('/folders/:folderid/addresses/:addr/edit', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
   Address.findOne({addr: req.params.addr}, function(err, address) {
       if (err) {
           console.log(address);
       }
       if (address) {
           res.render('addresses/edit', {addrData: address, currentID: req.params.folderid});
       } else {
           res.redirect('back');
       }
   }) 
});

//Updates address information.
router.put('/folders/:folderid/addresses/:addr', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    Address.findOne({addr: req.params.addr}, function(err, address) {
        if (err) {
            res.redirect('back');
        }
        address.label = req.body.address.label;
        address.desc = req.body.address.desc;
        address.save();
        req.flash("success", "Address " + address.label + " updated!");
        res.redirect('/folders/' + req.params.folderid + '/addresses/' + req.params.addr);
    });
})

//Deletes address from the folder.
router.delete('/folders/:folderid/addresses/:addr', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    var notes = '';
    var addrLabel = '';
    Address.findOne({folder:req.params.folderid, addr:req.params.addr}).populate('notes').exec(function(err, addr) {
        addrLabel = addr.label;
        if (err) {
            console.log(err);
        } else {
            notes = addr.notes;
            console.log(notes);
            if (notes.length > 0) {
                removeNotes();
            } else {
                Address.findOneAndRemove({folder:req.params.folderid, addr:req.params.addr}, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    req.flash("error", "Address " + addrLabel + " removed from folder.");
                    res.redirect('back');
                });
            }
        }
    });
    function removeNotes() {
        var note = notes.pop();
        Note.findByIdAndRemove(note._id, function(err) {
           if (err) {
               console.log(err);
           } else {
               if (notes.length > 0) {
                   removeNotes();
               } else {
                   Address.findOneAndRemove({folder:req.params.folderid, addr:req.params.addr}, function(err) {
                        if (err) {
                            console.log(err);
                        }
                        req.flash("error", "Address " + addrLabel + " removed from folder.");
                        res.redirect('back');
                    });
               }
           }
        });
    }
});

//Adds note to address
router.post('/folders/:folderid/addresses/:addr/notes', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    Folder.findById(req.params.folderid, function(err, folder) {
        if (err) {
            console.log(err);
        }
        Address.findOne({folder: folder._id, addr: req.params.addr}, function(err, address) {
            if (err) {
                res.redirect('back');
            } else {
                var note = req.body.note;
                note.author = {
                    id: req.user._id,
                    username: req.user.username
                }
                Note.create(note, function(err, createdNote) {
                   if (err) {
                       res.redirect('back');
                   } else {
                       address.notes.push(createdNote);
                       address.save();
                       req.flash("success", "Note added to address " + address.label + '.');
                       res.redirect('/folders/' + req.params.folderid + '/addresses/' + req.params.addr + '?note=show');
                   }
                });
            }
        });
    });
});

//Deletes note from address. Only author of note can do this.
router.delete('/folders/:folderid/addresses/:addr/:note_id', [middleware.isLoggedIn, middleware.ownsFolder, middleware.canDeleteNote], function(req, res) {
    Note.findByIdAndRemove(req.params.note_id, function(err) {
        if (err) {
            console.log(err);
        }
        req.flash("error", "Note removed.");
        res.redirect('/folders/' + req.params.folderid + '/addresses/' + req.params.addr + '?note=show');
    })
});

//Search bar request. Redirects to address page.
router.post('/folders/:folderid/addresses/search', [middleware.isLoggedIn, middleware.ownsFolder], function(req, res) {
    res.redirect('/folders/' + req.params.folderid + /addresses/ + req.body.searchAddr); 
});

module.exports = router;