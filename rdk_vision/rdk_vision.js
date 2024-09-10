module.exports = function(RED) {
    "use strict";
    var settings = RED.settings;
    var os = require('os');
    var fs = require('fs');
    var execSync = require("child_process").execSync;
    var spawn = require('child_process').spawn;

    const visionChecker = __dirname + '/lib/sh/visionchecker';
    const yolov3CommandSudo = __dirname + '/lib/sh/nryolov3sudo';
    const yolov5CommandSudo = __dirname + '/lib/sh/nryolov5sudo';
    const unetCommandSudo = __dirname + '/lib/sh/nrunetsudo';
    const fcosCommandSudo = __dirname + '/lib/sh/nrfcossudo';

    RED.log.info('Loading rdk-vision nodes...')

    function getChildPids(pid, pids){
        try{
            var childPidBuffer = execSync('pgrep -P ' + pid);
            var childPid = childPidBuffer.toString().replace(/\r?\n/g, '');
            pids.push(childPid);
            getChildPids(childPid, pids);
        }
        catch(e){
            return;
        }
        return;
    }

    function generateVisionNode(command){
        return function RDKVisionBasicNode(config) {
            // Create this node
            RED.nodes.createNode(this,config);
    
            this.name =  config.name;
            var node = this;
    
            try{
                execSync(visionChecker)
            }
            catch(e){
                RED.log.warn(RED._("rdk-vision.errors.badEnv"));
                node.status({fill:"red",shape:"ring",text:"rdk-vision.errors.badEnv"});
                readyForAll = false;
            }
    
            process.env.PYTHONUNBUFFERED = 1;
    
            node.child = spawn(command);
            node.running = true;
            node.child.stdout.on('data', function(data){
                var dataStr = data.toString().trim();
                var dataObj = {};
                dataStr = dataStr.replace(/\r?\n/g, '');
                if(dataStr.indexOf('notavailable') >= 0){
                    node.status({fill:"yellow",shape:"ring",text:"rdk-vision.errors.badOutput"});
                }
                else if(dataStr.indexOf('"file":') >= 0){
                    dataStr = dataStr.substr(dataStr.indexOf('{"file":'));
                    dataObj = JSON.parse(dataStr);
                    node.send([
                        {
                            payload: dataObj.file
                        },
                        {
                            payload: dataObj.list
                        }
                    ]);
                }
                else{
                    //skip
                }
                
            })
            node.status({fill:"green",shape:"dot",text:"rdk-vision.status.working"});
    
            node.on('input', function(msg){
                if(node.child && node.running){
                    if(fs.existsSync(msg.payload)){
                        node.child.stdin.write(msg.payload + '\n');
                    }
                    else{
                        node.status({fill:"yellow",shape:"ring",text:"rdk-vision.errors.badInput"});
                    }
                }
            })
    
            node.on('close', function(done){
                node.status({});
                
                if(node.child){
                    node.finished = done;
                    node.child.stdin.write('close\n');
                    var pids = [node.child.pid.toString()];
                    getChildPids(node.child.pid, pids);
                    execSync('sudo kill -9 ' + pids.join(' '));
                    node.child = null;
                    if(done) done();
                }
                else{
                    if(done) done();
                }
            })
        }
    }
    
    function RDKVisionStreamNode(config){
        RED.nodes.createNode(this,config);
    
        this.name =  config.name;
        var node = this;

        try{
            execSync(visionChecker)
        }
        catch(e){
            RED.log.warn(RED._("rdk-vision.errors.badEnv"));
            node.status({fill:"red",shape:"ring",text:"rdk-vision.errors.badEnv"});
            readyForAll = false;
        }

        process.env.PYTHONUNBUFFERED = 1;
    
        node.child = spawn(fcosCommandSudo);
        node.running = true;

        node.child.stdout.on('data', function(data){
            var dataStr = data.toString();
            dataStr = dataStr.replace(/\r?\n/g, '');
            
            if(dataStr.indexOf('[') >= 0){
                //skip
            }
            else if(fs.existsSync(dataStr)){
                node.send({
                    payload: dataStr
                });
            }
        })

        node.on('input', function(msg){
            if(node.child && node.running){
                node.child.stdin.write(msg.payload + '\n');
            }
        })

        node.on('close', function(done){
            node.status({});
            
            if(node.child){
                node.finished = done;
                node.child.stdin.write('close\n');
                var pids = [node.child.pid.toString()];
                getChildPids(node.child.pid, pids);
                execSync('sudo kill -9 ' + pids.join(' '));
                node.child = null;
                if(done) done();
            }
            else{
                if(done) done();
            }
        })
    }

    RED.nodes.registerType('rdk-vision yolov3', generateVisionNode(yolov3CommandSudo));
    RED.nodes.registerType('rdk-vision yolov5', generateVisionNode(yolov5CommandSudo));
    RED.nodes.registerType('rdk-vision unet', generateVisionNode(unetCommandSudo));

    RED.nodes.registerType('rdk-vision fcos', RDKVisionStreamNode);

}