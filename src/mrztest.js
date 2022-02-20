const mrz = require('./libs/read-mrz');

mrz.setDebug(false);
mrz.getMrz('./src/assets/images/perso3.jpg', {allRegions: true}).then(response => {
    console.log(response);
}).catch(error => {
    console.log(error);
});