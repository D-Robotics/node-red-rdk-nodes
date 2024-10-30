module.exports = function(RED) {
    var openurlid;

    function RDKVideoWSNode(config) {
        RED.nodes.createNode(this,config);

        this.frameCount = parseInt(config.fps);
        let count = 0;

        var node = this;
        openurlid = this.id;

        this.on('input', function(msg) {
            if(msg.topic && msg.topic === 'videows-info'){
                if(count%this.frameCount === 0){
                    count = 0;
                    node.send([msg.payload?.result ?? null, msg.payload.performance, null])
                }
                count++;
            }
            else if(typeof msg.payload === "string") {
                if(msg.payload.indexOf('://') < 0){
                    node.status({fill:"yellow",shape:"ring",text:"rdk-videows.errors.invalidUrl"})
                }
                else{
                    node.status({fill:"green",shape:"ring",text:"rdk-videows.hints.validUrl"})
                    RED.comms.publish("videows-url", {
                        id: this.id,
                        link: msg.payload
                    });
                    setTimeout(function(){
                        node.status({});
                    }, 5000);
                }
            }
        });
    }

    RED.nodes.registerType("rdk-tools videows", RDKVideoWSNode);

    RED.httpAdmin.get('/videows/js/*', function(req, res){
        var options = {
            root: __dirname + '/static/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/videows/protos/*', function(req, res){
        var options = {
            root: __dirname + '/static/protos/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.post("/videows/:id", RED.auth.needsPermission("videows.write"), function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.receive(req.body);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error(RED._("rdk-videows.errors.postError",{error:err.toString()}));
            }
        } else {
            res.sendStatus(404);
        }
    });
}