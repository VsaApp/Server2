const cafetoria = require('./standalone/cafetoria');

this.host = app => {
	app.get('/cafetoria', (req, res) => {
		if (!('id' in req.query)) {
			res.send({
				error: 'No ID specified'
			});
			return;
		}
		if (!('password' in req.query)) {
			res.send({
				error: 'No password specified'
			});
			return;
		}
		cafetoria.getMenues(req.query.id, req.query.password).then(data => {
			res.send(data);
		}).catch(data => {
			res.send(data);
		});
	});
};

module.export = this;