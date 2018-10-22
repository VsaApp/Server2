const firebase = require('./firebase.js');

this.host = app => {
    app.get('/subscribe', (req, res) => {
        firebase.subscribe(req.query.token, req.query.topic);
        res.end();
    });
    app.get('/unsubscribe', (req, res) => {
        firebase.unsubscribe(req.query.token, req.query.topic);
        res.end();
    });
};

module.exports = this;