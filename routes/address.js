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
        blockexplorer.getAddress(req.params.addr).then(function(data) {
            if (dbData != "" && dbData.num != data.n_tx) {
                Address.findOneAndUpdate({user:req.user._id, addr:req.params.addr}, {$set:{num:data.n_tx}}, {new: true}).populate('notes').exec(function(err, updatedAddress) {
                    if(err) {
                        console.log(err);
                        res.redirect('/addresses');
                    }
                    console.log(updatedAddress);
                    res.render('individual', {btcData: data, dbData: updatedAddress, labels: labels});
                });
            } else if (dbData != "") {
                Address.findOne({user:req.user._id, addr: req.params.addr}).populate('notes').exec(function(err, newdata) {
                    if (err) {
                        res.redirect('/addresses');
                    } else {
                        res.render('individual', {btcData: data, dbData: newdata, labels: labels});
                    }
                });
            } else {
                res.render('individual', {btcData: data, dbData: dbData, labels: labels});
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

router.get('/addresses/:addr/report/:tx_id', middleware.isLoggedIn, function(req, res) {
    blockexplorer.getTx(req.params.tx_id).then(function(data) {
        res.render('txreport', {data: data, path: '', rootAddr: req.params.addr});
    });
});

// router.get('/addresses/:addr/report/:tx_id/in/:num', middleware.isLoggedIn, function(req, res) {
//     var tx_index = req.params.tx_id;
//     var rootAddr = req.params.addr;
//     var num = req.params.num;
//     var importantInputs = [];
//     var minInputDepth = 10000000000;
//     var inBool = true;
//     var btcData = "";
    
//     blockexplorer.getTx(tx_index).then(function(data) {
//         btcData = data;
//         var path = [];
//         var amt = 0;
//         for (var k = 0; k < data.out.length; k++) {
//             if (data.out[k].addr == rootAddr) {
//                 amt = data.out[k].value;
//             }
//         }
//         var obj = {
//             addr: rootAddr,
//             date: new Date(data.time * 1000),
//             amt: amt
//         }
//         path.push(obj);
//         searchBack(data.inputs[num].prev_out.addr, 1, path);
//     });
    
//     function searchBack(address, num, path) {
//         var endPoints = [];
//         blockexplorer.getAddress(address).then(function(data) {
//             console.log(data);
//             if (data.n_tx < 3 && inBool) {
//                 data.txs[1].inputs.forEach(function(input) {
//                     var p = path;
//                     var amt = 0;
//                     for (var k = 0; k < data.txs[1].out.length; k++) {
//                         if (data.txs[1].out[k].addr == address) {
//                             amt = data.txs[1].out[k].value;
//                         }
//                     }
//                     var obj = {
//                         addr: address,
//                         date: new Date(data.txs[1].time * 1000),
//                         amt: amt
//                     }
//                     if (p.indexOf(obj) == -1) {
//                         p.push(obj);
//                         searchBack(input.prev_out.addr, num + 1, p);
//                     }
//                 });
//             } else if (importantInputs.indexOf(address) == -1 && num <= minInputDepth && address != rootAddr) {
//                 importantInputs.push(address);
//                 minInputDepth = num;
//                 inBool = false;
//                 var p = path;
//                 var obj = {
//                     addr: address,
//                 }
//                 path.push(obj);
//                 res.render('txreport', {data: btcData, path: p, rootAddr: rootAddr});
//             }
//         });
//     }
// });

// router.get('/addresses/:addr/report/:tx_id/out/:num', function(req, res) {
//     var tx_index = req.params.tx_id;
//     var rootAddr = req.params.addr;
//     var num = req.params.num;
//     var importantOutputs = [];
//     var minOutputDepth = 10000000000;
//     var outBool = true;
//     var btcData = "";
    
//     blockexplorer.getTx(tx_index).then(function(data) {
//         btcData = data;
//         var path = [];
//         var amt = data.out[num].value;
//         var obj = {
//             addr: data.out[num].addr,
//             date: new Date(data.time * 1000),
//             amt: amt
//         }
//         path.push(obj);
//         searchForward(data.out[num].addr, 1, path);
//     });
    
//     function searchForward(address, num, path) {
//         console.log(address);
//         console.log(num);
//         var endPoints = [];
//         blockexplorer.getAddress(address).then(function(data) {
//             if (data.n_tx < 3 && outBool) {
//                 data.txs[0].out.forEach(function(output) {
//                     var p = path;
//                     var amt = 0;
//                     for (var k = 0; k < data.txs[0].inputs.length; k++) {
//                         if (data.txs[0].inputs[k].prev_out.addr == address) {
//                             amt = data.txs[0].inputs[k].prev_out.value;
//                         }
//                     }
//                     var obj = {
//                         addr: output.addr,
//                         date: new Date(data.txs[0].time * 1000),
//                         amt: output.value
//                     }
//                     if (p.indexOf(obj) == -1) {
//                         console.log(obj);
//                         console.log(p);
//                         p.push(obj);
//                         searchForward(output.addr, num + 1, p);
//                     }
//                 });
//             } else if (importantOutputs.indexOf(address) == -1 && num <= minOutputDepth && address != rootAddr) {
//                 importantOutputs.push(address);
//                 minOutputDepth = num;
//                 outBool = false;
//                 res.render('txreport', {data: btcData, path: path, rootAddr: rootAddr});
//             }
//         });
//     }
// });

module.exports = router;