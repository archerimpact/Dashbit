var express = require('express');
var app = express();
var firebase = require('firebase');
var _ = require('underscore-node');
app.set("view engine", "ejs");
app.use(express.static('public'));
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
var blockexplorer = require('blockchain.info/blockexplorer');
var exchange = require('blockchain.info/exchange');

var config = {
    apiKey: "AIzaSyCVDXv97plY6ExZW-vnwOYBIrg0vu5PhYY",
    authDomain: "blockchainsquad.firebaseapp.com",
    databaseURL: "https://blockchainsquad.firebaseio.com",
    projectId: "blockchainsquad",
    storageBucket: "blockchainsquad.appspot.com",
    messagingSenderId: "969026353343"
  };
firebase.initializeApp(config);

var labels = {};


app.get("/", function(req, res) {
    var user = firebase.auth().currentUser;
    var addresses = [];
    var balances = {};
    if (user) {
        var username = user.email.split("@")[0];
        firebase.database().ref('/Users/' + username).once('value').then(function(snapshot) {
            if (snapshot.val() != null) {
                for (var key in snapshot.val()) {
                    var addr = snapshot.val()[key]["Address"];
                    var label = snapshot.val()[key]["Label"];
                    var n = snapshot.val()[key]["NumTx"];
                    labels[addr] = label;
                    var obj = {
                        addr: addr,
                        label: label,
                        num: n
                    }
                    addresses.push(obj);
                }
                var finished = _.after(addresses.length, doRender);
                for (var i = 0; i < addresses.length; i++) {
                    blockexplorer.getAddress(addresses[i].addr).then(function(obj) {
                        var b = (obj.final_balance / 100000000);
                        var n = obj.n_tx;
                        exchange.fromBTC(obj.final_balance, "USD").then(function(dollars) {
                            balances[obj.address] = {
                                btc: b,
                                usd: dollars,
                                ntx: n
                            };
                            finished();
                        })
                    });
                }
            } else {
                doRender();
            }
        });
	    
    } else {
        res.redirect('/login');
    }
    function doRender() {
	   res.render('index', {email: user.email, data: addresses, balances: balances});
	}
});

app.get('/login', function(req, res) {
    res.render('login');
});

app.post('/logOut', function(req, res) {
    firebase.auth().signOut().then(function() {
  		// Sign-out successful.
	}).catch(function(error) {
		alert(error.message);
	});
    res.redirect('/');
})

app.post('/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var failed = false;
    firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .then(function(user) { res.redirect('/'); })
        .catch(function(){});
});

app.get('/address/:addr', function(req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        var username = user.email.split("@")[0];
        var addr = req.params.addr;
        blockexplorer.getAddress(addr).then(function(data) {
            firebase.database().ref('/Users/' + username).once('value').then(function(snapshot) {
                var k = "";
                for (var key in snapshot.val()) {
                    var btc = snapshot.val()[key]["Address"];
                    if (addr == btc) {
                        k = key;
                    }
                }
                var dbData = "";
                if (k === "") {
                    dbData = "";
                } else {
                    firebase.database().ref().child("Users").child(username).child(k).child("NumTx").set(data.n_tx);
                    dbData = snapshot.val()[k];
                }
                res.render('individual', {btcData: data, dbData: dbData, labels: labels, blockexplorer: blockexplorer});
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/add', function(req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        res.render("addAddress");
    } else {
      res.redirect('/login');  
    }
    
});

app.post('/add', function(req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        var firebaseRef = firebase.database().ref();
        var username = user.email.split("@")[0];
        var label = req.body.label;
        var address = req.body.address;
        blockexplorer.getAddress(address).then(function(obj) {
            firebaseRef.child("Users").child(username).push({
        		"Label" : label,
        		"Address" : address,
        		"Description" : "",
        		"Notes" : "",
        		"NumTx" : obj.n_tx
        	});
        	res.redirect('/');
        });
    }
});

app.post('/createAccount', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var confirmpassword = req.body.confirm;
	if (email != '' && password != '') {
		firebase.auth()
		.createUserWithEmailAndPassword(email, password)
		.then(function(user) {
		    firebase.auth()
            .signInWithEmailAndPassword(email, password)
            .then(function(user) { 
                var username = email.split("@")[0];
                res.redirect('/'); 
            })
            .catch(function(){});
		        res.redirect('/login');
		    })
		.catch(function(error) {
		    console.log(error);
		    res.redirect('/login');
		});
	}
});

app.get('/address/:addr/report/:txindex', function(req, res) {
    var importantInputs = [];
    var rootAddr = req.params.addr;
    var minInputDepth = 10000000000;
    var minOutputDepth = 1000000000000;
    var importantOutputs = [];
    var outBool = true;
    var inBool = true;
    
    function searchBack(address, num, path) {
        var endPoints = [];
        blockexplorer.getAddress(address).then(function(data) {
            console.log(data);
            if (data.n_tx < 3 && inBool) {
                data.txs[1].inputs.forEach(function(input) {
                    var p = path;
                    var amt = 0;
                    for (var k = 0; k < data.txs[1].out.length; k++) {
                        if (data.txs[1].out[k].addr == address) {
                            amt = data.txs[1].out[k].value;
                        }
                    }
                    var obj = {
                        addr: address,
                        date: new Date(data.txs[1].time * 1000),
                        amt: amt
                    }
                    if (p.indexOf(obj) == -1) {
                        p.push(obj);
                        searchBack(input.prev_out.addr, num + 1, p);
                    }
                });
            } else if (importantInputs.indexOf(address) == -1 && num <= minInputDepth && address != rootAddr) {
                importantInputs.push(address);
                minInputDepth = num;
                inBool = false;
                var p = path;
                var obj = {
                    addr: address,
                }
                path.push(obj);
                res.render('report', {path: p});
            }
        });
    }
    var tx_index = req.params.txindex;
    blockexplorer.getTx(tx_index).then(function(data) {
        for (var i = 0; i < data.inputs.length; i++) {
            var path = [];
            var amt = 0;
            for (var k = 0; k < data.out.length; k++) {
                if (data.out[k].addr == rootAddr) {
                    amt = data.out[k].value;
                }
            }
            var obj = {
                addr: rootAddr,
                date: new Date(data.time * 1000),
                amt: amt
            }
            path.push(obj);
            searchBack(data.inputs[i].prev_out.addr, 1, path);
        }
    });
});

app.post('/search', function(req, res) {
    var addr = req.body.searchAddr;
    res.redirect('/address/' + addr);
})

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server has started!");
});