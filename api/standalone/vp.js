const request = require('request');
const parser = require('fast-html-parser');
const fs = require('fs');
const path = require('path');
const firebase = require('../firebase.js');

let config = require('../config.js');

let lastToday = '';
try {
	lastToday = fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'today.txt'), 'utf-8');
} catch (e) {

}
let lastTomorrow = '';
try {
	lastTomorrow = fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'tomorrow.txt'), 'utf-8');
} catch (e) {

}
let vpToday = {};
let vpTomorrow = {};

let unchanged = 0;

this.getVP = (today, callback) => {
	return new Promise(resolve => {
		request('http://www.viktoriaschule-aachen.de/sundvplan/vps/' + (today ? 'left' : 'right') + '.html', (error, response, body) => {
				if (!response) {
					this.getVP(today, callback);
					return;
				}
				if (response.statusCode !== 200) {
					console.error(body);
					process.exit(1);
				}
				const html = parser.parse(body);
				const dateStr = html.querySelectorAll('div')[0].childNodes[0].rawText.substr(1).replace('-Klassen-Vertretungsplan für ', '').replace('Januar', 'January').replace('Februar', 'February').replace('März', 'March').replace('Mai', 'May').replace('Juni', 'June').replace('Juli', 'July').replace('Oktober', 'October').replace('Dezember', 'December');
				const time = html.querySelectorAll('div')[1].childNodes[0].rawText.replace('Viktoriaschule Aachen, den ', '').split(' um ')[1];
				const changeDate = html.querySelectorAll('div')[1].childNodes[0].rawText.replace('Viktoriaschule Aachen, den ', '').split(' um ')[0];
				const date = new Date(dateStr);
				date.setHours(date.getHours() + 1);
				const weekday = dateStr.split(', ')[0];
				let update = false;
				if (today && lastToday !== dateStr + time) {
					update = true;
				}
				if (!today && lastTomorrow !== dateStr + time) {
					update = true;
				}
				if (update) {
					if (today) {
						lastToday = dateStr + time;
						fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'today.txt'), lastToday);
					} else {
						lastTomorrow = dateStr + time;
						fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'tomorrow.txt'), lastTomorrow);
					}
					['5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c', '8a', '8b', '8c', '9a', '9b', '9c', 'EF', 'Q1', 'Q2', '13'].forEach(grade => {
						vpToday[grade] = {
							date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
							time: time,
							update: changeDate,
							weekday: weekday,
							changes: []
						};
						vpTomorrow[grade] = {
							date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
							time: time,
							update: changeDate,
							weekday: weekday,
							changes: []
						};
					});
					try {
						const table = html.querySelectorAll('table')[0];
						let prevGrade = '';
						// Read the vp...
						for (let i = 1; i < table.childNodes.length; i++) {
							let data = {
								grade: '',
								unit: 0,
								lesson: '',
								type: '',
								room: '',
								teacher: '',
								changed: {
									info: '',
									teacher: '',
									room: ''
								}
							};
							let prevText = '';
							for (let j = 0; j < table.childNodes[i].childNodes.length; j++) {
								let text = '';
								for (let k = 0; k < table.childNodes[i].childNodes[j].childNodes.length; k++) {
									text += table.childNodes[i].childNodes[j].childNodes[k].childNodes[0].rawText + '\n';
								}
								text = text.slice(0, -1);
								text = text.replace('*** ', '');
								if (text.length === 1) {
									text = '';
								}
								text = text.trim();
								if (j === 0) {
									if (text.startsWith('···')) {
										data.grade = prevGrade;
									} else {
										data.grade = text.split(' ')[0].slice(0, -1);
										prevGrade = data.grade;
									}
									try {
										data.unit = parseInt(text.split(' ')[1].slice(0, -1));
									} catch (e) {
									}
								} else if (j === 1) {
									text = text.replace(/\n/g, ' ').replace('(', '').replace(')', '');
									while (text.includes('  ')) {
										text = text.replace('  ', ' ');
									}
									prevText = text;
									if ((text.match(/ /g) || []).length === 1) {
										data.lesson = text.split(' ')[0].toUpperCase();
										data.room = text.split(' ')[1].toUpperCase();
									} else if (text.includes('Klausur')) {
										if (!text.includes('Nachschreiber')) {
											let room = text.split(' ')[text.split(' ').length - 1];
											let teacher = text.split(':')[1].split(' ').slice(-1)[0];
											text = text.split(':')[1].trim().split(' ');
											text.splice(-1, 1);
											text = text.join(' ');
											let textArr = text.split(' ');
											for (let k = 0; k < textArr.length / 4; k++) {
												let a = '';
												for (let l = 0; l < 4; l++) {
													a += textArr[k * 4 + l] + ' ';
												}
												a = a.trim();
												let d = {
													grade: data.grade,
													unit: data.unit,
													lesson: a.split(' ')[2],
													type: a.split(' ')[3],
													room: '',
													teacher: a.split(' ')[1],
													changed: {
														info: 'Klausur',
														teacher: teacher,
														room: room
													}
												};
												if (k !== textArr.length / 4 - 1) {
													if (today) {
														vpToday[d.grade].changes.push(d);
													} else {
														vpTomorrow[d.grade].changes.push(d);
													}
												} else {
													data = d;
												}
											}
										}
									} else {
										try {
											data.lesson = text.split(' ')[1].toUpperCase();
											data.type = text.split(' ')[2].toUpperCase();
											data.room = text.split(' ')[3].toUpperCase();
										} catch (e) {
										}
									}
								} else {
									text = text.replace('\n', ' ');
									let parsed = false;
									while (text.includes('  ')) {
										text = text.replace('  ', ' ');
									}
									if (text.toLowerCase().includes('r-ändg.')) {
										data.changed.info += 'Raumänderung ';
										data.changed.room += text.split(' ')[text.split(' ').length - 1].toUpperCase();
										parsed = true;
									}
									if (text.toLowerCase() === 'referendar(in)') {
										data.changed.info += 'Referendar(in) ';
										parsed = true;
									}
									if (text.toLowerCase().includes('m.aufg.')) {
										data.changed.info += 'Mit Aufgaben ';
										data.changed.teacher = text.split(' ')[0];
										data.changed.room = text.split(' ')[text.split(' ').length - 1].toUpperCase();
										parsed = true;
									}
									if (text.toLowerCase() === 'abgehängt' || text.toLowerCase() === 'abghgt.' || text.toLowerCase() === 'u-frei' || text.toLowerCase() === 'studienzeit') {
										data.changed.info = 'Freistunde ';
										parsed = true;
									}
									if (text.toLowerCase().includes('v.')) {
										data.changed.info += 'Vertretung ';
										parsed = true;
									}
									if (text.toLowerCase().includes('versch.')) {
										data.changed.info += 'Verschoben ';
										parsed = true;
									}
									if (!parsed) {
										if (text !== '') {
											data.changed.info = text;
										} else {
											if (prevText.toLowerCase().includes('klausur')) {
												if (prevText.toLowerCase().includes('nachschreiber')) {
													data.changed.info = 'Klausur Nachschreiber';
													data.changed.teacher = prevText.toLowerCase().split('nachschreiber')[1].split(':')[0].trim().toUpperCase();
													data.changed.room = prevText.split(' ')[prevText.split(' ').length - 1];
												}
											} else {
												data.changed.info = 'Freistunde';
											}
										}
									}
									data.changed.info = data.changed.info.trim();
								}
							}
							data.changed.room = data.changed.room
								.replace(/KLHA|KLH/, 'kleine Halle')
								.replace(/GRHA|GRH/, 'große Halle')
								.replace('KU1', 'Kunst 1')
								.replace('KU2', 'Kunst 2');
							data.room = data.room
								.replace(/KLHA|KLH/, 'kleine Halle')
								.replace(/GRHA|GRH/, 'große Halle')
								.replace('KU1', 'Kunst 1')
								.replace('KU2', 'Kunst 2');
							if (data.teacher === '') {
								if (data.grade !== '') {
									let weekday = (today ? vpToday[data.grade].weekday : vpTomorrow[data.grade].weekday);
									data.teacher = getTeacher(data.grade, weekday, data.unit - 1);
								}
							}
							try {
								if (today) {
									vpToday[data.grade].changes.push(data);
								} else {
									vpTomorrow[data.grade].changes.push(data);
								}
							} catch (e) {
							}
						}
					} catch
						(e) {
						console.log(e);
					}

					console.log('Downloaded vp of ' + (today ? 'today' : 'tomorrow'));
					if (today) {
						Object.keys(vpToday).forEach(grade => {
							vpToday[grade].changes = vpToday[grade].changes.filter(el => {
								return !/^[A-Z]$/m.test(el.room);
							});
						});
						Object.keys(vpToday).forEach(key => callback(key, vpToday[key]));
						resolve(Object.keys(vpToday).map(key => ({grade: key, vp: vpToday[key]})));
					} else {
						Object.keys(vpTomorrow).forEach(grade => {
							vpTomorrow[grade].changes = vpTomorrow[grade].changes.filter(el => {
								return !/^[A-Z]$/m.test(el.room);
							});
						});
						Object.keys(vpTomorrow).forEach(key => callback(key, vpTomorrow[key]));
						resolve(Object.keys(vpTomorrow).map(key => ({grade: key, vp: vpTomorrow[key]})));
					}
				} else {
					console.log('Vp of ' + (today ? 'today' : 'tomorrow') + ' not changed');
					unchanged++;
					if (unchanged === 2) {
						process.exit(1);
					}
				}
			}
		).auth(config.username, config.password, false);
	});
};

