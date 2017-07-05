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

//GET /folders/:folderid/addresses/:addr/explore/:tx_id

//Gets the transaction report for a transaction.
router.get('/folders/:folderid/addresses/:addr/explore/:tx_id/', middleware.isLoggedIn, function(req, res) {
    var fringe = [];
    var dict = {};
    var txdata = "";
    var folder = "";
    var txs = [];
    var labels = {};
    var backSearch = true;
    var frontSearch = true;
    if (req.query.direction == 'backward') {
        frontSearch = false;
    } else if (req.query.direction == 'forward') {
        backSearch = false;
    }
    
    Folder.findById(req.params.folderid).populate('addresses').exec(function(err, folderData) {
    //User.findById(req.user.id).populate('addresses').exec(function(err, userData) {
        if (err) {
            console.log(err);
        }
        folder = folderData;
        folderData.addresses.forEach(function(address) {
            labels[address.addr] = address.label;
        });
        //console.log(req.query);
        
        blockexplorer.getTx(req.params.tx_id).then(function(data) {
            txdata = data;
            if (backSearch) {
                data.inputs.forEach(function(input) {
                    var addr = input.prev_out.addr;
                    var path = [];
                    path.push(addr);
                    fringe.push(addr);
                    dict[addr] = {
                        backward: true,
                        depth: 0,
                        prev: 'root',
                        path: path,
                        sent: input.prev_out.value / 100000000,
                        sentDate: txdata.time * 1000,
                        received: 0,
                        ofInterest: false
                    }
                });
            }
            if (frontSearch) {
                data.out.forEach(function(out) {
                    fringe.push(out.addr);
                    var path = [];
                    path.push(out.addr);
                    dict[out.addr] = {
                        backward: false,
                        depth: 0,
                        prev: 'root',
                        path: path,
                        sent: 0,
                        received: out.value / 100000000,
                        receivedDate: txdata.time * 1000,
                        ofInterest: false
                    }
                });
            }
            //console.log('updating dict');
            blockexplorer.getMultiAddress(fringe).then(function(fringeData) {
                fringeData.addresses.forEach(function(addr) {
                    dict[addr.address].n_tx = addr.n_tx;
                });
                //console.log('starting backward search');
                getBackward(fringe.shift());
            });
        });
    });
    
    function getBackward(address) {
        //console.log('get backward for ' + address);
        if (!dict[address].backward) {
            getForward(address);
        } else {
            if (dict[address].n_tx <= req.query.ntx && dict[address].depth < req.query.depth) {
                blockexplorer.getAddress(address).then(function(addrData) {
                    //console.log('got data for ' + address);
                    var inputs = [];
                    var inputData = {};
                    var valid_tx = true;
                    addrData.txs.forEach(function(tx) {
                        var b = true;
                        tx.inputs.forEach(function(input) {
                            if (input.prev_out.addr == address) {
                                b = false;
                            }
                        });
                        
                        if (b && valid_tx && tx.tx_index != req.params.tx_id) {
                            if (tx.inputs.length > req.query.addrPerTx) {
                                valid_tx = false;
                                dict[address].ofInterest = true
                            } else {
                                tx.inputs.forEach(function(input) {
                                    inputs.push(input.prev_out.addr);
                                    inputData[input.prev_out.addr] = {
                                        amt: input.prev_out.value / 100000000,
                                        date: tx.time * 1000
                                    };
                                    if (dict[input.prev_out.addr] && txs.indexOf(tx.tx_index) == -1) {
                                        //console.log('sent updated for ' + input.prev_out.addr);
                                        dict[input.prev_out.addr].sent -= input.prev_out.value / 100000000;
                                        dict[input.prev_out.addr].sentDate = tx.time * 1000;
                                    }
                                });
                                tx.out.forEach(function(outaddr) {
                                    if (dict[outaddr.addr] && txs.indexOf(tx.tx_index) == -1) {
                                        //console.log('received updated for ' + outaddr.addr);
                                        dict[outaddr.addr].received += outaddr.value / 100000000;
                                        dict[outaddr.addr].receivedDate = tx.time * 1000;
                                    } 
                                });
                                txs.push(tx.tx_index);
                            }
                        }
                    });
                    //console.log('got inputs for ' + address);
                    if (valid_tx) {
                        blockexplorer.getMultiAddress(inputs).then(function(data) {
                            addAllInputs(address, data, inputData, dict[address].depth + 1);
                            next();
                        });
                    } else {
                        next();
                    }
                });
            } else {
                if (dict[address].n_tx > req.query.ntx) {
                    dict[address].ofInterest = true;
                    dict[address].received = '-'
                }
                next();
            }
        }
    }
    
    function getForward(address) {
        //console.log('get forward for ' + address);
        if (dict[address].backward) {
            getBackward(address);
        } else {
            if (dict[address].n_tx <= req.query.ntx && dict[address].depth < req.query.depth) {
                blockexplorer.getAddress(address).then(function(addrData) {
                    //console.log('got data for ' + address);
                    var outputs = [];
                    var outputData = {};
                    var valid_tx = true;
                    addrData.txs.forEach(function(tx) {
                        var b = true;
                        tx.out.forEach(function(output) {
                            if (output.addr == address) {
                                b = false;
                            }
                        });
                        if (b && valid_tx && tx.tx_index != req.params.tx_id) {
                            if (tx.out.length > req.query.addrPerTx) {
                                valid_tx = false;
                                dict[address].ofInterest = true;
                            } else {
                                tx.out.forEach(function(output) {
                                    outputs.push(output.addr);
                                    outputData[output.addr] = {
                                        amt: output.value / 100000000,
                                        date: tx.time * 1000
                                    };
                                    if (dict[output.addr] && txs.indexOf(tx.tx_index) == -1) {
                                        //console.log('received updated for ' + output.addr);
                                        dict[output.addr].received += output.value / 100000000;
                                    }
                                });
                                tx.inputs.forEach(function(inaddr) {
                                    if (dict[inaddr.prev_out.addr] && txs.indexOf(tx.tx_index) == -1) {
                                        //console.log('sent updated for ' + inaddr.prev_out.addr);
                                        dict[inaddr.prev_out.addr].sent -= inaddr.prev_out.value / 100000000;
                                    }
                                });
                                txs.push(tx.tx_index);
                            }
                        }
                    });
                    //console.log('got outputs for ' + address);
                    if (valid_tx) {
                        blockexplorer.getMultiAddress(outputs).then(function(data) {
                            addAllOutputs(address, data, outputData, dict[address].depth + 1);
                            next();
                        });
                    } else {
                        next();
                    }
                });
            } else {
                if (dict[address].n_tx > req.query.ntx) {
                    dict[address].ofInterest = true;
                    dict[address].sent = '-'
                }
                next();
            }
        }
    }
    
    function addAllInputs(prev, data, inputData, depth) {
        //console.log('add all inputs for depth ' + String(depth));
        data.addresses.forEach(function(input) {
            var addr = input.address;
            var r = 0;
            if (depth == req.query.depth) {
                r = '-';
            }
            //console.log('adding ' + addr);
            if (!dict[addr]) {
                var path = dict[prev].path.concat([addr]);
                fringe.push(addr);
                dict[addr] = {
                    backward: true,
                    depth: depth,
                    n_tx: input.n_tx,
                    prev: prev,
                    path: path,
                    sent: -inputData[addr].amt,
                    received: r,
                    sentDate: inputData[addr].date
                }
            }
        });
    }
    
    function addAllOutputs(prev, data, outputData, depth) {
        //console.log('adding all outputs for depth ' + String(depth));
        data.addresses.forEach(function(output) {
            var addr = output.address;
            //console.log('adding ' + addr)
            var s = 0
            if (depth == req.query.depth) {
                s = '-'
            }
            if (!dict[addr]) {
                var path = dict[prev].path.concat([addr]);
                fringe.push(addr);
                dict[addr] = {
                    backward: false,
                    depth: depth,
                    n_tx: output.n_tx,
                    prev: prev,
                    path: path,
                    sent: s,
                    received: outputData[addr].amt,
                    receivedDate: outputData[addr].date
                }
            }
        });
    }
    
    function next() {
        if (fringe.length > 0) {
            getForward(fringe.shift());
        } else {
            res.render('addresses/txreport', {data: txdata, path: '', rootAddr: req.params.addr, dict: dict, labels: labels, currentFolder: folder});
        }
    }
});

module.exports = router;