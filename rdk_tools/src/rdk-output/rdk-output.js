module.exports = function(RED) {
    var outputid;

    function RDKOutputNode(config) {
        RED.nodes.createNode(this,config);
        this.voice = 0;
        var node = this;

        outputid = this.id;

        this.on('input', function(msg) {
            if (typeof msg.payload === "string") {
                RED.comms.publish("rdkoutput", {
                    id: this.id,
                    payload: msg.payload
                });
            }
        });

    }

    RED.nodes.registerType("rdk-tools output", RDKOutputNode);

}