const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const vosk = require('vosk-koffi');

const libName = 'libvosk.so';
const libPath = path.join(__dirname, '../../node_modules', 'vosk-koffi', 'bin-linux-arm64', libName);
const backupPath = path.join(__dirname, 'bin-linux-arm64', libName);
if(!fs.existsSync(libPath)){
    fs.copyFileSync(backupPath, libPath);
}

module.exports = function(RED) {
    var playaudionodeid;

    vosk.setLogLevel(0); // 可选，禁用日志
    const MODEL_PATH = path.join(__dirname, "./models/vosk-model-small-cn-0.22");
    const SAMPLE_RATE = 16000;
    const model = new vosk.Model(MODEL_PATH);
    const recognizer = new vosk.Recognizer({
        model: model,
        sampleRate: SAMPLE_RATE
    });

    function extractPCM(buffer) {
        // 简单处理：跳过 WAV 的前 44 字节（仅适用于 16bit PCM）
        return buffer.slice(44); // 返回 Buffer（Int16 PCM）
    }

    function convertSpeech(wavBuffer, node) {
        const pcmBuffer = extractPCM(wavBuffer);
        recognizer.acceptWaveform(pcmBuffer);
        const result = recognizer.finalResult();
        const resultStr = result.text.split(' ').join('');

        node.status({})

        node.send({
            payload: resultStr
        })
    }

    function RDKPlayAudioNode(config) {
        RED.nodes.createNode(this,config);
        this.voice = 0;
        var node = this;

        playaudionodeid = this.id;

        if (!fs.existsSync(MODEL_PATH)) {
            node.status({
                fill: "red",
                shape: "dot",
                text: "Model was not found!"
            })
        }

        this.on('close', () => {
            node.status({});
        })
        this.on('input', function(msg) {
            if (typeof msg.payload === "string" && msg.payload.indexOf('blob') >= 0) {
                RED.comms.publish("speechtotext", msg.payload);
                node.status({fill:"blue",shape:"dot",text:"rdk-speechtotext.status.converting"});
            }
            else{
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "rdk-speechtotext.status.invalidInput"
                })
            }
        });

        RED.httpAdmin.post('/speechtotext/wav/upload', 
            bodyParser.raw({
                 // type: '*/*'
                 type: 'audio/wav'
            }), 
            RED.auth.needsPermission('write'),
            function(req, res){
                const wavBuffer = req.body;
                convertSpeech(wavBuffer, node);
                res.json({
                    status: 'ok',
                    receviced: true
                })
        })

    }

    RED.nodes.registerType("rdk-tools speechtotext", RDKPlayAudioNode);

}