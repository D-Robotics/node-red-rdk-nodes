module.exports = function(RED) {
    var openurlid;

    function RDKOpenUrlNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        openurlid = this.id;

        this.on('input', function(msg) {
            if (typeof msg.payload === "string") {
                
                node.status({fill:"green",shape:"ring",text:msg.payload})
                RED.comms.publish("moverobot", msg.payload);
                // setTimeout(function(){
                //     node.status({});
                // }, 5000);
                
            }
        });
    }

    RED.nodes.registerType("rdk-3d 3drobot", RDKOpenUrlNode);

    RED.httpAdmin.get('/3drobot/js/*', function(req, res){
        var options = {
            root: __dirname + '/static/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });
}