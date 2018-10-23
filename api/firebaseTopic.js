const firebase = require('./firebase.js');

this.host = app => {
    app.get('/subscribe', (req, res) => {
        firebase.subscribe(req.query.token, req.query.topic).then(() => {
            res.send();
        }).catch(res.send);
    });
    app.get('/unsubscribe', (req, res) => {
        firebase.unsubscribe(req.query.token, req.query.topic).then(() => {
            res.send();
        }).catch(res.send);
    });
};

module.exports = this;