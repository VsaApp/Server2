const express = require('express');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');
const hashFiles = require('hash-files');
const cafetoria = require('./cafetoria.js');
const topic = require('./firebaseTopic.js');
const app = express();

let config = require('./config.js');
let sums = {};

['username', 'password'].forEach(name => {
    if (!(name in config)) {
      throw new Error('Missing ' + name + ' in config');
    }
});

config.usernamesha = crypto.createHash('sha256').update(config.username).digest('hex');
config.passwordsha = crypto.createHash('sha256').update(config.password).digest('hex');

app.use('/sums/list.json', (req, res) => {
  res.send(sums);
});

app.get('/validate', (req, res) => {
  if (!('username' in req.query)) {
    res.send('2');
    return;
  }
  if (!('password' in req.query)) {
    res.send('3');
    return;
  }
  if (req.query.username !== config.usernamesha || req.query.password !== config.passwordsha) {
    res.send('1');
    return;
  }
  res.send('0');
});

cafetoria.host(app);
topic.host(app);

app.listen(9000, () => {
  console.log('Listening on *:' + 9000);
});

const watcher = chokidar.watch(path.resolve(__dirname, '..', 'output'), {ignored: /^\./, persistent: true});

watcher
  .on('add', () => {
    generateSums();
  })
  .on('change', () => {
    generateSums();
  });

generateSums();

function generateSums() {
  const files = ['ags/list.json', 'dates/list.json', 'documents/list.json', 'sp/*', 'teachers/list.json', 'vp/today/*', 'vp/tomorrow/*'];
  files.forEach(file => {
    hashFiles({files: ['output/' + file], algorithm: 'sha256'}, (error, hash) => {
      if (error) {
        throw error;
      }
      const name = file.replace(/\/list.json|\/\*/ig, '');
      sums[name] = hash;
    });
  });
}