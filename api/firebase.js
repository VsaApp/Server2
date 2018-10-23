const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '..', 'firebase.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://vsaapp-12965.firebaseio.com'
});

this.send = (topic, data) => {
  admin.messaging().sendToTopic('/topics/' + topic, {
    data: {
      data: data
    }
  })
    .catch(error => {
      console.log('Error sending message:', error);
    });
};

this.subscribe = (token, topic) => {
  return admin.messaging().subscribeToTopic([token], topic);
};

this.unsubscribe = (token, topic) => {
  return admin.messaging().unsubscribeFromTopic([token], topic)
};


module.exports = this;