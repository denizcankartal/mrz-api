const cv = require('opencv4nodejs');

class ImagePreprocessor {
    constructor(debug = false) {
        this.debug = debug;
    }

    showImage(mat) {
        if(!this.debug) return;

        cv.imshow('Image', mat);
        cv.waitKey();
    }

    runForeach(imgs) {
        return imgs.map(img => {
            return this.run(img);
        });
    }

    run(img) {
        let gray = img;
        gray = gray.adaptiveThreshold(255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 9, 14);

        let kernel = new cv.Mat(1, 1, cv.CV_8UC1, 1);
        let opening = gray.morphologyEx(kernel, cv.MORPH_OPEN);
        let closing = opening.morphologyEx(kernel, cv.MORPH_CLOSE);

        let or_image = gray.bitwiseOr(closing);

        this.showImage(or_image);

        return or_image;
    }
}

module.exports = new ImagePreprocessor();