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

this.readAllSps = () => {
	return new Promise(resolve => {
		let sp = [];
		grades.forEach(grade => {
			let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'output', 'sp', grade + '.json'), 'utf-8'));
			data.map(day => {
				day.lessons.map((lesson, i) => {
					lesson.map(subject => {
						if (subject) {
							sp.push({
								weekday: day.name,
								lesson: i,
								teacher: subject.teacher,
								subject: subject.lesson,
								room: subject.room,
								grade: grade
							});
						}
					});
				});
			});
		});
		resolve(sp);
	});
};

this.readAllSps().then(allSp => {
	let teachers = allSp.map(a => a.teacher);
	teachers = teachers.filter((item, pos) => teachers.indexOf(item) === pos);
	teachers = teachers.map(teacher => teacher.replace('Ö', 'OE').replace('Ä', 'AE').replace('Ü', 'UE'));
	teachers.forEach(teacher => {
		let data = allSp.filter(a => a.teacher === teacher);
		let weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
		let sp = [];
		weekdays.forEach(weekday => {
			let a = {
				name: weekday,
				lessons: []
			};
			for (let i = 0; i < 10; i++) {
				a.lessons.push([]);
			}
			data.filter(d => d.weekday === weekday).forEach(d => {
				a.lessons[d.lesson] = [{
					teacher: d.grade,
					lesson: d.subject,
					room: d.room
				}];
			});
			sp.push(a);
		});
		fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'sp', teacher + '.json'), JSON.stringify(sp, null, 2));
	});
	console.log('Generated teacher sp');
});