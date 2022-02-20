const cv = require('opencv4nodejs');

class MrzExtractor {
    constructor(debug = false) {
        this.debug = debug;
    }

    loadImage(path) {
        return new Promise((resolve, reject) => {
            cv.imreadAsync(path, (err, mat) => {
                if(err){
                    reject(err);
                }
                else{
                    resolve(mat);
                }
            });
        });
    }

    saveImage(path, mat) {
        return new Promise((resolve, reject) => {
            cv.imwrite(path, mat, (err) => {
                if(err){
                    reject(err);
                }
                else{
                    resolve();
                }
            });
        });
    }

    showImage(mat) {
        if(!this.debug) return;

        cv.imshow('Image', mat);
        cv.waitKey();
    }

    extractMrz(img, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                img = this.resizeImage(img);

                const { allRegions } = options;

                if(!allRegions) {
                    img = this.getMrz(img, options);
                    resolve(img);
                    return;
                }

                let angle = this.getAngle(img);
                let rot1 = this.rotateAndSkew(img, angle);
                let rot2 = this.rotateAndSkew(img, angle + 90);
                let rot3 = this.rotateAndSkew(img, angle - 90);

                Promise.all([
                    this.getMrz(img, options),
                    this.getMrz(rot1, options),
                    this.getMrz(rot2, options),
                    this.getMrz(rot3, options)
                ]).then(responses => {
                    let responseArray = [];
                    responses.forEach(res => {
                        responseArray = responseArray.concat(res);
                    })
                    resolve(responseArray);
                }).catch(error => {
                    reject(error);
                })
            } catch(error) {
                reject(error);
            }
        });
    }

    houghAngle(p1,p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    }

    getMrz(img, options) {
        let rectKernel = new cv.Mat(30, 30, cv.MORPH_RECT, 1);
        let sqKernel = new cv.Mat(21, 21, cv.MORPH_RECT, 1);
        let defaultKernel = new cv.Mat(3, 3, cv.CV_8U, 1);

        this.showImage(img);

        //img = img.getRegion(new cv.Rect(0, 300, img.cols, 300));

        let gray = img.cvtColor(cv.COLOR_BGR2GRAY);

        gray = gray.gaussianBlur(new cv.Size(3, 3), 0);

        let blackhat = gray.morphologyEx(rectKernel, cv.MORPH_BLACKHAT);

        this.showImage(blackhat);

        let gradX = blackhat.sobel(cv.CV_32F, 1, 0, -1);
        gradX = gradX.abs();

        let min = this.getMin(gradX);
        let max = this.getMax(gradX);

        gradX = this.mapImage(gradX, min, max, 0, 255);
        
        gradX = gradX.morphologyEx(rectKernel, cv.MORPH_CLOSE);

        let thresh = gradX.threshold(0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

        thresh = thresh.morphologyEx(sqKernel, cv.MORPH_CLOSE);
        thresh = thresh.erode(defaultKernel, new cv.Point(-1, -1), 4);

        this.showImage(thresh);

        let contours = thresh.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let { allRegions } = options;
        
        if(contours.length <= 0) {
            if(!allRegions) {
                throw "No potential MRZ regions found";
            }
            return [];
        }

        if(!allRegions) {
            let box = this.furthestDown(img, contours);

            if(!box) {
                throw "No potential MRZ Region found";
            }

            let rect = this.prepareRect(gray, box.boundingRect());

            let mrz = gray.getRegion(rect);

            this.showImage(mrz);

            return mrz;
        }

        let regions = [];

        contours.forEach(cnt => {
            let rect = this.prepareRect(gray, cnt.boundingRect());
            rect = this.clampRect(rect, new cv.Rect(0, 0, gray.cols, gray.rows));
            let cutout = gray.getRegion(rect);
            this.showImage(cutout);
            regions.push(cutout);
            
            //img.drawRectangle(rect, new cv.Vec(255, 0, 0));
        });

        this.showImage(img);

        if(regions.length <= 0) {
            throw "No potential MRZ Region found";
        }

        return regions;
    }

    prepareRect(img, rect) {
        rect = rect.pad(1.01);
            
        rect = this.padRect(rect, 20);

        return this.clampRect(rect, new cv.Rect(0, 0, img.cols, img.rows));
    }

    getMin(img) {
        let data = img.getDataAsArray();

        let width = img.cols;
        let height = img.rows;

        let min = data[0][0];

        for(var x = 0; x < width; x++) {
            for(var y = 0; y < height; y++) {
                if(data[y][x] < min) {
                    min = data[y][x];
                }
            }
        }

        return min;
    }

    getMax(img) {
        let data = img.getDataAsArray();

        let width = img.cols;
        let height = img.rows;

        let max = data[0][0];

        for(var x = 0; x < width; x++) {
            for(var y = 0; y < height; y++) {
                if(data[y][x] > max) {
                    max = data[y][x];
                }
            }
        }

        return max;
    }

    mapImage(img, in_min, in_max, out_min, out_max) {
        let width = img.cols;
        let height = img.rows;
        let data = img.getDataAsArray();

        img = new cv.Mat(data, cv.CV_8UC1);

        for(var x = 0; x < width; x++) {
            for(var y = 0; y < height; y++) {
                img.set(y, x, Math.round(this.map(data[y][x], in_min, in_max, out_min, out_max)));
            }
        }

        return img;
    }

    map(x, in_min, in_max, out_min, out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }

    furthestDown(img, contours) {
        let max = -Infinity;
        let index = -1;

        contours.forEach((cnt, i) => {
            let rect = cnt.boundingRect();

            let ar = rect.width / rect.height;
            let crWidth = rect.width / img.cols;

            if(ar > 5.0 && crWidth > 0.75 && rect.y + rect.height > max) {
                max = rect.y + rect.height;
                index = i;
            }
        });

        if(index != -1) {
            return contours[index];
        }

        return null;
    }

    padRect(rect, pad) {
        return new cv.Rect(
            rect.x - pad * 0.5,
            rect.y - pad * 0.5,
            rect.width + pad,
            rect.height + pad
        );
    }

    clampRect(rect, clampRect) {
        return new cv.Rect(
            Math.max(0, Math.min(clampRect.width, rect.x)),
            Math.max(0, Math.min(clampRect.height, rect.y)),
            Math.min(rect.width, clampRect.width - rect.x),
            Math.min(rect.height, clampRect.height - rect.y)
        );
    }

    resizeImage(img) {
        let aspectRatio = img.cols / img.rows;
        let size = new cv.Size(600 * aspectRatio, 600);
        return img.resize(size, 0, 0, cv.INTER_AREA);
    }

    rotateAndSkew(img, angle) {
        let center = new cv.Point(img.cols / 2.0, img.rows / 2.0);

        let M = cv.getRotationMatrix2D(center, angle, 1.0);

        img = img.warpAffine(M, new cv.Size(img.cols, img.rows), cv.INTER_CUBIC, cv.BORDER_REPLICATE);
        //img.drawEllipse(largestRect, new cv.Vec(255, 0, 0));

        this.showImage(img);

        return img;
    }

    getAngle(img, isGray = false) {
        let rectKernel = new cv.Mat(30, 30, cv.MORPH_RECT, 1);
        let sqKernel = new cv.Mat(21, 21, cv.MORPH_RECT, 1);
        let defaultKernel = new cv.Mat(3, 3, cv.CV_8U, 1);

        let gray = img;
        if(!isGray) {
            gray = img.cvtColor(cv.COLOR_BGR2GRAY);
        }

        this.showImage(gray);

        let blackhat = gray.morphologyEx(rectKernel, cv.MORPH_BLACKHAT);

        this.showImage(blackhat);

        let gradX = blackhat.sobel(cv.CV_32F, 1, 0, -1);
        gradX = gradX.abs();


        let min = this.getMin(gradX);
        let max = this.getMax(gradX);

        gradX = this.mapImage(gradX, min, max, 0, 255);
        
        gradX = gradX.morphologyEx(rectKernel, cv.MORPH_CLOSE);

        this.showImage(gradX);

        let thresh = gradX.threshold(0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU)

        this.showImage(thresh);

        let contours = thresh.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if(contours.length <= 0) {
            return img;
        }

        let rects = contours.map(cnt => cnt.minAreaRect());

        let largestRect = this.getLargestRect(rects);

        return largestRect.angle;
    }

    calcSize(rect) {
        return Math.sqrt(Math.pow(rect.size.width, 2.0) + Math.pow(rect.size.height, 2.0));
    }

    getLargestRect(rects) {
        let size = this.calcSize(rects[0]);
        let index = 0;

        rects.forEach((rect, i) => {
            if(this.calcSize(rect) > size){
                size = this.calcSize(rect);
                index = i;
            }
        });

        return rects[index];
    }
}

module.exports = new MrzExtractor();