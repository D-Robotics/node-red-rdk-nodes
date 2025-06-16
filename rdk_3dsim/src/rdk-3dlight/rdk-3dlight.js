module.exports = function(RED) {
    var openurlid;

    function RDKOpenUrlNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        openurlid = this.id;

        this.on('input', function(msg) {
            if (typeof msg.payload === "string") {
                
                node.status({fill:"green",shape:"ring",text:msg.payload})
                RED.comms.publish("switchlight", msg.payload);
            }
        });
    }

    RED.nodes.registerType("rdk-3d 3dlight", RDKOpenUrlNode);

}