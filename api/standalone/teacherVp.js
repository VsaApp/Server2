const fs = require('fs');
const path = require('path');

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

[true, false].forEach(today => {
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
					delete b.date;
					delete b.time;
					delete b.update;
					delete b.weekday;
					return b;
				})
			};
			fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'vp', (today ? 'today' : 'tomorrow'), teacher + '.json'), JSON.stringify(vp, null, 2));
		});
		console.log('Generated teacher vp for' + (today ? 'today' : 'tomorrow'));
	});
});