let sp = [].concat.apply([], fs.readdirSync(path.resolve(__dirname, '..', '..', 'output', 'sp')).filter(file => {
	return !['EF', 'Q1', 'Q2'].includes(file.replace('.json', '')) && file.replace('.json', '').toUpperCase() === file.replace('.json', '');
}).map(file => {
	let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'sp', file), 'utf-8'));
	let subjects = [];
	data.forEach(a => {
		a.lessons.forEach((b, unit) => {
			b.forEach(c => {
				let d = {
					teacher: file.replace('.json', ''),
					lesson: c.lesson,
					room: c.room,
					grade: c.teacher,
					unit: unit,
					weekday: a.name
				};
				subjects.push(d);
			});
		});
	});
	return subjects;
}));

function getTeacher(grade, weekday, unit) {
	try {
		return sp.filter(s => {
			return s.grade === grade && s.weekday === weekday && s.unit === unit;
		})[0].teacher;
	} catch (e) {
		console.error('Couldn\'t find matching teacher for ', grade, weekday, unit);
		return '';
	}
}

this.onVPUpdate = (grade, data) => {
	firebase.send(grade, JSON.stringify(data));
};

this.getVP(true, this.onVPUpdate).then(vp => {
	vp.forEach(obj => {
		fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'today', obj.grade + '.json'), JSON.stringify(obj.vp, null, 2));
	});
});

this.getVP(false, this.onVPUpdate).then(vp => {
	vp.forEach(obj => {
		fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'tomorrow', obj.grade + '.json'), JSON.stringify(obj.vp, null, 2));
	});
});
