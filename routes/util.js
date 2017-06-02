var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var middleware = require('../middleware');

// router.get('/', function(req, res) {
//     res.render('landing');
// })

router.get('/login', function(req, res) {
    res.render('login');
});

router.post('/login', passport.authenticate('local', {
        successRedirect: '/addresses',
        failureRedirect: '/login'
    }), function(req, res) {
});


//write middleware to check reqs of registration info
router.post('/register', function(req, res) {
    var newUser = new User({username: req.body.username, addresses: []});
    User.register(newUser, req.body.password, function(err, user) {
       if (err) {
           res.redirect('/login');
       } else {
           passport.authenticate('local')(req, res, function() {
               res.redirect('/addresses');
           });
       }
   });
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
});

router.get('*', middleware.isLoggedIn, function(req, res) {
    res.redirect('/addresses');
});

module.exports = router;