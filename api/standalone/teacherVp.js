const fs = require('fs');
const path = require('path');
const firebase = require('../firebase.js');

let lastTeacherToday = '';
try {
	lastTeacherToday = fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'teachertoday.txt'), 'utf-8');
} catch (e) {

}
let lastTeacherTomorrow = '';
try {
	lastTeacherTomorrow = fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'teachertomorrow.txt'), 'utf-8');
} catch (e) {

}

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

fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'teachertoday.txt'), lastToday);
fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', 'teachertomorrow.txt'), lastTomorrow);

const grades = [];
for (let i = 5; i < 10; i++) {
	for (let j = 0; j < 3; j++) {
		grades.push(i + ['a', 'b', 'c'][j]);
	}
}
grades.push('EF');
grades.push('Q1');
grades.push('Q2');

this.readAllVps = today => {
	return new Promise(resolve => {
		let Vp = [];
		let header = {};
		grades.forEach((grade, i) => {
			let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', (today ? 'today' : 'tomorrow'), grade + '.json'), 'utf-8'));
			if (i === 0) {
				header = {
					date: data.date,
					time: data.time,
					update: data.update,
					weekday: data.weekday
				};
			}
			data.changes.forEach(change => {
				change.date = data.date;
				change.time = data.time;
				change.update = data.update;
				change.weekday = data.weekday;
				Vp.push(change);
			});
		});
		if (Vp.length === 0) {
			resolve([header]);
		} else {
			resolve(Vp);
		}
	});
};

let a = [];
if (lastTeacherToday !== lastToday) {
	a.push(true);
}
if (lastTeacherTomorrow !== lastTomorrow) {
	a.push(false);
}

a.forEach(today => {
	this.readAllVps(today).then(allVp => {
		let teachers = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'list.json'), 'utf-8')).map(teacher => teacher.shortName);
		teachers.forEach(teacher => {
			let data = allVp.filter(a => a.teacher === teacher);
			let vp = {
				date: allVp[0].date,
				time: allVp[0].time,
				update: allVp[0].update,
				weekday: allVp[0].weekday,
				changes: data.map(b => {
					b.teacher = b.grade;
					b.changed.teacher = '';
					delete b.date;
					delete b.time;
					delete b.update;
					delete b.weekday;
					return b;
				})
			};
			firebase.send(teacher.replace('Ü', 'UE').replace('Ä', 'AE').replace('Ö', 'OE'), JSON.stringify(vp));
			fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', (today ? 'today' : 'tomorrow'), teacher + '.json'), JSON.stringify(vp, null, 2));
		});
		console.log('Generated teacher vp for ' + (today ? 'today' : 'tomorrow'));
	});
});