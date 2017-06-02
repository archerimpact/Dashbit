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

// mongoose.connect("mongodb://localhost/blockchain_dashboard");
mongoose.connect(process.env.DATABASEURL);

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

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server has started!");
});