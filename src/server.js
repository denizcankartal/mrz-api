const express = require('express')
const formData = require("express-form-data");
const app = express()
const cors = require('cors')
const os = require("os");
const mrz = require('./libs/read-mrz')
var bodyParser = require('body-parser')

const options = {
    uploadDir: os.tmpdir(),
    autoClean: true
};

app.use(cors());

// parse data with connect-multiparty. 
app.use(formData.parse(options));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream 
app.use(formData.stream());
// union the body and the files
app.use(formData.union());

var jsonParser = bodyParser.json();

app.get('/', function (req, res) {
  res.send('This worked!');
})

app.post('/mrz', (req, res, next) => {
    mrz.setDebug(false);
    mrz.getMrz(req.body.file.path, {allRegions: true}).then(response => {
        if(req.body.verbose) {
            res.send(response);
        }
        else{
            res.send(mrz.getRelevant(response.parsed));
        }
    }).catch(error => {
        console.log(error);
        res.status(500).send({
            error: 'Your request could not be processed.'
        });
    });
});
 
app.listen(3000)