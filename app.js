var _                       = require('underscore-node'),
    express                 = require('express'),
    app                     = express(),
    bodyParser              = require('body-parser'),
    blockexplorer           = require('blockchain.info/blockexplorer'),
    exchange                = require('blockchain.info/exchange'),
    mongoose                = require('mongoose'),
    passport                = require('passport'),
    LocalStrategy           = require('passport-local'),
    passportLocalMongoose   = require('passport-local-mongoose'),
    User                    = require('./models/user'),
    methodOverride          = require('method-override');;
    
var utilRoutes = require('./routes/util'),
    addressRoutes = require('./routes/address');

mongoose.connect("mongodb://localhost/blockchain_dashboard");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
//  Passport Config
app.use(require('express-session')({
    secret: 'your eyes, they turn me',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    next();
});
app.use(addressRoutes);
app.use(utilRoutes);
app.get('/addresses/:addr/report/:txindex', function(req, res) {
    res.render('txreport');
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

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server has started!");
});