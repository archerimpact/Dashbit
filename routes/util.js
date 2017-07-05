var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var middleware = require('../middleware');
var Folder = require('../models/folder');

router.get('/', function(req, res) {
    res.render('landing');
})

router.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/folders');
    } else {
        if (req.query.f == "t") {
            req.flash("error", "Login failed. Try again.");
            res.redirect('/login');
        } else {
            res.render('login', {register:false});
        }
    }
});

router.get('/register', function(req, res) {
    res.render('login', {register:true})
});

router.post('/login', passport.authenticate('local', {
        successRedirect: '/folders',
        failureRedirect: '/login?f=t',
    }), function(req, res) {
});


//write middleware to check reqs of registration info
router.post('/register', function(req, res) {
    var newUser = new User({username: req.body.username, addresses: [], folders: []});
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            res.redirect('/login');
        }
        var folder = {
            name: 'General',
            desc: 'All addresses for user ' + req.body.username,
            admin: user
        }
        Folder.create(folder, function(err, general) {
           user.folders.push(general);
           user.save();
           if (err) {
                res.redirect('/login');
            } else {
                req.flash("success", "User created: " + req.body.username);
                passport.authenticate('local')(req, res, function() {
                    res.redirect('/folders');
                });
            }
        });
   });
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
});

router.get('*', middleware.isLoggedIn, function(req, res) {
    res.redirect('/folders');
});

module.exports = router;