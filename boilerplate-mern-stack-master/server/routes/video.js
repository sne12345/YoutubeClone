const express = require('express');
const router = express.Router();
const { Video } = require("../models/Video");

const multer = require("multer");
var ffmpeg = require('fluent-ffmpeg');
const { Subscriber } = require('../models/Subscriber');

// STORAGE MULTER CONFIG
let storage = multer.diskStorage ({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        if(ext !== '.mp4'|| ext !== '.png'){
            return cb(res.status(400).end('only png, mp4 is allowed'), false);
        }
        cb(null, true)
    }
})

const upload = multer({ storage: storage}).single("file");

//=================================
//             Video
//=================================


router.post('/uploadfiles', (req, res) => {

    // 비디오를 서버에 저장
    upload(req, res, err => {
        if(err) {
            return res.json({ success: false, err })
        }
        return res.json({ success: true, url: res.req.file.path, fileName: res.req.file.fileName })
    })
})

router.post('/getVideoDetail', (req, res) => {

    // 비디오를 서버에 저장
    Video.findOne({ "_id" : req.body.videoId })
        .populate('writer')
        .exec((err, videoDetail) => {
            if(err) return res.status(400).send(err)
            res.status(200).json({ success: true, videoDetail })
        })
})


router.post('/uploadVideo', (req, res) => {

    // mongoDB에 비디오를 정보들을 저장
    const video = new Video(req.body)

    video.save((err, doc) => {
        if(err) return res.json({ success: false, err })
        res.status(200).json({ success: true })
    })
    
})

router.post('/getSubscriptionVideos', (req, res) => {

    // 자신의 아이디를 가지고 구독하는 사람들을 찾는다.
    Subscriber.find({ userFrom: req.body.userFrom })
        .exec(( err, subscriberInfo ) => {
            if(err) return res.status(400).send(err)

            let subscribedUser = [];
            subscriberInfo.map((subscriber, i) => {
                subscribedUser.push(subscriber.userTo)
            })

            // 찾은 사람들의 비디오를 가지고 온다.
            Video.find({ writer : { $in : subscribedUser } })
                .populate('writer')
                .exec((err, videos) => {
                    if(err) return res.status(400).send(err)
                    return res.status(200).json({ success: true, videos })
                })
        })
    
})



router.get('/getvideos', (req, res) => {

    // 비디오를 db에서 가져와서 클라이언트에 보낸다.
    Video.find()   // 모든 비디오를 가져옴
        .populate('writer')
        .exec((err, videos) => {
            if(err) return res.status(400).send(err);
            res.status(200).json({ success: true, videos })
        })
    
})


router.post('/thumbnail', (req, res) => {

    let filePath = ""
    let fileDuration = ""

    // 비디오 정보 가져오기
    ffmpeg.ffprobe(req.body.url, function(err, metadata){
        console.dir(metadata);
        console.log(metadata.format.duration);
        fileDuration = metadata.format.duration
    })

    // 썸네일 생성
    ffmpeg(req.body.url)
    .on('filenames', function(filenames){
        console.log('Will generate ' + filenames.join(', '))
        console.log(filenames)
    
        filePath = "uploads/thumbnails/" + filenames[0]
    })
    .on('end', function() {             // 썸네일 다 생성하고 나서
        console.log('Screenshots taken');
        return res.json({ success: true, url: filePath, fileDuration: fileDuration})
    }) 
    .on('error', function(err) {
        console.log(err);
        return res.json({ success: false, err })
    })
    .screenshots({
        count: 3,
        folder: 'uploads/thumbnails',
        size: '320x240',
        filename: 'thumbnail-%b.png'
    })

})

module.exports = router;
