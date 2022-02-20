const cv = require('opencv4nodejs');
const mrz = require('./mrz-extract.js');
const ip = require('./image-preprocessor');
const tesseract = require('./node-tesseract');
const tmp = require('tmp-promise');
const parse = require('mrz').parse;

class MrzReader {
    setDebug(debug) {
        this.debug = debug;
        mrz.debug = debug;
        ip.debug = debug;
    }

    getMrz(path, options = {}) {
        return new Promise((resolve, reject) => {
            let { allRegions } = options;
            try {
                mrz.loadImage(path).then(async (mat) => {
                    let imgMrz = await mrz.extractMrz(mat, options);
                    return imgMrz;
                }).then(async (res) => {
                    if(!allRegions) {
                        let preprocessed = await ip.run(res);
                        return preprocessed;
                    }
                    let preprocessed = await ip.runForeach(res);
                    preprocessed = preprocessed.concat(res);
                    return preprocessed;
                }).then((imgs) => {
                    if(!allRegions){
                        this.checkMrzRegion(imgs).then(res => resolve(res)).catch(err => reject(err));
                        return;
                    }

                    this.checkAllRegions(imgs).then(response => {
                        resolve(response);
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(err => {
                    reject(err);
                });
            } catch(error) {
                reject(error);
            }
        });
    }

    logOutput(log) {
        if(!this.debug) return;
        console.log(log);
    }

    getRelevant(mrz) {
        return mrz.fields;
    }

    checkAllRegions(imgs) {
        return new Promise(async (resolve, reject) => {
            let index = 0;
            let possible_response;
            
            while(index < imgs.length) {
                try {
                    possible_response = await this.checkMrzRegion(imgs[index]);
                    console.log(possible_response);
                    if(possible_response.parsed.valid){
                        resolve(possible_response);
                        return;
                    }
                    else{
                        index++;
                    }
                }
                catch(error) {
                    index++;
                }
            }

            if(possible_response) {
                possible_response.parsed.fields.valid = possible_response.parsed.valid;
                resolve(possible_response);
            }
            else{
                reject("None found!");
            }
        });
    }

    checkMrzRegion(img) {
        return new Promise((resolve, reject) => {
            tmp.file({postfix: '.jpg'}).then(o => {
                // Save MRZ to temporary path
                cv.imwrite(o.path, img);

                tesseract.process(o.path, {l:'ocrb'}, (err, text) => {
                    // Delete Temporary Image
                    o.cleanup();
                    if(err) {
                        reject(err);
                    }
                    else{
                        let ocr_text = text.trim().split("\n")
                        ocr_text = ocr_text.map(val => val.replace(/\s/g,'').trim());
                        this.logOutput(ocr_text);
                        try {
                            let parsedMrz = parse(ocr_text);
                            this.logOutput(parsedMrz);
                            resolve({raw: ocr_text, parsed: parsedMrz});
                        }
                        catch(e) {
                            reject(e);
                        }
                    }
                });
            });
        });
    }
}

module.exports = new MrzReader();