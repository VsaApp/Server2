const fs = require('fs');
const path = require('path');
const request = require('request');
const parser = require('fast-html-parser');
const entities = require('entities');
const firebase = require('../firebase');

const cli = module.parent === null;
let config = require('../config.js');

this.getMenues = (id, pin) => {
	return new Promise((resolve, reject) => {
		let defaultLogin = false;
		if (id === '' || pin === '') {
			if (cli) {
				id = config.cafetoria_default_id;
				pin = config.cafetoria_default_pin;
				defaultLogin = true;
			} else {
				resolve(JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'cafetoria', 'list.json'), 'utf-8')));
			}
		}
		let send = {
			error: null
		};
		const cookieJar = request.jar();
		request.get({
			url: 'https://www.opc-asp.de/vs-aachen/',
			jar: cookieJar
		}, () => {
			request.post({
				url: 'https://www.opc-asp.de/vs-aachen/?LogIn=true',
				jar: cookieJar,
				form: {
					sessiontest: cookieJar._jar.store.idx['www.opc-asp.de']['/'].PHPSESSID.toString().split(';')[0].split('=')[1],
					f_kartennr: id,
					f_pw: pin
				}
			}, () => {
				request.get({
					url: 'https://www.opc-asp.de/vs-aachen/menuplan.php?KID=' + id,
					jar: cookieJar
				}, (error, response, body) => {
					if (response.statusCode !== 200) {
						reject({
							error: 'Invalid credentials'
						});
						return;
					}
					const html = parser.parse(body);
					const saldo = html.querySelectorAll('#saldoOld')[0].childNodes[0].rawText.replace(',', '.');
					const menue = html.querySelectorAll('#MenuePlanTabelle')[0];
					send.menues = [];
					for (let i = 0; i < 5; i++) {
						let date = this.getMonday(new Date());
						date = this.addDays(date, i);
						const year = date.getFullYear().toString();
						let month = (date.getMonth() + 1).toString();
						let day = date.getDate().toString();
						while (month.length < 2) {
							month = '0' + month;
						}
						while (day.length < 2) {
							day = '0' + day;
						}
						const row = menue.querySelectorAll('#mpdatum_' + year + month + day)[0];
						let data = {
							weekday: '',
							date: day + '.' + month + '.' + year,
							menues: [],
							extra: {
								food: '',
								time: '',
								price: 0.0
							},
							snack: {
								food: '',
								time: '',
								price: 0.0
							}
						};
						for (let j = 0; j < row.childNodes.length; j++) {
							const el = row.childNodes[j];
							if (el.tagName === 'td') {
								if (j === 0) {
									data.weekday = el.childNodes[2].rawText;
								} else if (j === 1 || j === 3) {
									let mMenue = {
										time: {
											start: '',
											end: ''
										},
										food: '',
										price: 0.0
									};
									const table = el.childNodes[1];
									let nodes = table.childNodes[0].childNodes[0].childNodes;
									if (nodes.length === 3) {
										mMenue.food = entities.decodeHTML(nodes[2].rawText);
										const times = nodes[0].rawText.replace(' Uhr', '').split(' - ');
										mMenue.time.start = times[0];
										mMenue.time.end = times[1];
									} else {
										if (nodes[0] !== undefined) {
											mMenue.food = entities.decodeHTML(nodes[0].rawText);
										}
									}
									if (table.childNodes[2] !== undefined) {
										if (table.childNodes[2].childNodes[0].childNodes[1].childNodes[0] !== undefined) {
											mMenue.price = parseFloat(table.childNodes[2].childNodes[0].childNodes[1].childNodes[0].rawText.replace(' &euro', '').replace(',', '.'));
										}
									}
									data.menues.push(mMenue);
								} else if (j === 5 || j === 7) {
									const table = el.childNodes[1];
									if (table !== undefined) {
										let nodes = table.childNodes[0].childNodes[0].childNodes;
										let time = '';
										let food = '';
										let price = 0.0;
										if (nodes.length > 0) {
											if (nodes[0].rawText.includes('Uhr')) {
												time = nodes[0].rawText.replace(' Uhr', '');
												food = entities.decodeHTML(nodes[2].rawText);
											} else if (nodes.length > 1) {
												food = entities.decodeHTML(nodes[0].rawText + ' ' + nodes[2].rawText);
											} else {
												food = entities.decodeHTML(nodes[0].rawText);
											}
											nodes = table.childNodes[2].childNodes[0].childNodes[1];
											if (nodes.childNodes.length > 0) {
												price = parseFloat(nodes.childNodes[0].rawText.replace(' &euro', '').replace(',', '.'));
											}
											if (j === 5) {
												data.extra.time = time;
												data.extra.food = food;
												data.extra.price = price;
											} else {
												data.snack.time = time;
												data.snack.food = food;
												data.snack.price = price;
											}
										}
									}
								}
							}
						}
						send.menues.push(data);
					}
					if (!defaultLogin) {
						send.saldo = parseFloat(saldo);
					} else {
						send.saldo = null;
					}
					resolve(send);
				});
			});
		});
	});
};

this.getMonday = d => {
	d = new Date(d);
	let day = d.getDay(),
		diff = d.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(d.setDate(diff));
};

this.addDays = (date, days) => {
	const newdate = new Date(date);
	newdate.setDate(newdate.getDate() + days);
	return newdate;
};

if (cli) {
	this.getMenues('', '').then(menues => {
		let old = {};
		try {
			old = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'cafetoria', 'list.json'), 'utf-8'));
		} catch (e) {

		}
		if (JSON.stringify(old) !== JSON.stringify(menues)) {
			firebase.send('cafetoria', 'update');
			console.log('Cafetoria menues downloaded');
			fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'cafetoria', 'list.json'), JSON.stringify(menues, null, 2));
		} else {
			console.log('Cafetoria menues not changed');
		}
	});
}
module.exports = this;