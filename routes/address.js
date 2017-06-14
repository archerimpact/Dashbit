var express = require('express');
var router = express.Router();
var blockexplorer = require('blockchain.info/blockexplorer');
var exchange = require('blockchain.info/exchange');
var _ = require('underscore-node');
var Address = require('../models/address');
var User = require('../models/user');
var Note = require('../models/note');
var middleware = require('../middleware');

router.get('/addresses', middleware.isLoggedIn, function(req, res) {
    var balances = {};
    var addresses = "";
    User.findById(req.user._id).populate('addresses').exec(function(err, data) {
        if (err) {
            console.log(err);
        } else {
            addresses = data.addresses;
            if (addresses.length == 0) {
                doRender();
            }
            var finished = _.after(addresses.length, doRender);
            addresses.forEach(function(address) {
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
            function doRender() {
        	    res.render('index', {data: addresses, balances: balances});
        	}
        }
    });
});

router.get('/addresses/new', middleware.isLoggedIn, function(req, res) {
   res.render('new', {addr: ''}); 
});

router.get('/addresses/new/:addr', middleware.isLoggedIn, function(req, res) {
   res.render('new', {addr: req.params.addr}) 
});

router.post('/addresses/', middleware.isLoggedIn, function(req, res) {
    User.findById(req.user._id, function(err, user) {
       if (err) {
           console.log(err);
           res.redirect('/addresses');
       } else {
           Address.create(req.body.address, function(err, address) {
               if (err) {
                   console.log(err);
               } else {
                   address.user = req.user._id;
                   blockexplorer.getAddress(req.body.address.addr).then(function(btcData) {
                       address.num = btcData.n_tx;
                       address.save();
                       user.addresses.push(address);
                       user.save();
                       res.redirect("/addresses/");
                   });
               }
           }); 
       }
   });
});

router.get('/addresses/:addr', [middleware.isLoggedIn, middleware.isValidAddr], function(req, res) {
    var dbData = "";
    var offset = 0
    if (req.query.offset) {
            offset = Number(req.query.offset)
        }
    User.findById(req.user.id).populate('addresses').exec(function(err, userData) {
        if (err) {
            console.log(err);
            res.redirect('/addresses');
        }
        var labels = {}
        userData.addresses.forEach(function(address) {
            labels[address.addr] = address.label;
        });
        var userAddressFilter = userData.addresses.filter(function(address){ 
            return address.addr === req.params.addr 
        });
        if (userAddressFilter.length > 0) {
            dbData = userAddressFilter[0];
        }
        
        var options = {
            limit: 1000,
            offset: offset
        }
        
        blockexplorer.getAddress(req.params.addr, options).then(function(data) {
            if (dbData != "" && dbData.num != data.n_tx) {
                Address.findOneAndUpdate({user:req.user._id, addr:req.params.addr}, {$set:{num:data.n_tx}}, {new: true}).populate('notes').exec(function(err, updatedAddress) {
                    if(err) {
                        console.log(err);
                        res.redirect('/addresses');
                    }
                    console.log(updatedAddress);
                    res.render('individual', {btcData: data, dbData: updatedAddress, labels: labels, offset: offset});
                });
            } else if (dbData != "") {
                Address.findOne({user:req.user._id, addr: req.params.addr}).populate('notes').exec(function(err, newdata) {
                    if (err) {
                        res.redirect('/addresses');
                    } else {
                        res.render('individual', {btcData: data, dbData: newdata, labels: labels, offset: offset});
                    }
                });
            } else {
                res.render('individual', {btcData: data, dbData: dbData, labels: labels, offset: offset});
            }
        });
    });
});

router.post('/addresses/search', middleware.isLoggedIn, function(req, res) {
    res.redirect('/addresses/' + req.body.searchAddr); 
});

router.delete('/addresses/:addr', middleware.isLoggedIn, function(req, res) {
    Address.findOneAndRemove({user:req.user._id, addr:req.params.addr}, function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect('/addresses');
    })
});

router.post('/addresses/:addr', middleware.isLoggedIn, function(req, res) {
    Address.findOne({user: req.user._id, addr: req.params.addr}, function(err, address) {
        if (err) {
            res.redirect('back');
        } else {
            Note.create(req.body.note, function(err, note) {
               if (err) {
                   res.redirect('back');
               } else {
                   address.notes.push(note);
                   address.save();
                   res.redirect('/addresses/' + req.params.addr);
               }
            });
        }
    });
});

router.delete('/addresses/:addr/:note_id', middleware.isLoggedIn, function(req, res) {
    Note.findByIdAndRemove(req.params.note_id, function(err) {
        if (err) {
            console.log(err);
        }
        res.redirect('/addresses/' + req.params.addr);
    })
});

module.exports = router;