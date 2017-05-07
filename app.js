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


app.get("/", function(req, res) {
    var user = firebase.auth().currentUser;
    var addresses = [];
    var balances = {};
    if (user) {
        var username = user.email.split("@")[0];
        firebase.database().ref('/Users/' + username).once('value').then(function(snapshot) {
            for (var key in snapshot.val()) {
                var addr = snapshot.val()[key]["Address"];
                var label = snapshot.val()[key]["Label"];
                var n = snapshot.val()[key]["NumTx"];
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
                    dbData = snapshot.val()[k];
                }
                // console.log(data.txs[0].inputs);
                res.render('individual', {btcData: data, dbData: dbData});
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/add', function(req, res) {
    var user = firebase.auth().currentUser;
    if(user) {
        res.render("addAddress");
    }
    res.redirect('/login')
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
    } else {
        res.redirect('/login');
    }
});

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server has started!");
});