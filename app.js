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
    methodOverride          = require('method-override'),
    flash                   = require('connect-flash');

    
var addressRoutes = require('./routes/address'),
    folderRoutes = require('./routes/folders'),
    reportRoutes = require('./routes/report'),
    utilRoutes = require('./routes/util');

var url = process.env.DATABASEURL || "mongodb://localhost/blockchain_dashboard"
mongoose.connect(url);app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(flash());
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
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

app.use(addressRoutes);
app.use(reportRoutes);
app.use(folderRoutes);
app.use(utilRoutes);

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server has started!");
});