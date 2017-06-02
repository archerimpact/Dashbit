var blockexplorer = require('blockchain.info/blockexplorer')
var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

middlewareObj.isValidAddr = function(req, res, next) {
    blockexplorer.getAddress(req.params.addr).then(function(obj) {
        next();
    }, function(rejection) {
        res.redirect('/addresses');
    });
}

module.exports = middlewareObj;