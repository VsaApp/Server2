const request = require('request');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

let config = require('../config.js');

let shorts = [];
let mails = [];

this.downloadTeacherMailPDF = () => {
    const p = this;
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'mails.pdf'));
        const cookieJar = request.jar();
        request.post({
            url: 'http://viktoriaschule-aachen.de/index.php',
            jar: cookieJar,
            form: {
                username: config.username,
                password: config.password
            }
        }, () => {
            request.get({
                url: 'http://viktoriaschule-aachen.de/index.php?menuid=97&downloadid=265',
                jar: cookieJar
            }).pipe(stream);
            stream.on('finish', () => {
                p.readTeacherMailList(resolve, reject);
            });
        });
    });
};

this.readTeacherMailList = resolve => {
    const pdfParser = new PDFParser();
  
    pdfParser.on('pdfParser_dataError', errData => {
      console.error(errData);
    });
  
    pdfParser.on('pdfParser_dataReady', pdfData => {
        let teacherList = [];
        const pages = pdfData.formImage.Pages;
        pages.forEach(page => {
            for (let i = 0; i < page.Texts.length; i++) {
                const text = decodeURI(page.Texts[i].R[0].T);
                if (new RegExp(/^[0-9]+\. $/gm).test(text)) {
                    teacherList.push(decodeURI(page.Texts[i + 1].R[0].T));
                    i++;
                }
            }
        });
        resolve(teacherList);
        console.log('Downloaded teacher\'s mails');
    });
  
    pdfParser.loadPDF(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'mails.pdf'));
};

this.downloadTeacherShortPDF = () => {
    const p = this;
    return new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'shorts.pdf'));
        const cookieJar = request.jar();
        request.post({
            url: 'http://viktoriaschule-aachen.de/index.php',
            jar: cookieJar,
            form: {
                username: config.username,
                password: config.password
            }
        }, () => {
            request.get({
                url: 'http://viktoriaschule-aachen.de/index.php?menuid=41&downloadid=80',
                jar: cookieJar
            }).pipe(stream);
            stream.on('finish', () => {
                p.readTeacherShortList(resolve, reject);
            });
        });
    });
};
  
this.readTeacherShortList = resolve => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', errData => {
        console.error(errData);
    });

    pdfParser.on('pdfParser_dataReady', pdfData => {
        let teacherList = [];
        const pages = pdfData.formImage.Pages;
        pages.forEach(page => {
            let lines = [];
            let tempValues = [];

            page.Texts.forEach(rawText => {
                const text = decodeURI(rawText.R[0].T);
                if ((text.includes('.') && text.length <= 3) || text === 'Fakultenliste') {

                } else if (text.length === 3 && text === text.toUpperCase()) {
                    tempValues.push(text);
                lines.push(tempValues);
                    tempValues = [];
                } else {
                    tempValues.push(text);
                }
            });
            // Convert lines to teachers...
            lines.forEach(function (line) {
                let teacher = {
                    longName: '',
                    shortName: '',
                    subjects: []
                };
                for (let i = 0; i < line.length; i++) {
                    const value = line[i].trim();
                    if (value.length === 3 && value === value.toUpperCase()) {
                        teacher.shortName = value;
                    } else if (value.length <= 2) {
                        teacher.subjects.push(value);
                    } else {
                        teacher.longName = value;
                    }
                }
                teacherList.push(teacher);
            });
        });
        resolve(teacherList);
        console.log('Downloaded teacher\'s shortnames');
    });

    pdfParser.loadPDF(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'shorts.pdf'));
};

this.overrideGender = short => {
    if ('genders' in config) {
        if (short in config.genders) {
            return config.genders[short];
        }
    } else {
        return null;
    }
};

this.checkTeachers = () => {
    if (shorts.length > 0 && mails.length > 0) {
        for (let i = 0; i < shorts.length; i++) {
            const gender = this.overrideGender(shorts[i].shortName);
            if (gender) {
                shorts[i].gender = gender;
            } else {
                shorts[i].gender = (mails[i].startsWith('Herr ') ? 'male' : 'female');
            }
        }
      fs.writeFileSync(path.resolve(__dirname, '..', '..', 'output', 'teachers', 'list.json'), JSON.stringify(shorts, null, 2));
    }
};

this.downloadTeacherShortPDF().then(teacherList => {
  teacherList = teacherList.sort((a, b) => {
    const textA = a.longName.toUpperCase();
    const textB = b.longName.toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });
  shorts = teacherList;
  this.checkTeachers();
});
this.downloadTeacherMailPDF().then(teacherList => {
  teacherList = teacherList.sort((a, b) => {
    const textA = a.replace('Herr ').replace('Frau ').toUpperCase();
    const textB = b.replace('Herr ').replace('Frau ').toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });
  mails = teacherList;
  this.checkTeachers();
});